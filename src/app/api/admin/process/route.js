/**
 * Admin Process Day API
 * Manually trigger strike processing for a specific day
 * 
 * POST /api/admin/process
 * Body: { dayNumber: number }
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { manualProcessDay } from '@/lib/services/admin.service';

async function getAdminUser(request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');
  
  if (!tokenCookie?.value) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    if (decoded.role !== 'ADMIN') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dayNumber } = await request.json();
    
    if (!dayNumber || dayNumber < 1 || dayNumber > 25) {
      return NextResponse.json({ 
        error: 'Invalid day number (must be 1-25)' 
      }, { status: 400 });
    }
    
    const result = await manualProcessDay(admin.id, dayNumber);
    
    return NextResponse.json({
      success: true,
      dayNumber,
      result
    });
    
  } catch (error) {
    console.error('[Admin] Process failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
