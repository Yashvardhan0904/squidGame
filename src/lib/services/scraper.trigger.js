/**
 * Scraper Trigger Service
 * Manually trigger leaderboard scraping for a specific day
 */

import prisma from '../prisma';
import { scrapeLeaderboard } from './scraper.service';

/**
 * Trigger scraping for a specific contest day
 * @param {number} dayNumber - Day number (1-25)
 * @returns {Promise<Object>} Scrape result summary
 * @throws {Error} If contest not found or validation fails
 */
export async function triggerScraping(dayNumber) {
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

  // Verify contest has contest_slug
  if (!contest.contest_slug || contest.contest_slug.trim() === '') {
    throw new Error(`Contest day ${dayNumber} has no contest_slug configured`);
  }

  try {
    // Call existing scrapeLeaderboard function
    const result = await scrapeLeaderboard(contest.contest_slug, dayNumber);

    return {
      success: true,
      dayNumber,
      participantCount: result.count,
      batchId: result.batchId,
      scrapedAt: new Date()
    };

  } catch (error) {
    // Error handling is already done in scrapeLeaderboard
    // (updates scrape_attempts and last_scrape_error)
    throw error;
  }
}

export default {
  triggerScraping
};
