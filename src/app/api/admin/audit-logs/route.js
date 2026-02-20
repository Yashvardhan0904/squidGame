/**
 * GET /api/admin/audit-logs
 * Get paginated audit logs with filtering and search
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { getAuditLogs } from '@/lib/services/admin.service';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const adminId = searchParams.get('adminId') ? parseInt(searchParams.get('adminId'), 10) : undefined;
    const action = searchParams.get('action') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const searchText = searchParams.get('search') || undefined;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Fetch audit logs
    const result = await getAuditLogs({
      page,
      limit,
      adminId,
      action,
      startDate,
      endDate,
      searchText
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[API] Audit logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: error.message },
      { status: 500 }
    );
  }
}
