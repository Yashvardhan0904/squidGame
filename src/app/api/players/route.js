import { NextResponse } from 'next/server';

// Default Google Sheet URL - automatically syncs with this sheet
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEoIYwDHC5MfP5AZaQdlPAwj3xs1aCRZAMwkJho58_jbkeNvhFMhx2xgLPMmB52Hkbf2ln1H_Blg9c/pub?gid=1887041797&single=true&output=csv';

export async function GET(request) {
  // Get Sheet URL from header, env variable, or use default
  const SHEET_URL = request.headers.get('x-sheet-url') || process.env.GOOGLE_SHEET_CSV_URL || DEFAULT_SHEET_URL;

  if (!SHEET_URL) {
    return NextResponse.json({ error: 'System configuration error: Missing Sheet URL' }, { status: 500 });
  }

  try {
    // Fetch CSV with cache bypassing for "live" feel (or set to 60 for 1-min cache)
    const response = await fetch(SHEET_URL, { 
      cache: 'no-store',
      headers: { 'Content-Type': 'text/csv; charset=UTF-8' }
    });
    
    if (!response.ok) throw new Error('Failed to fetch Google Sheet');
    
    const csvData = await response.text();

    // Basic CSV parsing
    const rows = csvData.split(/\r?\n/).filter(row => row.trim() !== '');
    if (rows.length < 2) return NextResponse.json([]);

    const dataRows = rows.slice(1);

    const processedPlayers = dataRows.map((row, index) => {
      // Split by comma but handle potential quoted strings
      const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
      
      // Column mapping (0-indexed):
      // B=1: name, C=2: batch, D=3: year, E=4: hr_id, 
      // F=5: enroll_no, G=6: experience, I=8: email, J=9: strikes
      const name = cols[1] || '';
      const batch = cols[2] || '';
      const year = cols[3] || '';
      const hr_id = cols[4] || '';
      const enroll_no = cols[5] || '';
      const experience = cols[6] || '';
      const email = cols[8] || '';
      const strikes = parseInt(cols[9]) || 0;
      
      if (!name || !hr_id) return null;

      return {
        id: `p-${hr_id}-${index}`,
        name: name.toUpperCase(),
        hr_id,
        batch,
        year,
        enroll_no,
        experience,
        email,
        strikes: Math.min(strikes, 3),
        actualStrikes: strikes,
        totalScore: 0, // Can be calculated later if needed
        isEliminated: strikes >= 3
      };
    }).filter(Boolean);

    // Handle Edge Cases: Deduplicate by HackerRank ID (keep latest entry)
    const uniquePlayersMap = new Map();
    processedPlayers.forEach(p => {
      uniquePlayersMap.set(p.hr_id, p);
    });

    const finalPlayers = Array.from(uniquePlayersMap.values());

    // Sort by strikes (ascending) then by name
    finalPlayers.sort((a, b) => {
      if (a.strikes !== b.strikes) return a.strikes - b.strikes;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(finalPlayers);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to sync arena data' }, { status: 500 });
  }
}