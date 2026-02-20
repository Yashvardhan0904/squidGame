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
    const { day_number, contest_slug, contest_url, problem_name, start_time, end_time } = body;
    
    // Create contest day
    const contest = await createContestDay({
      day_number,
      contest_slug,
      contest_url,
      problem_name,
      start_time: start_time ? new Date(start_time) : undefined,
      end_time: end_time ? new Date(end_time) : undefined
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
