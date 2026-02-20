/**
 * Reset Database - Keep Admin Accounts
 * Clears all data except admin accounts
 */

const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use the existing prisma instance
const prisma = require('../src/lib/prisma').default;

async function resetDatabase(newAdminPassword) {
  try {
    console.log('🗑️  Starting database reset (keeping admin accounts)...\n');

    // Delete all data in order (respecting foreign key constraints)
    console.log('Deleting email queue...');
    await prisma.emailQueue.deleteMany({});

    console.log('Deleting strike logs...');
    await prisma.strikeLog.deleteMany({});

    console.log('Deleting scraped results...');
    await prisma.scrapedResult.deleteMany({});

    console.log('Deleting daily scores...');
    await prisma.dailyScore.deleteMany({});

    console.log('Deleting elimination logs...');
    await prisma.eliminationLog.deleteMany({});

    console.log('Deleting contests...');
    await prisma.contest.deleteMany({});

    console.log('Deleting users...');
    await prisma.user.deleteMany({});

    console.log('Deleting admin audit logs...');
    await prisma.adminAuditLog.deleteMany({});

    console.log('Deleting cron locks...');
    await prisma.cronLock.deleteMany({});

    console.log('\n✅ All data cleared (admin accounts preserved)\n');

    // Update admin password if provided
    if (newAdminPassword) {
      console.log('🔐 Updating admin password...');
      
      const hashedPassword = await bcrypt.hash(newAdminPassword, 10);
      
      const result = await prisma.account.updateMany({
        where: { role: 'ADMIN' },
        data: { password_hash: hashedPassword }
      });

      console.log(`✅ Updated password for ${result.count} admin account(s)\n`);
    }

    // Show remaining admin accounts
    const admins = await prisma.account.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true }
    });

    console.log('👤 Admin accounts:');
    admins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name})`);
    });

    console.log('\n✨ Database reset complete!');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get password from command line argument
const newPassword = process.argv[2];

if (!newPassword) {
  console.error('❌ Error: Please provide a new admin password');
  console.log('\nUsage: node scripts/reset-db-keep-admin.js <new-password>');
  console.log('Example: node scripts/reset-db-keep-admin.js MyNewPassword123');
  process.exit(1);
}

resetDatabase(newPassword);
