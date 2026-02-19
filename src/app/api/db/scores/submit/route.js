import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// POST /api/db/scores/submit - Submit daily scores for a contest day
// Body: { day_number, contest_slug?, scores: [{ hackerrank_id, score }] }
export async function POST(request) {
  try {
    const { day_number, contest_slug, scores } = await request.json();

    if (!day_number || day_number < 1 || day_number > 25) {
      return NextResponse.json({ error: 'Invalid day_number (1-25)' }, { status: 400 });
    }
    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'Scores array required' }, { status: 400 });
    }

    // Upsert the contest
    await prisma.contest.upsert({
      where: { day_number },
      update: { is_processed: true, contest_slug: contest_slug || undefined },
      create: { day_number, contest_slug: contest_slug || null, is_processed: true },
    });

    let processed = 0;
    let skipped = 0;
    let newEliminations = 0;

    for (const entry of scores) {
      const { hackerrank_id, score } = entry;
      if (!hackerrank_id) { skipped++; continue; }

      // Find the user
      const user = await prisma.user.findUnique({
        where: { hackerrank_id },
      });

      if (!user) { skipped++; continue; }
      if (user.is_eliminated) { skipped++; continue; }

      // Upsert daily score (prevents duplicate per user per day)
      await prisma.dailyScore.upsert({
        where: { unique_user_day: { user_id: user.id, day_number } },
        update: { score: score || 0, contest_slug },
        create: { user_id: user.id, day_number, score: score || 0, contest_slug },
      });

      // Recalculate total_score and strike_count from all daily_scores
      const allScores = await prisma.dailyScore.findMany({
        where: { user_id: user.id },
        orderBy: { day_number: 'asc' },
      });

      const totalScore = allScores.reduce((sum, ds) => sum + ds.score, 0);
      const strikeCount = allScores.filter(ds => ds.score === 0).length;
      const isEliminated = strikeCount >= 3;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          total_score: totalScore,
          strike_count: strikeCount,
          is_eliminated: isEliminated,
          eliminated_on: isEliminated && !user.is_eliminated ? new Date() : user.eliminated_on,
        },
      });

      // Log elimination
      if (isEliminated && !user.is_eliminated) {
        await prisma.eliminationLog.upsert({
          where: { user_id: user.id },
          update: { final_score: totalScore, total_strikes: strikeCount, last_day_played: day_number },
          create: { user_id: user.id, final_score: totalScore, total_strikes: strikeCount, last_day_played: day_number },
        });
        newEliminations++;
      }

      processed++;
    }

    return NextResponse.json({
      success: true,
      day_number,
      processed,
      skipped,
      new_eliminations: newEliminations,
    });
  } catch (error) {
    console.error('POST /api/db/scores/submit error:', error);
    return NextResponse.json({ error: 'Score submission failed: ' + error.message }, { status: 500 });
  }
}
