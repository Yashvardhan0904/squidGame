/**
 * HackerRank Leaderboard Scraper Service
 * Scrapes contest leaderboards and stores results in database
 */

import prisma from '../prisma';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

// Competition start date
const COMPETITION_START = new Date('2026-02-16T00:00:00+05:30');
const HACKERRANK_BASE_URL = 'https://www.hackerrank.com';
const LEADERBOARD_BATCH_LIMIT = 100;
const MAX_PAGINATION_ROWS = 50000;
const MAX_REQUEST_RETRIES = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  return error.message || String(error);
}

function normalizeContestSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const cleaned = slug.trim().replace(/^\/+|\/+$/g, '');
  return cleaned || null;
}

function extractSlugFromContestUrl(contestUrl) {
  if (!contestUrl || typeof contestUrl !== 'string') return null;

  const matched = contestUrl.match(/\/contests\/([^/?#]+)/i);
  if (!matched) return null;

  return normalizeContestSlug(matched[1]);
}

function normalizeContestUrlFromSlug(slug) {
  return `${HACKERRANK_BASE_URL}/contests/${slug}`;
}

function collectContestModels(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.models)) return payload.models;
  if (Array.isArray(payload.contests)) return payload.contests;
  if (payload.data) {
    if (Array.isArray(payload.data.models)) return payload.data.models;
    if (Array.isArray(payload.data.contests)) return payload.data.contests;
    if (Array.isArray(payload.data)) return payload.data;
  }

  return [];
}

function scoreContestCandidate(dayNumber, candidate, hintProblemName) {
  const name = String(candidate.name || candidate.title || candidate.slug || '').toLowerCase();
  const desc = String(candidate.description || '').toLowerCase();
  const hint = String(hintProblemName || '').trim().toLowerCase();
  let score = 0;

  if (name.includes(`day ${dayNumber}`) || name.includes(`day-${dayNumber}`)) score += 5;
  if (new RegExp(`\\b${dayNumber}\\b`).test(name)) score += 2;
  if (new RegExp(`\\b${dayNumber}\\b`).test(desc)) score += 1;
  if (hint && (name.includes(hint) || desc.includes(hint))) score += 6;
  if (candidate.ended === false || candidate.active === true) score += 1;

  return score;
}

async function fetchContestListing(pathname) {
  const response = await fetch(`${HACKERRANK_BASE_URL}${pathname}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed listing fetch (${pathname}): HTTP ${response.status}`);
  }

  const data = await response.json();
  return collectContestModels(data);
}

async function discoverContestSlugFromSite(dayNumber, hintProblemName) {
  const listingPaths = [
    '/rest/contests?offset=0&limit=100',
    '/rest/contests/active?offset=0&limit=100',
    '/rest/contests/upcoming?offset=0&limit=100',
    '/rest/contests/college?offset=0&limit=100'
  ];

  const candidates = [];

  for (const path of listingPaths) {
    try {
      const models = await fetchContestListing(path);

      for (const model of models) {
        const slug = normalizeContestSlug(model.slug || model.contest_slug || model.permalink);
        if (!slug) continue;

        candidates.push({
          slug,
          name: model.name || model.title || slug,
          description: model.description || '',
          active: model.active,
          ended: model.ended,
        });
      }
    } catch (error) {
      console.warn(`[Scraper] Contest listing lookup failed for ${path}: ${getErrorMessage(error)}`);
    }
  }

  if (!candidates.length) return null;

  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreContestCandidate(dayNumber, candidate, hintProblemName)
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score <= 0) return null;

  return {
    slug: scored[0].slug,
    url: normalizeContestUrlFromSlug(scored[0].slug)
  };
}

async function resolveContestTarget(contest, incomingSlug, dayNumber) {
  const incomingNormalized = normalizeContestSlug(incomingSlug);
  if (incomingNormalized) {
    return {
      slug: incomingNormalized,
      url: normalizeContestUrlFromSlug(incomingNormalized),
      source: 'request'
    };
  }

  const savedSlug = normalizeContestSlug(contest?.contest_slug);
  if (savedSlug) {
    return {
      slug: savedSlug,
      url: normalizeContestUrlFromSlug(savedSlug),
      source: 'database_slug'
    };
  }

  const slugFromUrl = extractSlugFromContestUrl(contest?.contest_url);
  if (slugFromUrl) {
    return {
      slug: slugFromUrl,
      url: normalizeContestUrlFromSlug(slugFromUrl),
      source: 'database_url'
    };
  }

  const discovered = await discoverContestSlugFromSite(dayNumber, contest?.problem_name);
  if (discovered) {
    return {
      ...discovered,
      source: 'auto_discovered'
    };
  }

  return null;
}

