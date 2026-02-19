/**
 * Email Processing Cron Job
 * Processes pending emails from the queue
 * 
 * Call this from external cron: POST /api/cron/emails
 * Recommended: Every 1-5 minutes
 * Authorization: Bearer CRON_SECRET
 */

import { NextResponse } from 'next/server';
import { processPendingEmails } from '@/lib/services/email.service';

function verifyCronAuth(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    return true;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  return authHeader.substring(7) === cronSecret;
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await processPendingEmails();
    
    return NextResponse.json({
      success: true,
      ...result,
      duration: `${Date.now() - startTime}ms`
    });
    
  } catch (error) {
    console.error('[Cron] Email processing failed:', error);
    return NextResponse.json({
      error: error.message,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/cron/emails',
    method: 'POST'
  });
}
