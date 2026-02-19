/**
 * Scraper-only Cron Job
 * Just scrapes HackerRank, doesn't process strikes
 * Useful for scraping immediately after contest ends
 * 
 * Call this from external cron: POST /api/cron/scrape
 * Authorization: Bearer CRON_SECRET
 */

import { NextResponse } from 'next/server';
import { scrapeLeaderboard, getCurrentDayNumber } from '@/lib/services/scraper.service';
import prisma from '@/lib/prisma';

function verifyCronAuth(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) return true;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  return authHeader.substring(7) === cronSecret;
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get day number from body or use current
    let dayNumber;
    try {
      const body = await request.json();
      dayNumber = body.dayNumber || getCurrentDayNumber();
    } catch {
      dayNumber = getCurrentDayNumber();
    }
    
    const contest = await prisma.contest.findUnique({
      where: { day_number: dayNumber }
    });
    
    if (!contest) {
      return NextResponse.json({
        error: `No contest for day ${dayNumber}`
      }, { status: 404 });
    }
    
    if (contest.is_scraped) {
      return NextResponse.json({
        skipped: true,
        reason: 'already_scraped',
        dayNumber
      });
    }
    
    const result = await scrapeLeaderboard(contest.hackerrank_url, dayNumber);
    
    return NextResponse.json({
      success: true,
      dayNumber,
      ...result,
      duration: `${Date.now() - startTime}ms`
    });
    
  } catch (error) {
    console.error('[Cron] Scrape failed:', error);
    return NextResponse.json({
      error: error.message,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}
