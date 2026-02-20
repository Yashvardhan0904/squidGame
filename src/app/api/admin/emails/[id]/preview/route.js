/**
 * Admin Email Preview API
 * Preview an email without sending
 * 
 * GET /api/admin/emails/[id]/preview
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { previewEmail } from '@/lib/services/emailQueue.service';

export async function GET(request, { params }) {
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
    
    // Preview email
    const html = await previewEmail(emailId);
    
    // Return HTML response
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
    
  } catch (error) {
    console.error('[Admin] Preview email failed:', error);
    
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
