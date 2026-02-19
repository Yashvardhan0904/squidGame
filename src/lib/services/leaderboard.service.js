/**
 * Leaderboard Service
 * Handles leaderboard queries and CSV export
 */

import prisma from '../prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE IN-MEMORY CACHE (prevents DB hammering from 100+ concurrent users)
// ═══════════════════════════════════════════════════════════════════════════════
const cache = {
  leaderboard: null,
  overview: null,
  leaderboardExpiry: 0,
  overviewExpiry: 0,
  LEADERBOARD_TTL: 10 * 1000,  // Cache leaderboard for 10 seconds
  OVERVIEW_TTL: 30 * 1000,     // Cache overview for 30 seconds
};

function getCacheKey(options) {
  return `${options.page}-${options.limit}-${options.includeEliminated}-${options.search || ''}`;
}

/**
 * Get live leaderboard with pagination
 */
export async function getLeaderboard(options = {}) {
  const {
    page = 1,
    limit = 50,
    includeEliminated = false,
    search = null
  } = options;

  // Check cache for default page (most common request)
  const cacheKey = getCacheKey({ page, limit, includeEliminated, search });
  if (!search && page === 1 && !includeEliminated && cache.leaderboard && Date.now() < cache.leaderboardExpiry) {
    return cache.leaderboard;
  }

  const where = {};

  if (!includeEliminated) {
    where.status = 'active';
    where.is_eliminated = false;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { hackerrank_id: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        hackerrank_id: true,
        total_score: true,
        strike_count: true,
        consecutive_miss: true,
        status: true,
        is_eliminated: true,
        eliminated_on: true,
        joined_day: true,
        _count: {
          select: {
            daily_scores: {
              where: { solved: true }
            }
          }
        }
      },
      orderBy: [
        { total_score: 'desc' },
        { strike_count: 'asc' },
        { name: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  // Add rank to each user
  const startRank = (page - 1) * limit + 1;
  const rankedUsers = users.map((user, index) => ({
    rank: startRank + index,
    ...user,
    days_solved: user._count.daily_scores
  }));

  const result = {
    leaderboard: rankedUsers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };

  // Cache default page result
  if (!search && page === 1 && !includeEliminated) {
    cache.leaderboard = result;
    cache.leaderboardExpiry = Date.now() + cache.LEADERBOARD_TTL;
  }

  return result;
}

/**
 * Get user's daily progress
 */
export async function getUserProgress(userId) {
  const [user, scores, strikes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        hackerrank_id: true,
        total_score: true,
        strike_count: true,
        consecutive_miss: true,
        status: true,
        is_eliminated: true,
        joined_day: true
      }
    }),
    prisma.dailyScore.findMany({
      where: { user_id: userId },
      orderBy: { day_number: 'asc' }
    }),
    prisma.strikeLog.findMany({
      where: { user_id: userId },
      orderBy: { day_number: 'asc' }
    })
  ]);

  if (!user) return null;

  // Build day-by-day progress
  const progress = [];
  for (let day = 1; day <= 25; day++) {
    const score = scores.find(s => s.day_number === day);
    const strike = strikes.find(s => s.day_number === day);

    progress.push({
      day,
      solved: score?.solved || false,
      score: score?.score || 0,
      strike: !!strike,
      strikeReverted: strike?.reverted || false
    });
  }

  return { ...user, progress };
}

/**
 * Export leaderboard to CSV format
 */
