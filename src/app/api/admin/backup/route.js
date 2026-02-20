/**
 * POST /api/admin/backup
 * Manually trigger backup generation for a specific day
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { generateDailyBackup } from '@/lib/services/backup.service';

export async function POST(request) {
  try {
    // Verify admin authentication
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { dayNumber } = body;

    // Validate day number
    if (!dayNumber || typeof dayNumber !== 'number' || dayNumber < 1 || dayNumber > 25) {
      return NextResponse.json(
        { error: 'dayNumber must be between 1 and 25' },
        { status: 400 }
      );
    }

    // Generate backup
    const result = await generateDailyBackup(dayNumber);

    return NextResponse.json({
      success: true,
      message: `Backup generated successfully for day ${dayNumber}`,
      data: result
    });

  } catch (error) {
    console.error('[API] Manual backup error:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup', details: error.message },
      { status: 500 }
    );
  }
}
