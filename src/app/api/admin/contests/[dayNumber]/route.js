/**
 * Admin Contest Day API
 * Get, update, or delete a specific contest day
 * 
 * GET /api/admin/contests/[dayNumber] - Get contest day
 * PUT /api/admin/contests/[dayNumber] - Update contest day
 * DELETE /api/admin/contests/[dayNumber] - Delete contest day
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { getContestDay, updateContestDay, deleteContestDay } from '@/lib/services/contest.service';

/**
 * GET - Retrieve a contest day by day number
 */
export async function GET(request, { params }) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dayNumber } = await params;
    const day = parseInt(dayNumber, 10);
    
    if (isNaN(day)) {
      return NextResponse.json({
        error: 'Invalid day number'
      }, { status: 400 });
    }
    
    // Get contest day
    const contest = await getContestDay(day);
    
    if (!contest) {
      return NextResponse.json({
        error: `Contest day ${day} not found`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      contest
    });
    
  } catch (error) {
    console.error('[Admin] Get contest failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

/**
 * PUT - Update a contest day
 */
export async function PUT(request, { params }) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dayNumber } = await params;
    const day = parseInt(dayNumber, 10);
    
    if (isNaN(day)) {
      return NextResponse.json({
        error: 'Invalid day number'
      }, { status: 400 });
    }
    
    // Parse request body
    const body = await request.json();
    const { contest_slug, contest_url, problem_name, start_time, end_time } = body;
    
    // Build update data
    const updateData = {};
    if (contest_slug !== undefined) updateData.contest_slug = contest_slug;
    if (contest_url !== undefined) updateData.contest_url = contest_url;
    if (problem_name !== undefined) updateData.problem_name = problem_name;
    if (start_time !== undefined) updateData.start_time = start_time ? new Date(start_time) : null;
    if (end_time !== undefined) updateData.end_time = end_time ? new Date(end_time) : null;
    
    // Update contest day
    const contest = await updateContestDay(day, updateData);
    
    return NextResponse.json({
      success: true,
      contest
    });
    
  } catch (error) {
    console.error('[Admin] Update contest failed:', error);
    
    // Return validation errors with 400 status
    if (error.message.includes('not found')) {
      return NextResponse.json({
        error: error.message
      }, { status: 404 });
    }
    
    if (error.message.includes('cannot be empty') || 
        error.message.includes('must be between')) {
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

/**
 * DELETE - Delete a contest day
 */
export async function DELETE(request, { params }) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dayNumber } = await params;
    const day = parseInt(dayNumber, 10);
    
    if (isNaN(day)) {
      return NextResponse.json({
        error: 'Invalid day number'
      }, { status: 400 });
    }
    
    // Delete contest day
    const contest = await deleteContestDay(day);
    
    return NextResponse.json({
      success: true,
      message: `Contest day ${day} deleted successfully`,
      contest
    });
    
  } catch (error) {
    console.error('[Admin] Delete contest failed:', error);
    
    // Return validation errors with appropriate status
    if (error.message.includes('not found')) {
      return NextResponse.json({
        error: error.message
      }, { status: 404 });
    }
    
    if (error.message.includes('has been processed')) {
      return NextResponse.json({
        error: error.message
      }, { status: 409 }); // Conflict
    }
    
    if (error.message.includes('must be between')) {
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