export async function exportLeaderboardCSV() {
  // Get max day number to know how many day columns we need
  const maxDayResult = await prisma.contest.findFirst({
    where: { is_processed: true },
    orderBy: { day_number: 'desc' },
    select: { day_number: true }
  });
  const maxDay = maxDayResult?.day_number || 0;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      enroll_no: true,
      hackerrank_id: true,
      batch: true,
      year: true,
      total_score: true,
      strike_count: true,
      consecutive_miss: true,
      status: true,
      is_eliminated: true,
      eliminated_on: true,
      joined_day: true,
      created_at: true,
      daily_scores: {
        orderBy: { day_number: 'asc' },
        select: {
          day_number: true,
          score: true,
          solved: true
        }
      },
      strike_logs: {
        orderBy: { day_number: 'asc' },
        select: {
          day_number: true,
          strike_number: true
        }
      }
    },
    orderBy: [
      { is_eliminated: 'asc' },
      { total_score: 'desc' },
      { strike_count: 'asc' }
    ]
  });

  // Build header with dynamic day columns
  const baseHeaders = [
    'Rank',
    'Name',
    'Enrollment No',
    'Email',
    'HackerRank ID',
    'Batch',
    'Year',
    'Total Score',
    'Strike Count',
    'Consecutive Misses',
    'Status',
    'Eliminated',
    'Eliminated On',
    'Joined Day',
    'Registered At'
  ];

  // Add day columns: Day1_Score, Day1_Solved, Day1_Strike, Day2_Score...
  const dayHeaders = [];
  for (let day = 1; day <= Math.max(maxDay, 25); day++) {
    dayHeaders.push(`Day${day}_Score`);
    dayHeaders.push(`Day${day}_Solved`);
    dayHeaders.push(`Day${day}_Strike`);
  }

  const header = [...baseHeaders, ...dayHeaders].join(',');

  const rows = users.map((user, index) => {
    // Create a map of day -> score data
    const scoresByDay = new Map();
    for (const ds of user.daily_scores) {
      scoresByDay.set(ds.day_number, { score: ds.score, solved: ds.solved });
    }

    // Create a set of days with strikes
    const strikesByDay = new Map();
    for (const sl of user.strike_logs) {
      strikesByDay.set(sl.day_number, sl.strike_number);
    }

    // Base row data
    const baseRow = [
      index + 1,
      `"${(user.name || '').replace(/"/g, '""')}"`,
      `"${user.enroll_no || ''}"`,
      `"${user.email || ''}"`,
      `"${user.hackerrank_id}"`,
      `"${user.batch || ''}"`,
      `"${user.year || ''}"`,
      user.total_score || 0,
      user.strike_count || 0,
      user.consecutive_miss || 0,
      user.status,
      user.is_eliminated ? 'Yes' : 'No',
      user.eliminated_on ? user.eliminated_on.toISOString().split('T')[0] : '',
      user.joined_day || '',
      user.created_at.toISOString().split('T')[0]
    ];

    // Add day columns
    const dayData = [];
    for (let day = 1; day <= Math.max(maxDay, 25); day++) {
      const dayScore = scoresByDay.get(day);
      const dayStrike = strikesByDay.get(day);

      dayData.push(dayScore?.score ?? '');        // Day{N}_Score
      dayData.push(dayScore?.solved ? 'Yes' : (dayScore ? 'No' : ''));  // Day{N}_Solved
      dayData.push(dayStrike ? `Strike #${dayStrike}` : '');  // Day{N}_Strike
    }

    return [...baseRow, ...dayData].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Export only eliminated players to CSV (up to elimination)
 */
export async function exportEliminatedCSV() {
  // Get max day number to know how many day columns we need
  const maxDayResult = await prisma.contest.findFirst({
    where: { is_processed: true },
    orderBy: { day_number: 'desc' },
    select: { day_number: true }
  });
  const maxDay = maxDayResult?.day_number || 0;

  const users = await prisma.user.findMany({
    where: { is_eliminated: true },
    select: {
      id: true,
      name: true,
      email: true,
      enroll_no: true,
      hackerrank_id: true,
      batch: true,
      year: true,
      total_score: true,
      strike_count: true,
      consecutive_miss: true,
      status: true,
      is_eliminated: true,
      eliminated_on: true,
      joined_day: true,
      created_at: true,
      daily_scores: {
        orderBy: { day_number: 'asc' },
        select: {
          day_number: true,
          score: true,
          solved: true
        }
      },
      strike_logs: {
        orderBy: { day_number: 'asc' },
        select: {
          day_number: true,
          strike_number: true
        }
      }
    },
    orderBy: [
      { eliminated_on: 'asc' },
      { total_score: 'desc' },
      { strike_count: 'asc' }
    ]
  });

  // Build header with dynamic day columns
  const baseHeaders = [
    'Rank',
    'Name',
    'Enrollment No',
    'Email',
    'HackerRank ID',
    'Batch',
    'Year',
    'Total Score',
    'Strike Count',
    'Consecutive Misses',
    'Status',
    'Eliminated',
    'Eliminated On',
    'Joined Day',
    'Registered At'
  ];
  const dayHeaders = [];
  for (let day = 1; day <= Math.max(maxDay, 25); day++) {
    dayHeaders.push(`Day${day}_Score`);
    dayHeaders.push(`Day${day}_Solved`);
    dayHeaders.push(`Day${day}_Strike`);
  }
  const header = [...baseHeaders, ...dayHeaders].join(',');

  const rows = users.map((user, index) => {
    // Create a map of day -> score data
    const scoresByDay = new Map();
    for (const ds of user.daily_scores) {
      scoresByDay.set(ds.day_number, { score: ds.score, solved: ds.solved });
    }
    // Create a set of days with strikes
    const strikesByDay = new Map();
    for (const sl of user.strike_logs) {
      strikesByDay.set(sl.day_number, sl.strike_number);
    }
    // Base row data
    const baseRow = [
      index + 1,
      `"${(user.name || '').replace(/"/g, '""')}"`,
      `"${user.enroll_no || ''}"`,
      `"${user.email || ''}"`,
      `"${user.hackerrank_id}"`,
      `"${user.batch || ''}"`,
      `"${user.year || ''}"`,
      user.total_score || 0,
      user.strike_count || 0,
      user.consecutive_miss || 0,
      user.status,
      user.is_eliminated ? 'Yes' : 'No',
      user.eliminated_on ? user.eliminated_on.toISOString().split('T')[0] : '',
      user.joined_day || '',
      user.created_at.toISOString().split('T')[0]
    ];
    // Add day columns, but only up to and including elimination day
    const dayData = [];
    let lastDay = 0;
    if (user.eliminated_on) {
      // Find the last day with a score or strike (should be elimination day)
      for (let day = 1; day <= Math.max(maxDay, 25); day++) {
        if (scoresByDay.has(day) || strikesByDay.has(day)) lastDay = day;
      }
    }
    for (let day = 1; day <= Math.max(maxDay, 25); day++) {
      if (lastDay && day > lastDay) {
        dayData.push(''); dayData.push(''); dayData.push('');
        continue;
      }
      const dayScore = scoresByDay.get(day);
      const dayStrike = strikesByDay.get(day);
      dayData.push(dayScore?.score ?? '');
      dayData.push(dayScore?.solved ? 'Yes' : (dayScore ? 'No' : ''));
      dayData.push(dayStrike ? `Strike #${dayStrike}` : '');
    }
    return [...baseRow, ...dayData].join(',');
  });
  return [header, ...rows].join('\n');
}

/**
 * Get daily breakdown for a specific day
 */
export async function getDayBreakdown(dayNumber) {
  const contest = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });

  if (!contest) return null;

  const [scores, strikes, eliminations] = await Promise.all([
    prisma.dailyScore.findMany({
      where: { day_number: dayNumber },
      include: {
        user: {
          select: { id: true, name: true, hackerrank_id: true }
        }
      },
      orderBy: { score: 'desc' }
    }),
    prisma.strikeLog.count({
      where: { day_number: dayNumber }
    }),
    prisma.eliminationLog.count({
      where: { last_day_played: dayNumber }
    })
  ]);

  const solved = scores.filter(s => s.solved).length;
  const missed = scores.filter(s => !s.solved).length;

  return {
    day: dayNumber,
    contest,
    stats: {
      totalParticipants: scores.length,
      solved,
      missed,
      strikes,
      eliminations
    },
    scores: scores.slice(0, 100) // Top 100 for UI
  };
}

