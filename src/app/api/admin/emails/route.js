/**
 * Admin Email Queue API
 * Get email queue with filtering
 * 
 * GET /api/admin/emails?status=pending&template_type=strike_1&user_id=123&page=1&limit=50
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { getEmailQueue } from '@/lib/services/emailQueue.service';

export async function GET(request) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status'),
      template_type: searchParams.get('template_type'),
      user_id: searchParams.get('user_id'),
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50
    };
    
    // Get email queue
    const result = await getEmailQueue(filters);
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[Admin] Get email queue failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
