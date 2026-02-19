import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// Simple in-memory cache for players list
const playersCache = {
  data: new Map(),
  expiry: new Map(),
  TTL: 10 * 1000, // 10 seconds cache
};

function getCacheKey(search, view) {
  return `${view}-${search || 'all'}`;
}

// GET /api/db/players - Get all players with daily scores (cached)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const view = searchParams.get('view') || 'all'; // all | active | eliminated | leaderboard | high-risk
    const limit = parseInt(searchParams.get('limit')) || 100; // Add limit support
    
    // Check cache for non-search requests
    const cacheKey = getCacheKey(search, view);
    if (!search && playersCache.data.has(cacheKey) && Date.now() < playersCache.expiry.get(cacheKey)) {
      return NextResponse.json(playersCache.data.get(cacheKey));
    }

    let where = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { hackerrank_id: { contains: search, mode: 'insensitive' } },
        { enroll_no: { contains: search, mode: 'insensitive' } },
      ];
    }

    // View filter
    if (view === 'active' || view === 'leaderboard') {
      where.is_eliminated = false;
    } else if (view === 'eliminated') {
      where.is_eliminated = true;
    } else if (view === 'high-risk') {
      where.is_eliminated = false;
      where.strike_count = 2;
    }

    // Sorting: active by total_score desc, eliminated last
    const orderBy = view === 'leaderboard'
      ? [{ total_score: 'desc' }]
      : [{ is_eliminated: 'asc' }, { strike_count: 'asc' }, { total_score: 'desc' }];

    const players = await prisma.user.findMany({
      where,
      orderBy,
      take: limit, // Limit results
      include: {
        daily_scores: {
          orderBy: { day_number: 'asc' },
        },
      },
    });

    // Transform to match frontend expected format
    const transformed = players.map(p => ({
      id: p.id,
      name: p.name,
      hackerrank_id: p.hackerrank_id,
      enroll_no: p.enroll_no || '',
      email: p.email || '',
      batch: p.batch || '',
      year: p.year || '',
      experience: p.experience || '',
      totalScore: p.total_score,
      eliminated: p.is_eliminated,
      strike_count: p.strike_count,
      previous_scores: p.daily_scores.map(ds => ds.score),
      daily_scores: p.daily_scores,
      last_updated: p.updated_at,
    }));

    // Cache non-search results
    if (!search) {
      playersCache.data.set(cacheKey, transformed);
      playersCache.expiry.set(cacheKey, Date.now() + playersCache.TTL);
    }

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('GET /api/db/players error:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
