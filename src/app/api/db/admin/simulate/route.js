import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// POST /api/db/admin/simulate - Simulate a contest day with random scores
export async function POST(request) {
  try {
    // Find the next day number
    const lastContest = await prisma.contest.findFirst({ orderBy: { day_number: 'desc' } });
    const nextDay = lastContest ? lastContest.day_number + 1 : 1;

    if (nextDay > 25) {
      return NextResponse.json({ error: 'Challenge is over! All 25 days completed.' }, { status: 400 });
    }

    // Get all active players
    const activePlayers = await prisma.user.findMany({
      where: { is_eliminated: false },
    });

    if (activePlayers.length === 0) {
      return NextResponse.json({ error: 'No active players to simulate' }, { status: 400 });
    }

    let newEliminations = 0;

    for (const user of activePlayers) {
      // 70% chance of scoring, 30% chance of zero
      const score = Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 1 : 0;

      await prisma.dailyScore.create({
        data: { user_id: user.id, day_number: nextDay, score },
      });

      const newTotal = user.total_score + score;
      const newStrikes = user.strike_count + (score === 0 ? 1 : 0);
      const isEliminated = newStrikes >= 3;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          total_score: newTotal,
          strike_count: newStrikes,
          is_eliminated: isEliminated,
          eliminated_on: isEliminated ? new Date() : null,
        },
      });

      if (isEliminated) {
        await prisma.eliminationLog.upsert({
          where: { user_id: user.id },
          update: { final_score: newTotal, total_strikes: newStrikes, last_day_played: nextDay },
          create: { user_id: user.id, final_score: newTotal, total_strikes: newStrikes, last_day_played: nextDay },
        });
        newEliminations++;
      }
    }

    // Record the contest
    await prisma.contest.create({
      data: { day_number: nextDay, is_processed: true },
    });

    return NextResponse.json({
      success: true,
      day_number: nextDay,
      players_processed: activePlayers.length,
      new_eliminations: newEliminations,
    });
  } catch (error) {
    console.error('POST /api/db/admin/simulate error:', error);
    return NextResponse.json({ error: 'Simulation failed: ' + error.message }, { status: 500 });
  }
}
