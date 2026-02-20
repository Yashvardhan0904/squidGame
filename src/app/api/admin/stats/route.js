/**
 * Admin Stats API
 * Get competition statistics and overview
 * 
 * GET /api/admin/stats
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { getContestStats, getRecentAuditLogs, getEliminatedUsers } from '@/lib/services/admin.service';

export async function GET(request) {
  try {
    // Verify admin authentication
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    
    // Fetch comprehensive dashboard data
    const [stats, recentLogs, eliminatedUsers] = await Promise.all([
      getContestStats(),
      getRecentAuditLogs(10),
      getEliminatedUsers(50)
    ]);
    
    return NextResponse.json({
      success: true,
      stats,
      recentAuditLogs: recentLogs,
      eliminatedUsers
    });
    
  } catch (error) {
    console.error('[API] Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  }
}
