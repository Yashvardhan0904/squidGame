/**
 * Admin Start Contest API
 * Start a specific day contest so it becomes the active arena link.
 *
 * POST /api/admin/contests/[dayNumber]/start
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { getContestDay, updateContestDay } from '@/lib/services/contest.service';

export async function POST(request, { params }) {
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

    const contest = await getContestDay(day);
    if (!contest) {
      return NextResponse.json({ error: `Contest day ${day} not found` }, { status: 404 });
    }

    if (!contest.contest_url || !contest.problem_name) {
      return NextResponse.json({
        error: 'Please set contest URL and problem name before starting this contest'
      }, { status: 400 });
    }

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const updated = await updateContestDay(day, {
      start_time: now,
      end_time: contest.end_time || endOfDay
    });

    return NextResponse.json({
      success: true,
      message: `Contest for Day ${day} started`,
      contest: updated
    });
  } catch (error) {
    console.error('[Admin] Start contest failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
