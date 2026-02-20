/**
 * Nightly Processing Cron Job
 * Triggers HackerRank scraping + strike processing at midnight (12:00 AM IST)
 * 
 * Call this from external cron: POST /api/cron/nightly
 * Authorization: Bearer CRON_SECRET
 * 
 * Schedule: 0 0 * * * (Every day at midnight IST)
 */

import { NextResponse } from 'next/server';
import { triggerScraping } from '@/lib/services/scraper.trigger';
import { triggerStrikeProcessing } from '@/lib/services/strike.trigger';
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

// Calculate current day number
function getCurrentDayNumber() {
  const competitionStart = new Date(process.env.COMPETITION_START || '2026-02-16T00:00:00+05:30');
  const now = new Date();
  const daysDiff = Math.floor((now - competitionStart) / (1000 * 60 * 60 * 24));
  return daysDiff + 1;
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Auth check
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get previous day (since this runs at midnight, we process yesterday's contest)
    const previousDay = getCurrentDayNumber() - 1;
    
    if (previousDay < 1) {
      return NextResponse.json({
        error: 'Competition has not started yet'
      }, { status: 400 });
    }
    
    if (previousDay > 25) {
      return NextResponse.json({
        error: 'Competition has ended'
      }, { status: 400 });
    }
    
    console.log(`[Cron] Nightly processing for day ${previousDay}`);
    
    // Get contest for previous day
    const contest = await prisma.contest.findUnique({
      where: { day_number: previousDay }
    });
    
    if (!contest) {
      return NextResponse.json({
        error: `No contest found for day ${previousDay}`
      }, { status: 404 });
    }
    
    // Step 1: Scrape leaderboard
    let scrapeResult;
    try {
      scrapeResult = await triggerScraping(previousDay);
    } catch (scrapeError) {
      console.error('[Cron] Scrape failed:', scrapeError);
      scrapeResult = { 
        success: false, 
        error: scrapeError.message,
        message: 'Auto-scrape failed. Please upload CSV manually from admin panel.'
      };
    }
    
    // Step 2: Process strikes (only if scrape succeeded)
    let strikeResult = { skipped: true, reason: 'scrape_failed' };
    if (scrapeResult.success) {
      try {
        strikeResult = await triggerStrikeProcessing(previousDay);
      } catch (strikeError) {
        console.error('[Cron] Strike processing failed:', strikeError);
        strikeResult = { 
          success: false, 
          error: strikeError.message 
        };
      }
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: scrapeResult.success && strikeResult.success,
      dayNumber: previousDay,
      duration: `${duration}ms`,
      scrape: scrapeResult,
      strikes: strikeResult,
      timestamp: new Date().toISOString()
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
    previousDay: currentDay - 1,
    contest: contest ? {
      scraped: contest.is_scraped,
      processed: contest.is_processed
    } : null,
    nextRun: 'Midnight IST (00:00)'
  });
}
