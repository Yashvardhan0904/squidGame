/**
 * GET /api/arena/enter
 * Public endpoint - redirects users to current day's contest
 * No authentication required
 */

import { NextResponse } from 'next/server';
import { getCurrentDayNumber, getCurrentDayContestUrl, hasCompetitionEnded } from '@/lib/services/currentDay.service';

export async function GET(request) {
  try {
    // Check if competition has ended
    if (hasCompetitionEnded()) {
      return NextResponse.json({
        success: false,
        message: 'The competition has ended. Thank you for participating!',
        ended: true
      }, { status: 200 });
    }

    // Get current day number
    const dayNumber = getCurrentDayNumber();

    // Get contest URL for current day
    const contestUrl = await getCurrentDayContestUrl();

    if (!contestUrl) {
      return NextResponse.json({
        success: false,
        message: `Contest for Day ${dayNumber} is not available yet. Please check back later.`,
        dayNumber,
        contestAvailable: false
      }, { status: 404 });
    }

    // Return redirect URL
    return NextResponse.json({
      success: true,
      message: `Redirecting to Day ${dayNumber} contest`,
      dayNumber,
      contestUrl,
      redirect: true
    });

  } catch (error) {
    console.error('[API] Enter arena error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get contest information', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
