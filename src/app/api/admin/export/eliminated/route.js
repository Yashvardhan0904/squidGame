/**
 * Eliminated Users CSV Export API
 * Export eliminated users with elimination details
 * 
 * GET /api/admin/export/eliminated
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { exportEliminatedUsers } from '@/lib/services/export.service';

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
    
    // Generate CSV
    const csv = await exportEliminatedUsers();
    const date = new Date().toISOString().split('T')[0];
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="eliminated-users-${date}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[API] Export eliminated users failed:', error);
    return NextResponse.json(
      { error: 'Failed to export eliminated users', details: error.message },
      { status: 500 }
    );
  }
}
