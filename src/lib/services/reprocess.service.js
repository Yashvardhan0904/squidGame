/**
 * Reprocess Service
 * Allow reprocessing of a contest day (idempotent operation)
 */

import prisma from '../prisma';
import { processStrikes } from './strike.processor';

/**
 * Reprocess a contest day
 * Sets is_processed to false and calls processStrikes again
 * The processStrikes function has built-in idempotency checks
 * 
 * @param {number} dayNumber - Day number (1-25)
 * @param {number} adminUserId - Admin user ID for audit logging
 * @returns {Promise<Object>} Processing result summary
 * @throws {Error} If contest not found or validation fails
 */
export async function reprocessDay(dayNumber, adminUserId) {
  // Validate day_number
  if (!dayNumber || dayNumber < 1 || dayNumber > 25) {
    throw new Error('Day number must be between 1 and 25');
  }

  // Verify Contest exists
  const contest = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });

  if (!contest) {
    throw new Error(`Contest day ${dayNumber} not found`);
  }

  // Verify contest is scraped
  if (!contest.is_scraped) {
    throw new Error(`Contest day ${dayNumber} has not been scraped yet. Please scrape first.`);
  }

  try {
    // Set is_processed to false to allow reprocessing
    await prisma.contest.update({
      where: { day_number: dayNumber },
      data: {
        is_processed: false
      }
    });

    // Call processStrikes (which has built-in idempotency)
    // Existing DailyScore and StrikeLog records will be skipped
    const result = await processStrikes(dayNumber, { bypassLock: true });

    // Create AdminAuditLog entry for reprocess action
    await prisma.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'REPROCESS_DAY',
        target_type: 'Contest',
        target_id: dayNumber,
        new_value: JSON.stringify(result),
        notes: `Reprocessed day ${dayNumber}`
      }
    });

    return {
      success: true,
      dayNumber,
      solved: result.solved ?? 0,
      strikes: result.strikes ?? 0,
      eliminations: result.eliminations ?? 0,
      skipped: result.skipped ?? false,
      reason: result.reason || null,
      errors: result.errors
    };

  } catch (error) {
    // Log error in audit trail
    await prisma.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'REPROCESS_DAY_FAILED',
        target_type: 'Contest',
        target_id: dayNumber,
        notes: `Failed to reprocess day ${dayNumber}: ${error.message}`
      }
    });

    throw error;
  }
}

export default {
  reprocessDay
};
