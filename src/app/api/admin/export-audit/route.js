/**
 * Audit Logs CSV Export API
 * Export audit logs with optional filtering
 * 
 * GET /api/admin/export-audit
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { exportAuditLogs } from '@/lib/services/export.service';

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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId') ? parseInt(searchParams.get('adminId'), 10) : undefined;
    const action = searchParams.get('action') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    // Generate CSV
    const csv = await exportAuditLogs({
      adminId,
      action,
      startDate,
      endDate
    });
    
    const date = new Date().toISOString().split('T')[0];
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${date}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[API] Export audit logs failed:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs', details: error.message },
      { status: 500 }
    );
  }
}
