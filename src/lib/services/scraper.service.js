/**
 * HackerRank Leaderboard Scraper Service
 * Scrapes contest leaderboards and stores results in database
 */

import prisma from '../prisma';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

// Competition start date
const COMPETITION_START = new Date('2026-02-16T00:00:00+05:30');

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

    const url = `https://www.hackerrank.com/rest/contests/${contestSlug}/leaderboard`;
    console.log(`[Scraper] Fetching: ${url}`);

    const results = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`${url}?offset=${offset}&limit=${limit}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.models || data.models.length === 0) {
        hasMore = false;
        break;
      }

      for (const entry of data.models) {
        results.push({
          hackerrank_id: entry.hacker,
          score: entry.score || 0,
          rank: entry.rank || null,
          submission_time: entry.time_taken ? new Date() : null
        });
      }

      offset += limit;

      // Safety limit
      if (offset > 10000) break;
    }

    console.log(`[Scraper] Found ${results.length} participants for day ${dayNumber}`);

    // Store results in database
    await storeScrapedResults(contest.id, dayNumber, results, batchId);

    // Update contest scrape status
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        is_scraped: true,
        scraped_at: new Date(),
        scrape_attempts: { increment: 1 },
        last_scrape_error: null
      }
    });

    return { success: true, count: results.length, batchId };

  } catch (error) {
    console.error(`[Scraper] Error:`, error);

    // Update error status
    await prisma.contest.updateMany({
      where: { day_number: dayNumber },
      data: {
        scrape_attempts: { increment: 1 },
        last_scrape_error: error.message
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

  await storeScrapedResults(contest.id, dayNumber, results, batchId);

  await prisma.contest.update({
    where: { id: contest.id },
    data: {
      is_scraped: true,
      scraped_at: new Date(),
      scrape_attempts: { increment: 1 }
    }
  });

  return { success: true, count: results.length, batchId };
}

const scraperService = {
  getCurrentDayNumber,
  scrapeLeaderboard,
  scrapeLeaderboardHTML,
  getSolversForDay
};

export default scraperService;
