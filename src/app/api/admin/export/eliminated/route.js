/**
 * Eliminated Players CSV Export API
 * Export only eliminated players as CSV with all daily scores and strikes up to elimination
 * 
 * GET /api/admin/export/eliminated
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { exportEliminatedCSV } from '@/lib/services/leaderboard.service';

async function getAdminUser(request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('auth_token') || cookieStore.get('token');
  if (!tokenCookie?.value) return null;
  try {
    const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    if (decoded.role !== 'ADMIN') return null;
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
    const csv = await exportEliminatedCSV();
    const date = new Date().toISOString().split('T')[0];
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="squidgame-eliminated-${date}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[Admin] Eliminated Export failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
