import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// POST /api/db/players/upload - Upload CSV and upsert players
export async function POST(request) {
  try {
    const { players } = await request.json();

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'No player data provided' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;

    for (const p of players) {
      if (!p.hackerrank_id) continue;

      const existing = await prisma.user.findUnique({
        where: { hackerrank_id: p.hackerrank_id },
      });

      if (existing) {
        await prisma.user.update({
          where: { hackerrank_id: p.hackerrank_id },
          data: {
            name: p.name || existing.name,
            enroll_no: p.enroll_no || existing.enroll_no,
            email: p.email || existing.email,
            batch: p.batch || existing.batch,
            year: p.year || existing.year,
            experience: p.experience || existing.experience,
          },
        });
        updated++;
      } else {
        await prisma.user.create({
          data: {
            name: p.name || p.hackerrank_id.toUpperCase(),
            hackerrank_id: p.hackerrank_id,
            enroll_no: p.enroll_no || null,
            email: p.email || null,
            batch: p.batch || null,
            year: p.year || null,
            experience: p.experience || null,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created} players created, ${updated} players updated`,
      created,
      updated,
      total: created + updated,
    });
  } catch (error) {
    console.error('POST /api/db/players/upload error:', error);
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
  }
}
