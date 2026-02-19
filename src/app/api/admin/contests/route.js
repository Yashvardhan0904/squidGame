/**
 * Contest Management API
 * CRUD for daily contests
 * 
 * GET /api/admin/contests - List all contests
 * POST /api/admin/contests - Create/update contest
 * PUT /api/admin/contests - Bulk update contests
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

async function getAdminUser() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');
  
  if (!tokenCookie?.value) return null;
  
  try {
    const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    if (decoded.role !== 'ADMIN') return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET all contests
export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const contests = await prisma.contest.findMany({
      orderBy: { day_number: 'asc' },
      include: {
        _count: {
          select: {
            scraped_results: true,
            daily_scores: true,
            strike_logs: true
          }
        }
      }
    });
    
    return NextResponse.json({ contests });
    
  } catch (error) {
    console.error('[Admin] Get contests failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create/update single contest
export async function POST(request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      day_number,
      hackerrank_url,
      problem_name,
      start_time,
      end_time
    } = body;
    
    if (!day_number || day_number < 1 || day_number > 25) {
      return NextResponse.json({ error: 'Invalid day number' }, { status: 400 });
    }
    
    if (!hackerrank_url) {
      return NextResponse.json({ error: 'HackerRank URL is required' }, { status: 400 });
    }
    
    const contest = await prisma.contest.upsert({
      where: { day_number },
      update: {
        hackerrank_url,
        problem_name: problem_name || null,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null
      },
      create: {
        day_number,
        hackerrank_url,
        problem_name: problem_name || null,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null
      }
    });
    
    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        admin_user_id: admin.id,
        action: 'UPSERT_CONTEST',
        target_type: 'Contest',
        target_id: contest.id.toString(),
        new_value: JSON.stringify(contest)
      }
    });
    
    return NextResponse.json({ success: true, contest });
    
  } catch (error) {
    console.error('[Admin] Create contest failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT bulk update (setup all 25 days at once)
export async function PUT(request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { contests } = await request.json();
    
    if (!Array.isArray(contests)) {
      return NextResponse.json({ error: 'contests must be an array' }, { status: 400 });
    }
    
    const results = [];
    
    for (const c of contests) {
      if (c.day_number < 1 || c.day_number > 25) continue;
      
      const contest = await prisma.contest.upsert({
        where: { day_number: c.day_number },
        update: {
          hackerrank_url: c.hackerrank_url,
          problem_name: c.problem_name || null,
          start_time: c.start_time ? new Date(c.start_time) : null,
          end_time: c.end_time ? new Date(c.end_time) : null
        },
        create: {
          day_number: c.day_number,
          hackerrank_url: c.hackerrank_url,
          problem_name: c.problem_name || null,
          start_time: c.start_time ? new Date(c.start_time) : null,
          end_time: c.end_time ? new Date(c.end_time) : null
        }
      });
      results.push(contest);
    }
    
    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        admin_user_id: admin.id,
        action: 'BULK_UPSERT_CONTESTS',
        target_type: 'Contest',
        target_id: 'bulk',
        new_value: JSON.stringify({ count: results.length })
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      updated: results.length,
      contests: results
    });
    
  } catch (error) {
    console.error('[Admin] Bulk update contests failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
