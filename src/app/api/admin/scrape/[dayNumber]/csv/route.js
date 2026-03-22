/**
 * Admin Scraped Results CSV Export API
 * Download scraped leaderboard rows for a specific day.
 *
 * GET /api/admin/scrape/[dayNumber]/csv
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { exportScrapedResultsForDay } from '@/lib/services/export.service';

export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dayNumber } = await params;
    const day = parseInt(dayNumber, 10);

    if (Number.isNaN(day) || day < 1 || day > 25) {
      return NextResponse.json({ error: 'Invalid day number' }, { status: 400 });
    }

    const csv = await exportScrapedResultsForDay(day);
    const date = new Date().toISOString().split('T')[0];

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="scraped-day-${day}-${date}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[Admin] Scraped CSV export failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
