/**
 * Admin Email Retry API
 * Retry a failed email
 * 
 * POST /api/admin/emails/[id]/retry
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { retryEmail } from '@/lib/services/emailQueue.service';

export async function POST(request, { params }) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const emailId = parseInt(id, 10);
    
    if (isNaN(emailId)) {
      return NextResponse.json({
        error: 'Invalid email ID'
      }, { status: 400 });
    }
    
    // Retry email
    const email = await retryEmail(emailId);
    
    return NextResponse.json({
      success: true,
      message: `Email ${emailId} queued for retry`,
      email
    });
    
  } catch (error) {
    console.error('[Admin] Retry email failed:', error);
    
    if (error.message.includes('not found')) {
      return NextResponse.json({
        error: error.message
      }, { status: 404 });
    }
    
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
