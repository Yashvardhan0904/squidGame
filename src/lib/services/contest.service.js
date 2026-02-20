/**
 * Contest Service
 * Manages contest day creation, updates, and queries
 */

import prisma from '../prisma';

/**
 * Create a new contest day
 * @param {Object} data - Contest day data
 * @param {number} data.day_number - Day number (1-25)
 * @param {string} data.contest_slug - HackerRank contest slug
 * @param {string} data.contest_url - HackerRank contest URL
 * @param {string} data.problem_name - Problem name
 * @param {Date} [data.start_time] - Contest start time
 * @param {Date} [data.end_time] - Contest end time
 * @returns {Promise<Object>} Created contest
 * @throws {Error} Validation errors
 */
export async function createContestDay(data) {
  const { day_number, contest_slug, contest_url, problem_name, start_time, end_time } = data;

  // Validate day_number is between 1 and 25
  if (!day_number || day_number < 1 || day_number > 25) {
    throw new Error('Day number must be between 1 and 25');
  }

  // Validate required fields are non-empty
  if (!contest_slug || contest_slug.trim() === '') {
    throw new Error('Contest slug is required');
  }

  if (!contest_url || contest_url.trim() === '') {
    throw new Error('Contest URL is required');
  }

  if (!problem_name || problem_name.trim() === '') {
    throw new Error('Problem name is required');
  }

  // Check if day_number already exists
  const existing = await prisma.contest.findUnique({
    where: { day_number }
  });

  if (existing) {
    throw new Error(`Contest day ${day_number} already exists`);
  }

  // Create contest with is_scraped and is_processed set to false by default
  const contest = await prisma.contest.create({
    data: {
      day_number,
      contest_slug: contest_slug.trim(),
      contest_url: contest_url.trim(),
      problem_name: problem_name.trim(),
      start_time: start_time || null,
      end_time: end_time || null,
      is_scraped: false,
      is_processed: false,
      scrape_attempts: 0
    }
  });

  return contest;
}

/**
 * Update an existing contest day
 * @param {number} dayNumber - Day number to update
 * @param {Object} data - Fields to update
 * @param {string} [data.contest_slug] - HackerRank contest slug
 * @param {string} [data.contest_url] - HackerRank contest URL
 * @param {string} [data.problem_name] - Problem name
 * @param {Date} [data.start_time] - Contest start time
 * @param {Date} [data.end_time] - Contest end time
 * @returns {Promise<Object>} Updated contest
 * @throws {Error} If contest not found or validation fails
 */
export async function updateContestDay(dayNumber, data) {
  // Validate day_number
  if (!dayNumber || dayNumber < 1 || dayNumber > 25) {
    throw new Error('Day number must be between 1 and 25');
  }

  // Check if contest exists
  const existing = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });

  if (!existing) {
    throw new Error(`Contest day ${dayNumber} not found`);
  }

  // Build update data object (only include provided fields)
  const updateData = {};

  if (data.contest_slug !== undefined) {
    if (data.contest_slug.trim() === '') {
      throw new Error('Contest slug cannot be empty');
    }
    updateData.contest_slug = data.contest_slug.trim();
  }

  if (data.contest_url !== undefined) {
    if (data.contest_url.trim() === '') {
      throw new Error('Contest URL cannot be empty');
    }
    updateData.contest_url = data.contest_url.trim();
  }

  if (data.problem_name !== undefined) {
    if (data.problem_name.trim() === '') {
      throw new Error('Problem name cannot be empty');
    }
    updateData.problem_name = data.problem_name.trim();
  }

  if (data.start_time !== undefined) {
    updateData.start_time = data.start_time;
  }

  if (data.end_time !== undefined) {
    updateData.end_time = data.end_time;
  }

  // Update contest (preserves all other fields)
  const updated = await prisma.contest.update({
    where: { day_number: dayNumber },
    data: updateData
  });

  return updated;
}

/**
 * Get a contest day by day number
 * @param {number} dayNumber - Day number (1-25)
 * @returns {Promise<Object|null>} Contest or null if not found
 */
export async function getContestDay(dayNumber) {
  if (!dayNumber || dayNumber < 1 || dayNumber > 25) {
    return null;
  }

  const contest = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });

  return contest;
}

/**
 * Get the current day's contest based on competition start date
 * @returns {Promise<Object|null>} Current day contest or null
 */
export async function getCurrentDayContest() {
  // Calculate current day number
  const competitionStart = new Date(process.env.COMPETITION_START || '2024-12-01');
  const now = new Date();
  const daysSinceStart = Math.floor((now - competitionStart) / (1000 * 60 * 60 * 24));
  const currentDay = Math.max(1, Math.min(25, daysSinceStart + 1));

  // Get contest for current day
  const contest = await prisma.contest.findUnique({
    where: { day_number: currentDay }
  });

  return contest;
}

/**
 * List all contest days
 * @returns {Promise<Array>} Array of all contests ordered by day_number
 */
export async function listContestDays() {
  const contests = await prisma.contest.findMany({
    orderBy: { day_number: 'asc' }
  });

  return contests;
}

/**
 * Delete a contest day
 * @param {number} dayNumber - Day number to delete
 * @returns {Promise<Object>} Deleted contest
 * @throws {Error} If contest is processed or not found
 */
export async function deleteContestDay(dayNumber) {
  // Validate day_number
  if (!dayNumber || dayNumber < 1 || dayNumber > 25) {
    throw new Error('Day number must be between 1 and 25');
  }

  // Check if contest exists
  const existing = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });

  if (!existing) {
    throw new Error(`Contest day ${dayNumber} not found`);
  }

  // Prevent deletion if processed
  if (existing.is_processed) {
    throw new Error(`Cannot delete contest day ${dayNumber}: day has been processed`);
  }

  // Delete contest
  const deleted = await prisma.contest.delete({
    where: { day_number: dayNumber }
  });

  return deleted;
}

const contestService = {
  createContestDay,
  updateContestDay,
  getContestDay,
  getCurrentDayContest,
  listContestDays,
  deleteContestDay
};

export default contestService;
