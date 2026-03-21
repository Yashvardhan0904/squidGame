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
    const now = new Date();

    // Prefer contests explicitly started by admin (start_time is set).
    const activeContest = await prisma.contest.findFirst({
      where: {
        start_time: { not: null, lte: now },
        OR: [{ end_time: null }, { end_time: { gte: now } }]
      },
      orderBy: [{ day_number: 'desc' }],
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

    const upcomingContest = await prisma.contest.findFirst({
      where: {
        start_time: { not: null, gt: now }
      },
      orderBy: [{ start_time: 'asc' }],
      select: {
        id: true,
        day_number: true,
        contest_slug: true,
        contest_url: true,
        problem_name: true,
        start_time: true,
        end_time: true,
        is_scraped: true,
        is_processed: true
      }
    });

    const contest = activeContest || upcomingContest;
    
    if (!contest) {
      return NextResponse.json({
        error: 'No active contest',
        message: 'Admin has not started a contest yet'
      }, { status: 200 });
    }

    const startTime = contest.start_time ? new Date(contest.start_time) : now;
    const endTime = contest.end_time ? new Date(contest.end_time) : new Date(startTime);
    if (!contest.end_time) {
      endTime.setHours(23, 59, 59, 999);
    }
    
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
