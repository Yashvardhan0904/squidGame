/**
 * Bulk Reinstatement Service
 * Handles bulk reinstatement of eliminated users with atomic transactions
 */

import prisma from '../prisma';

/**
 * Bulk reinstate multiple users atomically
 * All users must be reinstated successfully or entire operation rolls back
 */
export async function bulkReinstateUsers(adminUserId, userIds, reason) {
  // Validate inputs
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds must be a non-empty array');
  }

  if (!reason || typeof reason !== 'string') {
    throw new Error('reason is required');
  }

  // Validate admin exists
  const admin = await prisma.account.findUnique({
    where: { id: adminUserId }
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }

  // Use transaction for atomicity - all or nothing
  const result = await prisma.$transaction(async (tx) => {
    const reinstatedUsers = [];
    const errors = [];

    // Validate all users first
    for (const userId of userIds) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          elimination_log: true
        }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      if (user.status !== 'eliminated' && !user.is_eliminated) {
        throw new Error(`User ${userId} (${user.name}) is not eliminated`);
      }

      if (!user.elimination_log) {
        throw new Error(`User ${userId} (${user.name}) has no elimination record`);
      }
    }

    // All validations passed, proceed with reinstatements
    for (const userId of userIds) {
      // Get user details for response
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          hackerrank_id: true
        }
      });

      // Update user status
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'active',
          is_eliminated: false,
          eliminated_on: null,
          consecutive_miss: 0
          // Note: strike_count is NOT reset (historical record)
        }
      });

      // Update elimination log
      await tx.eliminationLog.update({
        where: { user_id: userId },
        data: {
          reinstated: true,
          reinstated_by: adminUserId,
          reinstated_at: new Date(),
          reinstate_reason: reason
        }
      });

      reinstatedUsers.push({
        userId,
        name: user.name,
        hackerrank_id: user.hackerrank_id
      });
    }

    // Create single audit log for bulk operation
    await tx.adminAuditLog.create({
      data: {
        admin_user_id: adminUserId,
        action: 'BULK_REINSTATE_USERS',
        target_type: 'User',
        target_id: null,
        old_value: null,
        new_value: {
          userIds,
          count: userIds.length,
          users: reinstatedUsers
        },
        reason: reason
      }
    });

    return {
      success: true,
      count: reinstatedUsers.length,
      users: reinstatedUsers
    };
  });

  return result;
}

const bulkReinstateService = {
  bulkReinstateUsers
};

export default bulkReinstateService;
