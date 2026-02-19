import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getLeaderboard, getUserProgress, getCompetitionOverview } from '@/lib/services/leaderboard.service';

// GET /api/db/leaderboard - Optimized leaderboard query
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || null;
    const includeEliminated = searchParams.get('includeEliminated') === 'true';
    const userId = searchParams.get('userId');

    // If requesting specific user progress
    if (userId) {
      const progress = await getUserProgress(parseInt(userId));
      if (!progress) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: progress });
    }

    // Get leaderboard with new service
    const result = await getLeaderboard({
      page,
      limit,
      search,
      includeEliminated
    });

    // Get stats
    const [totalActive, totalEliminated, highRiskCount, overview] = await Promise.all([
      prisma.user.count({ where: { is_eliminated: false, status: 'active' } }),
      prisma.user.count({ where: { is_eliminated: true } }),
      prisma.user.count({ where: { is_eliminated: false, consecutive_miss: 2 } }),
      getCompetitionOverview()
    ]);

    // Transform for backward compatibility
    const leaderboard = result.leaderboard.map(p => ({
      rank: p.rank,
      id: p.id,
      name: p.name,
      hackerrank_id: p.hackerrank_id,
      totalScore: p.total_score,
      strike_count: p.strike_count,
      consecutive_miss: p.consecutive_miss,
      days_solved: p.days_solved,
      status: p.status,
      eliminated: p.is_eliminated,
    }));

    return NextResponse.json({
      leaderboard,
      stats: {
        active: totalActive,
        eliminated: totalEliminated,
        highRisk: highRiskCount,
        survivalRate: overview.survivalRate,
        daysProcessed: overview.daysProcessed
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('GET /api/db/leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
