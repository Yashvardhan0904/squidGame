/**
 * Admin Reinstate User API
 * Reinstate an eliminated user
 * 
 * POST /api/admin/reinstate
 * Body: { userId: number, reason: string }
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { reinstateUser } from '@/lib/services/admin.service';

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
    
    const { userId, reason } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }
    
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Reason must be at least 10 characters' 
      }, { status: 400 });
    }
    
    const result = await reinstateUser(admin.id, parseInt(userId), reason.trim());
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[Admin] Reinstate failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
