/**
 * Strike Processing Trigger Service
 * Manually trigger strike processing for a specific day
 */

import prisma from '../prisma';
import { processStrikes } from './strike.processor';
import { generateDailyBackup } from './backup.service';

/**
 * Trigger strike processing for a specific contest day
 * @param {number} dayNumber - Day number (1-25)
 * @param {number} adminUserId - Admin user ID for audit logging
 * @returns {Promise<Object>} Processing result summary
 * @throws {Error} If contest not found or validation fails
 */
export async function triggerStrikeProcessing(dayNumber, adminUserId) {
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

  // Verify contest is not already processed (prevent duplicate processing)
  if (contest.is_processed) {
    throw new Error(`Contest day ${dayNumber} has already been processed. Use reprocess endpoint to process again.`);
  }

  try {
    // Call existing processStrikes function
    const result = await processStrikes(dayNumber);

    // Generate backup after successful processing
    let backupResult = null;
    try {
      backupResult = await generateDailyBackup(dayNumber);
      console.log(`[StrikeTrigger] Backup generated: ${backupResult.filename}`);
    } catch (backupError) {
      // Log backup failure but don't block strike processing
      console.error('[StrikeTrigger] Backup failed (non-blocking):', backupError);
    }

    // Create AdminAuditLog entry
    await prisma.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'MANUAL_PROCESS_DAY',
        target_type: 'Contest',
        target_id: dayNumber.toString(),
        new_value: {
          processing: result,
          backup: backupResult
        },
        reason: `Manually triggered strike processing for day ${dayNumber}`
      }
    });

    return {
      success: true,
      dayNumber,
      solved: result.solved,
      strikes: result.strikes,
      eliminations: result.eliminations,
      skipped: result.skipped,
      errors: result.errors,
      backup: backupResult
    };

  } catch (error) {
    // Log error in audit trail
    await prisma.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'MANUAL_PROCESS_DAY_FAILED',
        target_type: 'Contest',
        target_id: dayNumber.toString(),
        reason: `Failed to process day ${dayNumber}: ${error.message}`
      }
    });

    throw error;
  }
}

export default {
  triggerStrikeProcessing
};
