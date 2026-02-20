/**
 * Admin Service
 * Handles reinstatements, audit trails, and admin operations
 */

import prisma from '../prisma';

/**
 * Reinstate an eliminated user
 */
export async function reinstateUser(adminUserId, targetUserId, reason) {
  // Validate admin
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId }
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }

  // Get target user
  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status !== 'eliminated' && !user.is_eliminated) {
    throw new Error('User is not eliminated');
  }

  // Transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Update user status
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: 'active',
        is_eliminated: false,
        eliminated_on: null,
        consecutive_miss: 0
        // Note: strike_count is NOT reset, serves as historical record
      }
    });

    // Update elimination log
    await tx.eliminationLog.update({
      where: { user_id: targetUserId },
      data: {
        reinstated: true,
        reinstated_by: adminUserId,
        reinstated_at: new Date(),
        reinstate_reason: reason
      }
    });

    // Create audit log
    await tx.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'REINSTATE_USER',
        target_type: 'User',
        target_id: targetUserId.toString(),
        old_value: JSON.stringify({ status: 'eliminated', is_eliminated: true }),
        new_value: JSON.stringify({ status: 'active', is_eliminated: false }),
        notes: reason
      }
    });
  });

  return { success: true, userId: targetUserId };
}

/**
 * Override a user's strike
 */
export async function revertStrike(adminUserId, userId, dayNumber, reason) {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId }
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.$transaction(async (tx) => {
    // Find and update strike log
    const strike = await tx.strikeLog.findUnique({
      where: {
        unique_strike_user_day: {
          user_id: userId,
          day_number: dayNumber
        }
      }
    });

    if (!strike) {
      throw new Error('Strike not found');
    }

    await tx.strikeLog.update({
      where: { id: strike.id },
      data: { reverted: true }
    });

    // Update user strike count
    await tx.user.update({
      where: { id: userId },
      data: {
        strike_count: { decrement: 1 },
        consecutive_miss: { decrement: 1 }
      }
    });

    // Audit log
    await tx.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'REVERT_STRIKE',
        target_type: 'StrikeLog',
        target_id: strike.id.toString(),
        old_value: JSON.stringify({ reverted: false }),
        new_value: JSON.stringify({ reverted: true }),
        notes: reason
      }
    });
  });

  return { success: true };
}

/**
 * Get admin audit trail with filtering and search
 */
export async function getAuditLogs(options = {}) {
  const { 
    page = 1, 
    limit = 50, 
    adminId, 
    action,
    startDate,
    endDate,
    searchText
  } = options;

  const where = {};
  
  // Filter by admin user
  if (adminId) {
    where.admin_user_id = adminId;
  }
  
  // Filter by action type
  if (action) {
    where.action = action;
  }
  
  // Filter by date range
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate);
  }
  
  // Text search on reason field
  if (searchText && searchText.trim().length > 0) {
    where.OR = [
      { reason: { contains: searchText, mode: 'insensitive' } }
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.adminAuditLog.count({ where })
  ]);

  return { 
    logs, 
    total, 
    page, 
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get all eliminated users (with reinstatement status)
 * Limited to 50 most recent eliminations for dashboard
 */
export async function getEliminatedUsers(limit = 50) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { status: 'eliminated' },
        { is_eliminated: true }
      ]
    },
    include: {
      elimination_log: {
        select: {
          id: true,
          final_score: true,
          total_strikes: true,
          last_day_played: true,
          reinstated: true,
          reinstated_by: true,
          reinstated_at: true,
          reinstate_reason: true
        }
      }
    },
    orderBy: { eliminated_on: 'desc' },
    take: limit
  });

  return users;
}

/**
 * Manually trigger strike processing for a day (admin only)
 */
export async function manualProcessDay(adminUserId, dayNumber) {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId }
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Import here to avoid circular dependencies
  const { processStrikes } = await import('./strike.processor');

  const result = await processStrikes(dayNumber);

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_user_id: adminUserId,
      action: 'MANUAL_PROCESS_DAY',
      target_type: 'Contest',
      target_id: dayNumber.toString(),
      new_value: JSON.stringify(result),
      notes: `Manually triggered processing for day ${dayNumber}`
    }
  });

  return result;
}

/**
 * Get contestant statistics for admin dashboard
 */
export async function getContestStats() {
  const [
    totalUsers,
    activeUsers,
    eliminatedUsers,
    processedDays,
    pendingEmails
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'active', is_eliminated: false } }),
    prisma.user.count({ where: { is_eliminated: true } }),
    prisma.contest.count({ where: { is_processed: true } }),
    prisma.emailQueue.count({ where: { status: 'pending' } })
  ]);

  const survivalRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0;

  return {
    totalUsers,
    activeUsers,
    eliminatedUsers,
    survivalRate,
    processedDays,
    pendingEmails
  };
}

/**
 * Get recent audit logs for dashboard
 */
export async function getRecentAuditLogs(limit = 10) {
  const logs = await prisma.adminAuditLog.findMany({
    take: limit,
    orderBy: { created_at: 'desc' }
  });

  return logs;
}

const adminService = {
  reinstateUser,
  revertStrike,
  getAuditLogs,
  getEliminatedUsers,
  manualProcessDay,
  getContestStats,
  getRecentAuditLogs
};

export default adminService;
