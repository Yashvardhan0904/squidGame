/**
 * Admin Email Management API
 * Preview or delete a specific email
 * 
 * GET /api/admin/emails/[id]/preview - Preview email
 * DELETE /api/admin/emails/[id] - Delete email
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { previewEmail, deleteEmail } from '@/lib/services/emailQueue.service';

/**
 * DELETE - Delete an email from the queue
 */
export async function DELETE(request, { params }) {
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
    
    // Delete email
    await deleteEmail(emailId);
    
    return NextResponse.json({
      success: true,
      message: `Email ${emailId} deleted successfully`
    });
    
  } catch (error) {
    console.error('[Admin] Delete email failed:', error);
    
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