export function normalizeScrapedResults(rawResults) {
  const byUser = new Map();

  for (const row of rawResults) {
    const id = String(row.hackerrank_id || '').trim();
    if (!id) continue;

    const key = id.toLowerCase();
    const existing = byUser.get(key);

    if (!existing) {
      byUser.set(key, {
        ...row,
        hackerrank_id: id
      });
      continue;
    }

    const existingRank = Number.isFinite(existing.rank) ? existing.rank : Number.MAX_SAFE_INTEGER;
    const currentRank = Number.isFinite(row.rank) ? row.rank : Number.MAX_SAFE_INTEGER;
    const existingScore = Number(existing.score || 0);
    const currentScore = Number(row.score || 0);

    const currentIsBetter =
      currentRank < existingRank ||
      (currentRank === existingRank && currentScore > existingScore);

    if (currentIsBetter) {
      byUser.set(key, {
        ...row,
        hackerrank_id: id
      });
    }
  }

  return [...byUser.values()].sort((a, b) => {
    const rankA = Number.isFinite(a.rank) ? a.rank : Number.MAX_SAFE_INTEGER;
    const rankB = Number.isFinite(b.rank) ? b.rank : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;

    const scoreA = Number(a.score || 0);
    const scoreB = Number(b.score || 0);
    if (scoreA !== scoreB) return scoreB - scoreA;

    return String(a.hackerrank_id).localeCompare(String(b.hackerrank_id));
  });
}

