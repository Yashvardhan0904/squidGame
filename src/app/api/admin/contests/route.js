/**
 * Admin Contests List API
 * Get all contest days
 * 
 * GET /api/admin/contests
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { listContestDays } from '@/lib/services/contest.service';

export async function GET(request) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all contests
    const contests = await listContestDays();
    
    return NextResponse.json({
      success: true,
      contests,
      count: contests.length
    });
    
  } catch (error) {
    console.error('[Admin] List contests failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
