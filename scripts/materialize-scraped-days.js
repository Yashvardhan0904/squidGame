/**
 * Materialize scraped leaderboard into day-wise truth tables.
 *
 * Flow:
 * 1) scraped_results (raw)
 * 2) daily_scores + strike_logs + elimination_logs (day-wise materialized)
 * 3) users.total_score / users.status (leaderboard read model)
 *
 * Usage:
 *   node scripts/materialize-scraped-days.js
 *   node scripts/materialize-scraped-days.js --from=1 --to=25
 *   node scripts/materialize-scraped-days.js --rebuild
 *   node scripts/materialize-scraped-days.js --force
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    maxUses: 7500,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { prisma, pool };
}

function parseArgs(argv) {
  const args = {
    from: null,
    to: null,
    rebuild: false,
    force: false,
  };

  for (const raw of argv) {
    if (raw === '--rebuild') args.rebuild = true;
    if (raw === '--force') args.force = true;
    if (raw.startsWith('--from=')) args.from = Number(raw.split('=')[1]);
    if (raw.startsWith('--to=')) args.to = Number(raw.split('=')[1]);
  }

  return args;
}

async function rebuildReadModels(prisma) {
  console.log('[Materialize] Rebuild mode: resetting materialized tables and user aggregates...');

  await prisma.$transaction(async (tx) => {
    await tx.dailyScore.deleteMany({});
    await tx.strikeLog.deleteMany({});
    await tx.eliminationLog.deleteMany({});

    await tx.user.updateMany({
      data: {
        total_score: 0,
        strike_count: 0,
        consecutive_miss: 0,
        status: 'active',
        is_eliminated: false,
        eliminated_on: null,
      },
    });

    await tx.contest.updateMany({
      data: {
        is_processed: false,
        processed_at: null,
      },
    });
  });
}

async function processDay(prisma, contest) {
  const day = contest.day_number;

  const raw = await prisma.scrapedResult.findMany({
    where: { day_number: day },
    select: { hackerrank_id: true, score: true },
  });

  const solversMap = new Map();
  for (const row of raw) {
    const key = String(row.hackerrank_id || '').trim().toLowerCase();
    if (!key) continue;
    solversMap.set(key, Number(row.score || 0));
  }

  const users = await prisma.user.findMany({
    where: {
      status: 'active',
      is_eliminated: false,
      OR: [{ joined_day: null }, { joined_day: { lte: day } }],
    },
    orderBy: { id: 'asc' },
  });

  const result = {
    solved: 0,
    strikes: 0,
    eliminations: 0,
    skipped: 0,
    errors: [],
  };

  for (const user of users) {
    try {
      const hasSolved = solversMap.has(String(user.hackerrank_id || '').toLowerCase());
      const score = hasSolved ? (solversMap.get(String(user.hackerrank_id || '').toLowerCase()) || 0) : 0;

      await prisma.$transaction(async (tx) => {
        const existingScore = await tx.dailyScore.findUnique({
          where: {
            unique_user_day: {
              user_id: user.id,
              day_number: day,
            },
          },
        });

        if (existingScore) {
          result.skipped += 1;
          return;
        }

        await tx.dailyScore.create({
          data: {
            user_id: user.id,
            day_number: day,
            contest_id: contest.id,
            score,
            solved: hasSolved,
          },
        });

        if (hasSolved) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              consecutive_miss: 0,
              total_score: { increment: score },
            },
          });
          result.solved += 1;
          return;
        }

        const existingStrike = await tx.strikeLog.findUnique({
          where: {
            unique_strike_user_day: {
              user_id: user.id,
              day_number: day,
            },
          },
        });

        if (existingStrike) {
          result.skipped += 1;
          return;
        }

        const newStrikeCount = user.strike_count + 1;
        const newConsecutiveMiss = user.consecutive_miss + 1;

        await tx.strikeLog.create({
          data: {
            user_id: user.id,
            day_number: day,
            contest_id: contest.id,
            reason: 'no_submission',
            strike_number: newStrikeCount,
            consecutive_at: newConsecutiveMiss,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            strike_count: newStrikeCount,
            consecutive_miss: newConsecutiveMiss,
          },
        });

        result.strikes += 1;

        if (newConsecutiveMiss >= 3) {
          const existingElimination = await tx.eliminationLog.findUnique({
            where: { user_id: user.id },
          });

          if (!existingElimination) {
            await tx.eliminationLog.create({
              data: {
                user_id: user.id,
                final_score: user.total_score,
                total_strikes: newStrikeCount,
                last_day_played: day,
              },
            });

            await tx.user.update({
              where: { id: user.id },
              data: {
                status: 'eliminated',
                is_eliminated: true,
                eliminated_on: new Date(),
              },
            });

            result.eliminations += 1;
          }
        }
      });
    } catch (error) {
      result.errors.push({ userId: user.id, error: error.message });
    }
  }

  await prisma.contest.update({
    where: { id: contest.id },
    data: {
      is_processed: true,
      processed_at: new Date(),
    },
  });

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { prisma, pool } = createPrismaClient();

  try {
    if (args.rebuild) {
      await rebuildReadModels(prisma);
    }

    const dayFilter = {};
    if (Number.isInteger(args.from)) dayFilter.gte = args.from;
    if (Number.isInteger(args.to)) dayFilter.lte = args.to;

    const contests = await prisma.contest.findMany({
      where: {
        is_scraped: true,
        ...(Object.keys(dayFilter).length ? { day_number: dayFilter } : {}),
      },
      orderBy: { day_number: 'asc' },
      select: { id: true, day_number: true, is_processed: true },
    });

    if (contests.length === 0) {
      console.log('[Materialize] No scraped contests found in selected range.');
      return;
    }

    console.log(`[Materialize] Found ${contests.length} scraped day(s) to evaluate.`);

    const summary = {
      attemptedDays: 0,
      processedDays: 0,
      skippedDays: 0,
      solved: 0,
      strikes: 0,
      eliminations: 0,
      skippedRows: 0,
      errors: [],
    };

    for (const contest of contests) {
      const day = contest.day_number;
      summary.attemptedDays += 1;

      try {
        if (contest.is_processed && !args.rebuild && !args.force) {
          summary.skippedDays += 1;
          console.log(`[Materialize] Day ${day}: already processed, skipping (use --force or --rebuild).`);
          continue;
        }

        if (contest.is_processed && (args.rebuild || args.force)) {
          await prisma.contest.update({
            where: { id: contest.id },
            data: { is_processed: false, processed_at: null },
          });
        }

        const result = await processDay(prisma, contest);
        summary.processedDays += 1;
        summary.solved += result.solved;
        summary.strikes += result.strikes;
        summary.eliminations += result.eliminations;
        summary.skippedRows += result.skipped;
        if (result.errors.length > 0) summary.errors.push({ day, errors: result.errors });

        console.log(`[Materialize] Day ${day}: solved=${result.solved}, strikes=${result.strikes}, eliminations=${result.eliminations}, skipped=${result.skipped}`);
      } catch (error) {
        summary.errors.push({ day, error: error.message });
        console.error(`[Materialize] Day ${day}: failed -> ${error.message}`);
      }
    }

    const [users, dailyScores, strikeLogs, eliminations, processedContests] = await Promise.all([
      prisma.user.count(),
      prisma.dailyScore.count(),
      prisma.strikeLog.count(),
      prisma.eliminationLog.count(),
      prisma.contest.count({ where: { is_processed: true } }),
    ]);

    console.log('\n[Materialize] Completed.');
    console.log(JSON.stringify({
      summary,
      dbState: { users, dailyScores, strikeLogs, eliminations, processedContests },
    }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[Materialize] Fatal error:', error.message);
  process.exit(1);
});