async function fetchLeaderboardBatch(url, offset, limit) {
  let attempt = 0;

  while (attempt < MAX_REQUEST_RETRIES) {
    attempt += 1;

    const response = await fetch(`${url}?offset=${offset}&limit=${limit}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      return response.json();
    }

    const shouldRetry = response.status === 429 || response.status >= 500;
    if (!shouldRetry || attempt >= MAX_REQUEST_RETRIES) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const backoffMs = Math.min(6000, 1000 * attempt * attempt);
    console.warn(`[Scraper] Retrying offset ${offset} after HTTP ${response.status} (${attempt}/${MAX_REQUEST_RETRIES})`);
    await sleep(backoffMs);
  }

  throw new Error('Leaderboard batch retries exhausted');
}

/**
 * Get current day number (1-25)
 */
export function getCurrentDayNumber() {
  const now = new Date();
  const diffMs = now - COMPETITION_START;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(25, diffDays + 1));
}

/**
 * Scrape HackerRank leaderboard using Cheerio (HTML parsing)
 * Note: If HackerRank blocks this, switch to Puppeteer
 */
export async function scrapeLeaderboard(contestSlug, dayNumber) {
  const batchId = uuidv4();

  try {
    // Get contest
    const contest = await prisma.contest.findUnique({
      where: { day_number: dayNumber }
    });

    if (!contest) {
      throw new Error(`Contest for day ${dayNumber} not found`);
    }

    const target = await resolveContestTarget(contest, contestSlug, dayNumber);
    if (!target) {
      throw new Error(`Unable to resolve contest slug for day ${dayNumber}. Configure contest_slug or contest_url, or ensure contest is discoverable on HackerRank.`);
    }

    const url = `${HACKERRANK_BASE_URL}/rest/contests/${target.slug}/leaderboard`;
    console.log(`[Scraper] Fetching: ${url}`);
    console.log(`[Scraper] Contest resolution source: ${target.source}`);

    const results = [];
    let offset = 0;
    const limit = LEADERBOARD_BATCH_LIMIT;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      const data = await fetchLeaderboardBatch(url, offset, limit);
      const pageRows = Array.isArray(data?.models) ? data.models : [];

      if (!pageRows.length) {
        hasMore = false;
        break;
      }

      for (const entry of pageRows) {
        const hackerrankId = String(entry.hacker || entry.username || '').trim();
        if (!hackerrankId) continue;

        const parsedScore = Number(entry.score);
        const score = Number.isFinite(parsedScore) && parsedScore >= 0 ? parsedScore : 0;

        const parsedRank = Number(entry.rank);
        const rank = Number.isFinite(parsedRank) && parsedRank > 0
          ? Math.floor(parsedRank)
          : null;

        results.push({
          hackerrank_id: hackerrankId,
          score,
          rank,
          submission_time: entry.time_taken ? new Date() : null
        });
      }

      offset += pageRows.length;
      pageCount += 1;

      if (pageRows.length < limit) {
        hasMore = false;
      }

      // Safety limit
      if (offset > MAX_PAGINATION_ROWS) {
        console.warn(`[Scraper] Pagination safety cap reached at offset ${offset} for day ${dayNumber}`);
        hasMore = false;
      }

      // Rate limiting: 1 second delay between requests to avoid blocking
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const normalizedResults = normalizeScrapedResults(results);

    console.log(`[Scraper] Found ${normalizedResults.length} participants for day ${dayNumber} across ${pageCount} page(s)`);

    // Store results in database
    await storeScrapedResults(contest.id, dayNumber, normalizedResults, batchId);

    // Update contest scrape status
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        contest_slug: target.slug,
        contest_url: target.url,
        is_scraped: true,
        scraped_at: new Date(),
        scrape_attempts: { increment: 1 },
        last_scrape_error: null
      }
    });

    return {
      success: true,
      count: normalizedResults.length,
      batchId,
      contestSlug: target.slug,
      contestUrl: target.url,
      resolvedFrom: target.source
    };

  } catch (error) {
    console.error(`[Scraper] Error:`, error);
    const message = getErrorMessage(error);

    // Update error status
    await prisma.contest.updateMany({
      where: { day_number: dayNumber },
      data: {
        scrape_attempts: { increment: 1 },
        last_scrape_error: message
      }
    });

    throw error;
  }
}

/**
 * Store scraped results in database (upsert to handle duplicates)
 */
async function storeScrapedResults(contestId, dayNumber, results, batchId) {
  // Use transaction for atomic insert
  await prisma.$transaction(async (tx) => {
    for (const result of results) {
      await tx.scrapedResult.upsert({
        where: {
          unique_scraped_day_user: {
            day_number: dayNumber,
            hackerrank_id: result.hackerrank_id
          }
        },
        update: {
          score: result.score,
          rank: result.rank,
          scraped_at: new Date(),
          scrape_batch_id: batchId
        },
        create: {
          contest_id: contestId,
          day_number: dayNumber,
          hackerrank_id: result.hackerrank_id,
          score: result.score,
          rank: result.rank,
          scrape_batch_id: batchId
        }
      });
    }
  });
}

/**
 * Get all solvers for a day (hackerrank_ids who scored > 0)
 */
export async function getSolversForDay(dayNumber) {
  const results = await prisma.scrapedResult.findMany({
    where: {
      day_number: dayNumber,
      score: { gt: 0 }
    },
    select: {
      hackerrank_id: true,
      score: true
    }
  });

  // Return Set for O(1) lookup (lowercase for case-insensitive matching)
  const solversMap = new Map();
  for (const r of results) {
    solversMap.set(r.hackerrank_id.toLowerCase(), r.score);
  }
  return solversMap;
}

/**
 * Alternative scraper using HTML parsing (fallback)
 */
export async function scrapeLeaderboardHTML(contestSlug, dayNumber) {
  const batchId = uuidv4();

  const contest = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });

  if (!contest) {
    throw new Error(`Contest for day ${dayNumber} not found`);
  }

  const url = `https://www.hackerrank.com/contests/${contestSlug}/leaderboard`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const results = [];

  // Parse leaderboard table rows
  $('table.striped tbody tr').each((_, row) => {
    const rank = $(row).find('td:nth-child(1)').text().trim();
    const username = $(row).find('td:nth-child(2) a').text().trim();
    const score = $(row).find('td:nth-child(3)').text().trim();

    if (username && parseFloat(score) > 0) {
      results.push({
        hackerrank_id: username,
        score: parseFloat(score),
        rank: parseInt(rank) || null
      });
    }
  });

  const normalizedResults = normalizeScrapedResults(results);

  await storeScrapedResults(contest.id, dayNumber, normalizedResults, batchId);

  await prisma.contest.update({
    where: { id: contest.id },
    data: {
      is_scraped: true,
      scraped_at: new Date(),
      scrape_attempts: { increment: 1 }
    }
  });

  return { success: true, count: normalizedResults.length, batchId };
}

const scraperService = {
  getCurrentDayNumber,
  scrapeLeaderboard,
  scrapeLeaderboardHTML,
  getSolversForDay
};

export default scraperService;
