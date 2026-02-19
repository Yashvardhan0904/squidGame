import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// Simple in-memory cache
let statsCache = null;
let statsCacheExpiry = 0;
const STATS_CACHE_TTL = 15 * 1000; // 15 seconds

// GET /api/db/stats - Dashboard statistics (cached)
export async function GET() {
  try {
    // Return cached stats if still valid
    if (statsCache && Date.now() < statsCacheExpiry) {
      return NextResponse.json(statsCache);
    }
    
    const [
      totalPlayers,
      activePlayers,
      eliminatedPlayers,
      highRiskPlayers,
      contestsCompleted,
      recentEliminations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_eliminated: false } }),
      prisma.user.count({ where: { is_eliminated: true } }),
      prisma.user.count({ where: { is_eliminated: false, strike_count: 2 } }),
      prisma.contest.count({ where: { is_processed: true } }),
      prisma.eliminationLog.findMany({
        take: 10,
        orderBy: { eliminated_at: 'desc' },
        include: { user: { select: { name: true, hackerrank_id: true } } },
      }),
    ]);

    const stats = {
      total: totalPlayers,
      active: activePlayers,
      eliminated: eliminatedPlayers,
      highRisk: highRiskPlayers,
      daysCompleted: contestsCompleted,
      daysRemaining: 25 - contestsCompleted,
      recentEliminations: recentEliminations.map(e => ({
        name: e.user.name,
        hackerrank_id: e.user.hackerrank_id,
        final_score: e.final_score,
        eliminated_at: e.eliminated_at,
        last_day_played: e.last_day_played,
      })),
    };
    
    // Cache the result
    statsCache = stats;
    statsCacheExpiry = Date.now() + STATS_CACHE_TTL;

    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/db/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
