/**
 * Admin Scrape Leaderboard API
 * Manually trigger leaderboard scraping for a specific day
 * 
 * POST /api/admin/scrape
 * Body: { dayNumber: number }
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminAuth';
import { triggerScraping } from '@/lib/services/scraper.trigger';

export async function POST(request) {
  try {
    // Validate admin authorization
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { dayNumber } = await request.json();
    
    if (!dayNumber) {
      return NextResponse.json({
        error: 'Day number is required'
      }, { status: 400 });
    }
    
    // Trigger scraping
    const result = await triggerScraping(dayNumber);
    
    return NextResponse.json({
      success: true,
      message: `Successfully scraped leaderboard for day ${dayNumber}`,
      ...result
    });
    
  } catch (error) {
    console.error('[Admin] Scrape failed:', error);
    
    // Return validation errors with 400 status
    if (error.message.includes('must be between') ||
        error.message.includes('not found') ||
        error.message.includes('no contest_slug')) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 });
    }
    
    // Return server errors with 500 status
    return NextResponse.json({
      error: error.message,
      details: 'Scraping failed. Check contest_slug and HackerRank availability.'
    }, { status: 500 });
  }
}
