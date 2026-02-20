/**
 * Reset Database - Keep Admin Accounts (Direct SQL)
 * Clears all data except admin accounts using raw SQL
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetDatabase(newAdminPassword) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🗑️  Starting database reset (keeping admin accounts)...\n');

    // Delete all data in order (respecting foreign key constraints)
    console.log('Deleting email queue...');
    await pool.query('DELETE FROM email_queue');

    console.log('Deleting strike logs...');
    await pool.query('DELETE FROM strike_logs');

    console.log('Deleting scraped results...');
    await pool.query('DELETE FROM scraped_results');

    console.log('Deleting daily scores...');
    await pool.query('DELETE FROM daily_scores');

    console.log('Deleting elimination logs...');
    await pool.query('DELETE FROM elimination_logs');

    console.log('Deleting contests...');
    await pool.query('DELETE FROM contests');

    console.log('Deleting users...');
    await pool.query('DELETE FROM users');

    console.log('Deleting admin audit logs...');
    await pool.query('DELETE FROM admin_audit_log');

    console.log('Deleting cron locks...');
    await pool.query('DELETE FROM cron_locks');

    console.log('\n✅ All data cleared (admin accounts preserved)\n');

    // Update admin password if provided
    if (newAdminPassword) {
      console.log('🔐 Updating admin password...');
      
      const hashedPassword = await bcrypt.hash(newAdminPassword, 10);
      
      const result = await pool.query(
        "UPDATE accounts SET password_hash = $1 WHERE role = 'ADMIN'",
        [hashedPassword]
      );

      console.log(`✅ Updated password for ${result.rowCount} admin account(s)\n`);
    }

    // Show remaining admin accounts
    const admins = await pool.query(
      "SELECT id, email, name, role FROM accounts WHERE role = 'ADMIN'"
    );

    console.log('👤 Admin accounts:');
    admins.rows.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name})`);
    });

    console.log('\n✨ Database reset complete!');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get password from command line argument
const newPassword = process.argv[2];

if (!newPassword) {
  console.error('❌ Error: Please provide a new admin password');
  console.log('\nUsage: node scripts/reset-db-sql.js <new-password>');
  console.log('Example: node scripts/reset-db-sql.js MyNewPassword123');
  process.exit(1);
}

resetDatabase(newPassword);
