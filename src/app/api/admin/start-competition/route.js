/**
 * Start Competition API
 * Set the competition start date to today at 9 AM IST
 * 
 * POST /api/admin/start-competition
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import fs from 'fs';
import path from 'path';

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
    
    // Calculate start date (today at 9 AM IST)
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    istDate.setHours(9, 0, 0, 0);
    
    // Format as ISO string with IST timezone
    const startDate = istDate.toISOString().replace('Z', '+05:30');
    
    // Update .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace or add COMPETITION_START
    if (envContent.includes('COMPETITION_START=')) {
      envContent = envContent.replace(
        /COMPETITION_START=.*/,
        `COMPETITION_START="${startDate}"`
      );
    } else {
      envContent += `\nCOMPETITION_START="${startDate}"\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    // Update environment variable in current process
    process.env.COMPETITION_START = startDate;
    
    return NextResponse.json({
      success: true,
      startDate,
      message: 'Competition started successfully. Server restart recommended for changes to take effect.'
    });
    
  } catch (error) {
    console.error('[API] Start competition error:', error);
    return NextResponse.json(
      { error: 'Failed to start competition', details: error.message },
      { status: 500 }
    );
  }
}
