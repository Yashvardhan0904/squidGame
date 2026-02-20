/**
 * Current Day Service
 * Handles current day calculation and contest URL retrieval
 */

import prisma from '../prisma';

// Competition start date (IST timezone)
const COMPETITION_START = new Date('2026-02-16T00:00:00+05:30');
const TOTAL_DAYS = 25;

/**
 * Get current day number (1-25)
 * Calculates based on COMPETITION_START date
 */
export function getCurrentDayNumber() {
  const now = new Date();
  const diffMs = now - COMPETITION_START;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayNumber = diffDays + 1;
  
  // Clamp between 1 and 25
  return Math.max(1, Math.min(TOTAL_DAYS, dayNumber));
}

/**
 * Check if competition has ended
 */
export function hasCompetitionEnded() {
  const currentDay = getCurrentDayNumber();
  const now = new Date();
  const diffMs = now - COMPETITION_START;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Competition ended if we're past day 25
  return diffDays >= TOTAL_DAYS;
}

/**
 * Get contest URL for current day
 * Returns null if contest doesn't exist or has no URL
 */
export async function getCurrentDayContestUrl() {
  const dayNumber = getCurrentDayNumber();
  
  const contest = await prisma.contest.findUnique({
    where: { day_number: dayNumber },
    select: {
      contest_url: true,
      contest_slug: true
    }
  });
  
  if (!contest) {
    return null;
  }
  
  // Return contest_url if available, otherwise construct from slug
  if (contest.contest_url) {
    return contest.contest_url;
  }
  
  if (contest.contest_slug) {
    return `https://www.hackerrank.com/contests/${contest.contest_slug}`;
  }
  
  return null;
}

/**
 * Get contest details for current day
 */
export async function getCurrentDayContest() {
  const dayNumber = getCurrentDayNumber();
  
  const contest = await prisma.contest.findUnique({
    where: { day_number: dayNumber }
  });
  
  return contest;
}

const currentDayService = {
  getCurrentDayNumber,
  hasCompetitionEnded,
  getCurrentDayContestUrl,
  getCurrentDayContest
};

export default currentDayService;
