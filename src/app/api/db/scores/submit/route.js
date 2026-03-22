import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// POST /api/db/scores/submit - Ingest scraped leaderboard rows for a day
// Body: { day_number, contest_slug?, scores: [{ hackerrank_id, score, rank? }] }
export async function POST(request) {
  try {
    const { day_number, contest_slug, scores } = await request.json();

    if (!day_number || day_number < 1 || day_number > 25) {
      return NextResponse.json({ error: 'Invalid day_number (1-25)' }, { status: 400 });
    }
    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'Scores array required' }, { status: 400 });
    }

    const contest = await prisma.contest.upsert({
      where: { day_number },
      update: {
        contest_slug: contest_slug || undefined,
      },
      create: {
        day_number,
        contest_slug: contest_slug || null,
      },
    });

    const batchId = `csv-${day_number}-${Date.now()}`;
    let scraped = 0;
    let skipped = 0;

    for (const entry of scores) {
      const { hackerrank_id, score, rank } = entry;
      const normalizedId = (hackerrank_id || '').toString().trim();

      if (!normalizedId) {
        skipped++;
        continue;
      }

      await prisma.scrapedResult.upsert({
        where: {
          unique_scraped_day_user: {
            day_number,
            hackerrank_id: normalizedId,
          },
        },
        update: {
          score: Number(score) || 0,
          rank: Number.isFinite(Number(rank)) ? Number(rank) : null,
          scraped_at: new Date(),
          scrape_batch_id: batchId,
          contest_id: contest.id,
        },
        create: {
          contest_id: contest.id,
          day_number,
          hackerrank_id: normalizedId,
          score: Number(score) || 0,
          rank: Number.isFinite(Number(rank)) ? Number(rank) : null,
          scrape_batch_id: batchId,
        },
      });

      scraped++;
    }

    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        is_scraped: true,
        scraped_at: new Date(),
        scrape_attempts: { increment: 1 },
        last_scrape_error: null,
        // Keep processing explicit so strike flow can run from /api/admin/process.
        is_processed: false,
        processed_at: null,
      },
    });

    return NextResponse.json({
      success: true,
      day_number,
      scraped,
      skipped,
      batch_id: batchId,
      message: 'Scraped rows saved. Now run Process Day (Strikes).',
    });
  } catch (error) {
    console.error('POST /api/db/scores/submit error:', error);
    return NextResponse.json({ error: 'Score submission failed: ' + error.message }, { status: 500 });
  }
}
