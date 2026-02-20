/**
 * Backup Service
 * Generates daily backups of user data and scores
 */

import prisma from '../prisma';
import { stringify } from 'csv-stringify/sync';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Generate daily backup CSV
 * Includes all users with their daily scores in columns (day1_score, day2_score, etc.)
 */
export async function generateDailyBackup(dayNumber) {
  try {
    console.log(`[Backup] Starting backup for day ${dayNumber}`);

    // Fetch all users with their daily scores
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: {
        daily_scores: {
          where: {
            day_number: { lte: dayNumber }
          },
          orderBy: { day_number: 'asc' }
        }
      }
    });

    // Prepare CSV data
    const records = users.map(user => {
      const record = {
        id: user.id,
        name: user.name || '',
        hackerrank_id: user.hackerrank_id || '',
        email: user.email || '',
        status: user.status,
        strike_count: user.strike_count,
        consecutive_miss: user.consecutive_miss,
        total_score: user.total_score,
        is_eliminated: user.is_eliminated
      };

      // Add daily scores as columns (day1_score, day2_score, etc.)
      for (let day = 1; day <= dayNumber; day++) {
        const dayScore = user.daily_scores.find(s => s.day_number === day);
        record[`day${day}_score`] = dayScore ? dayScore.score : 0;
        record[`day${day}_solved`] = dayScore ? dayScore.solved : false;
      }

      return record;
    });

    // Generate CSV
    const csv = stringify(records, {
      header: true,
      quoted: true,
      quoted_empty: true
    });

    // Ensure backups directory exists
    const backupsDir = join(process.cwd(), 'backups');
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup_day${dayNumber}_${timestamp}.csv`;
    const filepath = join(backupsDir, filename);

    // Write to file
    writeFileSync(filepath, csv, 'utf-8');

    console.log(`[Backup] Backup saved: ${filename} (${users.length} users)`);

    return {
      success: true,
      filename,
      filepath,
      recordCount: users.length,
      dayNumber
    };

  } catch (error) {
    console.error(`[Backup] Failed to generate backup for day ${dayNumber}:`, error);

    // Log failure to database (optional)
    try {
      await prisma.adminAuditLog.create({
        data: {
          admin_user_id: 0, // System action
          action: 'BACKUP_FAILED',
          target_type: 'Contest',
          target_id: dayNumber.toString(),
          old_value: null,
          new_value: { error: error.message },
          reason: `Automatic backup failed for day ${dayNumber}`
        }
      });
    } catch (logError) {
      console.error('[Backup] Failed to log backup error:', logError);
    }

    throw error;
  }
}

const backupService = {
  generateDailyBackup
};

export default backupService;
