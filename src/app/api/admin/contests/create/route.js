/**
 * Admin Create Contest Day API
 * Create a new contest day
 * 
 * POST /api/admin/contests/create
 * Body: { day_number, contest_slug, contest_url, problem_name, start_time?, end_time? }
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { createContestDay } from '@/lib/services/contest.service';

export async function POST(request) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const {
      day_number,
      contest_slug,
      contest_url,
      problem_name,
      dayNumber,
      contestSlug,
      contestUrl,
      problemName,
      start_time,
      end_time,
      startTime,
      endTime
    } = body;

    const normalizedDayNumber = day_number ?? dayNumber;
    const normalizedContestSlug = contest_slug ?? contestSlug;
    const normalizedContestUrl = contest_url ?? contestUrl;
    const normalizedProblemName = problem_name ?? problemName;
    const normalizedStartTime = start_time ?? startTime;
    const normalizedEndTime = end_time ?? endTime;
    
    // Create contest day
    const contest = await createContestDay({
      day_number: normalizedDayNumber,
      contest_slug: normalizedContestSlug,
      contest_url: normalizedContestUrl,
      problem_name: normalizedProblemName,
      start_time: normalizedStartTime ? new Date(normalizedStartTime) : undefined,
      end_time: normalizedEndTime ? new Date(normalizedEndTime) : undefined
    });
    
    return NextResponse.json({
      success: true,
      contest
    });
    
  } catch (error) {
    console.error('[Admin] Create contest failed:', error);
    
    // Return validation errors with 400 status
    if (error.message.includes('must be between') || 
        error.message.includes('is required') ||
        error.message.includes('already exists')) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 });
    }
    
    // Return server errors with 500 status
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
