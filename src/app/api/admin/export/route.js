/**
 * Leaderboard CSV Export API
 * Export full leaderboard as CSV with all daily scores and strikes
 * 
 * GET /api/admin/export
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { exportLeaderboardCSV } from '@/lib/services/leaderboard.service';

async function getAdminUser(request) {
  const cookieStore = await cookies();
  // Check both possible cookie names
  const tokenCookie = cookieStore.get('auth_token') || cookieStore.get('token');
  
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
    
    const csv = await exportLeaderboardCSV();
    const date = new Date().toISOString().split('T')[0];
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="squidgame-leaderboard-${date}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[Admin] Export failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
