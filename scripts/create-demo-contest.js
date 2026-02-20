/**
 * Create Demo Contest
 * Creates a live demo contest for testing the UI
 */

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function createDemoContest() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🎮 Creating demo contest...\n');

    // Set competition start to today
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    istDate.setHours(9, 0, 0, 0);
    const startDate = istDate.toISOString().replace('Z', '+05:30');
    
    console.log(`📅 Competition start: ${startDate}`);
    
    // Update .env file
    const fs = require('fs');
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('COMPETITION_START=')) {
      envContent = envContent.replace(
        /COMPETITION_START=.*/,
        `COMPETITION_START="${startDate}"`
      );
    } else {
      envContent += `\nCOMPETITION_START="${startDate}"\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file\n');

    // Create Day 1 contest
    const contest = await pool.query(`
      INSERT INTO contests (
        day_number, 
        contest_slug, 
        contest_url, 
        problem_name,
        date,
        start_time,
        end_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (day_number) 
      DO UPDATE SET
        contest_slug = EXCLUDED.contest_slug,
        contest_url = EXCLUDED.contest_url,
        problem_name = EXCLUDED.problem_name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time
      RETURNING *
    `, [
      1, // day_number
      'acm-squid-game-demo-day-1',
      'https://www.hackerrank.com/contests/acm-squid-game-demo-day-1',
      'Two Sum - Demo Problem',
      now,
      istDate, // 9 AM today
      new Date(istDate.getTime() + (15 * 60 * 60 * 1000)) // 11:59 PM today
    ]);

    console.log('✅ Created demo contest:');
    console.log(`   Day: ${contest.rows[0].day_number}`);
    console.log(`   Problem: ${contest.rows[0].problem_name}`);
    console.log(`   Slug: ${contest.rows[0].contest_slug}`);
    console.log(`   URL: ${contest.rows[0].contest_url}`);
    console.log(`   Start: ${contest.rows[0].start_time}`);
    console.log(`   End: ${contest.rows[0].end_time}`);
    
    console.log('\n🎉 Demo contest created successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Visit http://localhost:3000');
    console.log('   3. See the contest status banner above the dashboard');
    console.log('   4. Contest will show as LIVE if current time is between 9 AM - 11:59 PM IST');

  } catch (error) {
    console.error('❌ Error creating demo contest:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createDemoContest();