/**
 * Get competition overview stats
 */
export async function getCompetitionOverview() {
  // Return cached overview if still valid
  if (cache.overview && Date.now() < cache.overviewExpiry) {
    return cache.overview;
  }

  const [
    totalRegistered,
    activeCount,
    eliminatedCount,
    dayStats
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'active', is_eliminated: false } }),
    prisma.user.count({ where: { is_eliminated: true } }),
    prisma.contest.findMany({
      where: { is_processed: true },
      orderBy: { day_number: 'asc' },
      select: {
        day_number: true,
        problem_name: true,
        processed_at: true
      }
    })
  ]);

  // Get elimination trend per day
  const eliminationsByDay = await prisma.eliminationLog.groupBy({
    by: ['last_day_played'],
    _count: { id: true }
  });

  const result = {
    totalRegistered,
    activeCount,
    eliminatedCount,
    survivalRate: totalRegistered > 0
      ? ((activeCount / totalRegistered) * 100).toFixed(1)
      : 100,
    daysProcessed: dayStats.length,
    dayStats,
    eliminationsByDay: eliminationsByDay.map(e => ({
      day: e.last_day_played,
      eliminations: e._count.id
    }))
  };

  // Cache the result
  cache.overview = result;
  cache.overviewExpiry = Date.now() + cache.OVERVIEW_TTL;

  return result;
}

/**
 * Invalidate cache (call after processing strikes or updating data)
 */
export function invalidateCache() {
  cache.leaderboard = null;
  cache.overview = null;
  cache.leaderboardExpiry = 0;
  cache.overviewExpiry = 0;
}

const leaderboardService = {
  getLeaderboard,
  getUserProgress,
  exportLeaderboardCSV,
  getDayBreakdown,
  getCompetitionOverview,
  invalidateCache
};

export default leaderboardService;
