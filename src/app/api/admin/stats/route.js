/**
 * Admin Stats API
 * Get competition statistics and overview
 * 
 * GET /api/admin/stats
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getContestStats, getAuditLogs, getEliminatedUsers } from '@/lib/services/admin.service';
import { getCompetitionOverview } from '@/lib/services/leaderboard.service';

async function getAdminUser(request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');
  
  if (!tokenCookie?.value) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    if (decoded.role !== 'ADMIN') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [contestStats, overview, recentAudit, eliminatedUsers] = await Promise.all([
      getContestStats(),
      getCompetitionOverview(),
      getAuditLogs({ limit: 10 }),
      getEliminatedUsers()
    ]);
    
    return NextResponse.json({
      success: true,
      stats: contestStats,
      overview,
      recentAudit: recentAudit.logs,
      eliminatedUsers: eliminatedUsers.slice(0, 50) // Limit for performance
    });
    
  } catch (error) {
    console.error('[Admin] Stats failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
