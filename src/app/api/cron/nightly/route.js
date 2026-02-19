/**
 * Nightly Processing Cron Job
 * Triggers HackerRank scraping + strike processing
 * 
 * Call this from external cron: POST /api/cron/nightly
 * Authorization: Bearer CRON_SECRET
 */

import { NextResponse } from 'next/server';
import { scrapeLeaderboard, getCurrentDayNumber } from '@/lib/services/scraper.service';
import { processStrikes, initCronLocks } from '@/lib/services/strike.processor';
import prisma from '@/lib/prisma';

// Verify cron secret
function verifyCronAuth(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not set, allowing request');
    return true;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === cronSecret;
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Auth check
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize cron locks if not exists
    await initCronLocks();
    
    // Parse request body (optional overrides)
    let dayNumber;
    try {
      const body = await request.json();
      dayNumber = body.dayNumber || getCurrentDayNumber();
    } catch {
      dayNumber = getCurrentDayNumber();
    }
    
    console.log(`[Cron] Nightly processing for day ${dayNumber}`);
    
    // Get contest for this day
    const contest = await prisma.contest.findUnique({
      where: { day_number: dayNumber }
    });
    
    if (!contest) {
      return NextResponse.json({
        error: `No contest found for day ${dayNumber}`
      }, { status: 404 });
    }
    
    // Step 1: Scrape leaderboard (if not already scraped)
    let scrapeResult = { skipped: true, reason: 'already_scraped' };
    if (!contest.is_scraped) {
      try {
        scrapeResult = await scrapeLeaderboard(contest.hackerrank_url, dayNumber);
      } catch (scrapeError) {
        console.error('[Cron] Scrape failed:', scrapeError);
        scrapeResult = { error: scrapeError.message };
      }
    }
    
    // Step 2: Process strikes
    let strikeResult = { skipped: true, reason: 'scrape_pending' };
    const updatedContest = await prisma.contest.findUnique({
      where: { day_number: dayNumber }
    });
    
    if (updatedContest?.is_scraped) {
      strikeResult = await processStrikes(dayNumber);
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      dayNumber,
      duration: `${duration}ms`,
      scrape: scrapeResult,
      strikes: strikeResult
    });
    
  } catch (error) {
    console.error('[Cron] Nightly processing failed:', error);
    return NextResponse.json({
      error: error.message,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}

// Also allow GET for simple health check
export async function GET() {
  const currentDay = getCurrentDayNumber();
  
  const contest = await prisma.contest.findUnique({
    where: { day_number: currentDay }
  });
  
  return NextResponse.json({
    status: 'ready',
    currentDay,
    contest: contest ? {
      scraped: contest.is_scraped,
      processed: contest.is_processed
    } : null
  });
}
