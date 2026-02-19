/**
 * Nightly Strike Processor Service
 * Processes strikes for users who missed the daily challenge
 * IDEMPOTENT: Safe to run multiple times
 */

import prisma from '../prisma';
import { getSolversForDay, getCurrentDayNumber } from './scraper.service';
import { queueStrikeEmail, queueEliminationEmail } from './email.service';

const INSTANCE_ID = `worker-${Date.now().toString(36)}`;
const LOCK_TIMEOUT_MINUTES = 30;

/**
 * Main entry point - process strikes for a given day
 */
export async function processStrikes(dayNumber) {
  const startTime = Date.now();
  const jobName = 'nightly_strike_processor';

  try {
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Acquire distributed lock
    // ═══════════════════════════════════════════════════════════════════
    const lockAcquired = await acquireLock(jobName);
    if (!lockAcquired) {
      console.log('[StrikeProcessor] Lock not acquired, another instance is processing');
      return { skipped: true, reason: 'lock_not_acquired' };
    }

    console.log(`[StrikeProcessor] Day ${dayNumber} - Processing started (${INSTANCE_ID})`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Verify contest exists and is scraped
    // ═══════════════════════════════════════════════════════════════════
    const contest = await prisma.contest.findUnique({
      where: { day_number: dayNumber }
    });

    if (!contest) {
      throw new Error(`Contest for day ${dayNumber} not found`);
    }
    if (!contest.is_scraped) {
      throw new Error(`Contest for day ${dayNumber} not yet scraped`);
    }
    if (contest.is_processed) {
      console.log(`[StrikeProcessor] Day ${dayNumber} already processed, skipping`);
      await releaseLock(jobName, 'completed', Date.now() - startTime);
      return { skipped: true, reason: 'already_processed' };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Load scraped results into a Map for O(1) lookup
    // ═══════════════════════════════════════════════════════════════════
    const solversMap = await getSolversForDay(dayNumber);
    console.log(`[StrikeProcessor] Day ${dayNumber} - Loaded ${solversMap.size} solvers`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Get all active users who should be processed
    // ═══════════════════════════════════════════════════════════════════
    const users = await prisma.user.findMany({
      where: {
        status: 'active',
        is_eliminated: false,
        OR: [
          { joined_day: null },
          { joined_day: { lte: dayNumber } }
        ]
      },
      orderBy: { id: 'asc' }
    });

    console.log(`[StrikeProcessor] Day ${dayNumber} - Processing ${users.length} eligible users`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Process each user
    // ═══════════════════════════════════════════════════════════════════
    const results = {
      solved: 0,
      strikes: 0,
      eliminations: 0,
      skipped: 0,
      errors: []
    };

    for (const user of users) {
      try {
        await processUser(user, dayNumber, contest.id, solversMap, results);
      } catch (err) {
        console.error(`[StrikeProcessor] Error processing user ${user.id}:`, err);
        results.errors.push({ userId: user.id, error: err.message });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Mark contest as processed
    // ═══════════════════════════════════════════════════════════════════
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        is_processed: true,
        processed_at: new Date()
      }
    });

    const duration = Date.now() - startTime;
    await releaseLock(jobName, 'completed', duration);

    console.log(`[StrikeProcessor] Day ${dayNumber} - Complete`, results);
    return results;

  } catch (error) {
    const duration = Date.now() - startTime;
    await releaseLock(jobName, 'failed', duration, error.message);
    console.error('[StrikeProcessor] Failed:', error);
    throw error;
  }
}

/**
 * Process a single user - IDEMPOTENT
 */
async function processUser(user, dayNumber, contestId, solversMap, results) {
  const hasSolved = solversMap.has(user.hackerrank_id.toLowerCase());
  const score = hasSolved ? (solversMap.get(user.hackerrank_id.toLowerCase()) || 100) : 0;

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Check if already processed (idempotency)
    const existingScore = await tx.dailyScore.findUnique({
      where: {
        unique_user_day: {
          user_id: user.id,
          day_number: dayNumber
        }
      }
    });

    if (existingScore) {
      results.skipped++;
      return;
    }

    // Insert daily score
    await tx.dailyScore.create({
      data: {
        user_id: user.id,
        day_number: dayNumber,
        contest_id: contestId,
        score: score,
        solved: hasSolved
      }
    });

    if (hasSolved) {
      // ─────────────────────────────────────────────────────────────────
      // USER SOLVED: Reset consecutive miss, add score
      // ─────────────────────────────────────────────────────────────────
      await tx.user.update({
        where: { id: user.id },
        data: {
          consecutive_miss: 0,
          total_score: { increment: score }
        }
      });
      results.solved++;

    } else {
      // ─────────────────────────────────────────────────────────────────
      // USER MISSED: Issue strike
      // ─────────────────────────────────────────────────────────────────

      // Check if strike already exists (idempotency)
      const existingStrike = await tx.strikeLog.findUnique({
        where: {
          unique_strike_user_day: {
            user_id: user.id,
            day_number: dayNumber
          }
        }
      });

      if (existingStrike) {
        results.skipped++;
        return;
      }

      const newStrikeCount = user.strike_count + 1;
      const newConsecutiveMiss = user.consecutive_miss + 1;

      // Insert strike log
      await tx.strikeLog.create({
        data: {
          user_id: user.id,
          day_number: dayNumber,
          contest_id: contestId,
          reason: 'no_submission',
          strike_number: newStrikeCount,
          consecutive_at: newConsecutiveMiss
        }
      });

      // Update user
      await tx.user.update({
        where: { id: user.id },
        data: {
          strike_count: newStrikeCount,
          consecutive_miss: newConsecutiveMiss
        }
      });

      results.strikes++;

      // ─────────────────────────────────────────────────────────────────
      // CHECK FOR ELIMINATION (3 consecutive misses = eliminated)
      // ─────────────────────────────────────────────────────────────────
      if (newConsecutiveMiss >= 3) {
        await eliminateUser(tx, user, dayNumber, newStrikeCount);
        results.eliminations++;
        // Send elimination email (not strike email)
        if (user.email) {
          await queueEliminationEmail(tx, user, dayNumber);
        }
      } else {
        // Queue strike warning email (strike 1 or 2 only)
        if (user.email) {
          await queueStrikeEmail(tx, user, newConsecutiveMiss, dayNumber);
        }
      }
    }
  });
}

/**
 * Eliminate a user
 */
async function eliminateUser(tx, user, dayNumber, totalStrikes) {
  // Check if already eliminated (idempotency)
  const existing = await tx.eliminationLog.findUnique({
    where: { user_id: user.id }
  });

  if (existing) return;

  // Insert elimination record
  await tx.eliminationLog.create({
    data: {
      user_id: user.id,
      final_score: user.total_score,
      total_strikes: totalStrikes,
      last_day_played: dayNumber
    }
  });

  // Update user status
  await tx.user.update({
    where: { id: user.id },
    data: {
      status: 'eliminated',
      is_eliminated: true,
      eliminated_on: new Date()
    }
  });

  // Queue elimination email
  if (user.email) {
    await queueEliminationEmail(tx, user, dayNumber);
  }
}

/**
 * Acquire distributed lock
 */
async function acquireLock(jobName) {
  const timeoutThreshold = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000);

  // Try to acquire lock
  const result = await prisma.cronLock.updateMany({
    where: {
      job_name: jobName,
      OR: [
        { locked_at: null },
        { locked_at: { lt: timeoutThreshold } }
      ]
    },
    data: {
      locked_at: new Date(),
      locked_by: INSTANCE_ID
    }
  });

  return result.count > 0;
}

/**
 * Release distributed lock
 */
async function releaseLock(jobName, status, durationMs, error = null) {
  await prisma.cronLock.update({
    where: { job_name: jobName },
    data: {
      locked_at: null,
      locked_by: null,
      last_run_at: new Date(),
      last_run_status: status,
      last_run_duration_ms: durationMs,
      last_error: error,
      total_runs: { increment: 1 },
      total_failures: status === 'failed' ? { increment: 1 } : undefined
    }
  });
}

/**
 * Initialize cron lock records (run once)
 */
export async function initCronLocks() {
  const jobs = ['nightly_strike_processor', 'email_sender', 'leaderboard_scraper'];

  for (const jobName of jobs) {
    await prisma.cronLock.upsert({
      where: { job_name: jobName },
      update: {},
      create: { job_name: jobName }
    });
  }
}

const strikeProcessor = {
  processStrikes,
  initCronLocks,
  getCurrentDayNumber
};

export default strikeProcessor;
