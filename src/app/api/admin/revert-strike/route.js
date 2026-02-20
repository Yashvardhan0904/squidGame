/**
 * Admin Revert Strike API
 * Revert an incorrect strike
 * 
 * POST /api/admin/revert-strike
 * Body: { userId: number, dayNumber: number, reason: string }
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { revertStrike } from '@/lib/services/admin.service';

export async function POST(request) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { userId, dayNumber, reason } = await request.json();
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    if (!dayNumber) {
      return NextResponse.json({
        error: 'Day number is required'
      }, { status: 400 });
    }
    
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: 'Reason must be at least 10 characters'
      }, { status: 400 });
    }
    
    // Revert strike
    const result = await revertStrike(admin.id, parseInt(userId), parseInt(dayNumber), reason.trim());
    
    return NextResponse.json({
      success: true,
      message: `Strike reverted for user ${userId} on day ${dayNumber}`,
      ...result
    });
    
  } catch (error) {
    console.error('[Admin] Revert strike failed:', error);
    
    // Return validation errors with 400 status
    if (error.message.includes('not found') ||
        error.message.includes('Unauthorized')) {
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
