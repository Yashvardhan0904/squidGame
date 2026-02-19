import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// POST /api/db/admin/reset - Reset database and optionally seed demo data
export async function POST(request) {
  try {
    const { seed } = await request.json().catch(() => ({ seed: true }));

    // Delete in order (respecting foreign keys)
    await prisma.eliminationLog.deleteMany();
    await prisma.dailyScore.deleteMany();
    await prisma.contest.deleteMany();
    await prisma.user.deleteMany();

    if (seed) {
      // Seed demo players
      const demoPlayers = [
        { name: 'ALICE JOHNSON', hackerrank_id: 'alice_j', enroll_no: 'ACM001' },
        { name: 'BOB SMITH', hackerrank_id: 'bob_s', enroll_no: 'ACM002' },
        { name: 'CHARLIE BROWN', hackerrank_id: 'charlie_b', enroll_no: 'ACM003' },
        { name: 'DIANA PRINCE', hackerrank_id: 'diana_p', enroll_no: 'ACM004' },
      ];

      for (const p of demoPlayers) {
        await prisma.user.create({ data: p });
      }

      // Seed demo scores
      const demoScores = [
        { hackerrank_id: 'alice_j', scores: [100, 85, 90] },
        { hackerrank_id: 'bob_s', scores: [0, 0, 100] },
        { hackerrank_id: 'charlie_b', scores: [50, 75, 0] },
        { hackerrank_id: 'diana_p', scores: [0, 0, 0] },
      ];

      for (const entry of demoScores) {
        const user = await prisma.user.findUnique({ where: { hackerrank_id: entry.hackerrank_id } });
        if (!user) continue;

        let totalScore = 0;
        let strikes = 0;

        for (let i = 0; i < entry.scores.length; i++) {
          await prisma.dailyScore.create({
            data: { user_id: user.id, day_number: i + 1, score: entry.scores[i] },
          });
          totalScore += entry.scores[i];
          if (entry.scores[i] === 0) strikes++;
        }

        const isEliminated = strikes >= 3;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            total_score: totalScore,
            strike_count: strikes,
            is_eliminated: isEliminated,
            eliminated_on: isEliminated ? new Date() : null,
          },
        });

        if (isEliminated) {
          await prisma.eliminationLog.create({
            data: {
              user_id: user.id,
              final_score: totalScore,
              total_strikes: strikes,
              last_day_played: entry.scores.length,
            },
          });
        }
      }

      // Seed contests
      for (let d = 1; d <= 3; d++) {
        await prisma.contest.create({ data: { day_number: d, is_processed: true } });
      }
    }

    return NextResponse.json({
      success: true,
      message: seed ? 'Database reset and seeded with demo data' : 'Database cleared',
    });
  } catch (error) {
    console.error('POST /api/db/admin/reset error:', error);
    return NextResponse.json({ error: 'Reset failed: ' + error.message }, { status: 500 });
  }
}
