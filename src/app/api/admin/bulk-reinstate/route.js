/**
 * POST /api/admin/bulk-reinstate
 * Bulk reinstate multiple eliminated users
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { bulkReinstateUsers } from '@/lib/services/bulkReinstate.service';

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
    const { userIds, reason } = body;

    // Validate inputs
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }

    // Call bulk reinstatement service
    const result = await bulkReinstateUsers(adminUser.id, userIds, reason);

    return NextResponse.json({
      success: true,
      message: `Successfully reinstated ${result.count} user(s)`,
      data: result
    });

  } catch (error) {
    console.error('[API] Bulk reinstate error:', error);

    // Handle specific error cases
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (error.message.includes('not found') || error.message.includes('not eliminated')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to bulk reinstate users', details: error.message },
      { status: 500 }
    );
  }
}
