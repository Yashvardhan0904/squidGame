/**
 * Current Contest API
 * Get current day's contest information and timing
 * 
 * GET /api/contest/current
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get competition start date from env
    const competitionStart = new Date(process.env.COMPETITION_START || '2026-02-16T00:00:00+05:30');
    const now = new Date();
    
    // Calculate current day number (1-25)
    const daysDiff = Math.floor((now - competitionStart) / (1000 * 60 * 60 * 24));
    const currentDay = daysDiff + 1;
    
    // Check if competition has started or ended
    if (currentDay < 1) {
      return NextResponse.json({
        error: 'Competition has not started yet',
        startsOn: competitionStart.toISOString()
      }, { status: 404 });
    }
    
    if (currentDay > 25) {
      return NextResponse.json({
        error: 'Competition has ended'
      }, { status: 404 });
    }
    
    // Get today's contest
    const contest = await prisma.contest.findUnique({
      where: { day_number: currentDay },
      select: {
        id: true,
        day_number: true,
        contest_slug: true,
        contest_url: true,
        problem_name: true,
        is_scraped: true,
        is_processed: true
      }
    });
    
    if (!contest) {
      return NextResponse.json({
        error: 'No contest found for today',
        dayNumber: currentDay
      }, { status: 404 });
    }
    
    // Calculate today's contest timing (9 AM - 11:59 PM IST)
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const startTime = new Date(today);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(today);
    endTime.setHours(23, 59, 59, 999);
    
    // Determine status
    let status = 'upcoming';
    if (now >= startTime && now <= endTime) {
      status = 'live';
    } else if (now > endTime) {
      status = 'ended';
    }
    
    return NextResponse.json({
      dayNumber: contest.day_number,
      problemName: contest.problem_name,
      contestSlug: contest.contest_slug,
      contestUrl: contest.contest_url,
      status,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isScraped: contest.is_scraped,
      isProcessed: contest.is_processed
    });
    
  } catch (error) {
    console.error('[API] Current contest error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current contest', details: error.message },
      { status: 500 }
    );
  }
}
