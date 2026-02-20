/**
 * Admin Reprocess Day API
 * Reprocess a contest day (idempotent operation)
 * 
 * POST /api/admin/reprocess
 * Body: { dayNumber: number }
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { reprocessDay } from '@/lib/services/reprocess.service';

export async function POST(request) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { dayNumber } = await request.json();
    
    if (!dayNumber) {
      return NextResponse.json({
        error: 'Day number is required'
      }, { status: 400 });
    }
    
    // Reprocess day
    const result = await reprocessDay(dayNumber, admin.id);
    
    return NextResponse.json({
      success: true,
      message: `Successfully reprocessed day ${dayNumber}`,
      ...result
    });
    
  } catch (error) {
    console.error('[Admin] Reprocess failed:', error);
    
    // Return validation errors with 400 status
    if (error.message.includes('must be between') ||
        error.message.includes('not found') ||
        error.message.includes('not been scraped')) {
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
