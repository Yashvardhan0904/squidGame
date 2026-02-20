/**
 * All Users CSV Export API
 * Export all users with their complete data
 * 
 * GET /api/admin/export
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { exportAllUsers } from '@/lib/services/export.service';

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
    const csv = await exportAllUsers();
    const date = new Date().toISOString().split('T')[0];
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="all-users-${date}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[API] Export all users failed:', error);
    return NextResponse.json(
      { error: 'Failed to export users', details: error.message },
      { status: 500 }
    );
  }
}
