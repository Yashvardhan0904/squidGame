/**
 * CSV Export Service
 * Handles exporting data to CSV format
 */

import prisma from '../prisma';
import { stringify } from 'csv-stringify/sync';

/**
 * Export all users to CSV
 */
export async function exportAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    include: {
      daily_scores: {
        orderBy: { day_number: 'asc' }
      }
    }
  });

  // Prepare CSV data
  const records = users.map(user => ({
    id: user.id,
    name: user.name || '',
    hackerrank_id: user.hackerrank_id || '',
    enroll_no: user.enroll_no || '',
    email: user.email || '',
    batch: user.batch || '',
    year: user.year || '',
    status: user.status,
    strike_count: user.strike_count,
    consecutive_miss: user.consecutive_miss,
    total_score: user.total_score,
    is_eliminated: user.is_eliminated,
    eliminated_on: user.eliminated_on ? user.eliminated_on.toISOString() : '',
    joined_day: user.joined_day || '',
    created_at: user.created_at.toISOString()
  }));

  // Generate CSV
  const csv = stringify(records, {
    header: true,
    quoted: true,
    quoted_empty: true
  });

  return csv;
}

/**
 * Export eliminated users to CSV
 */
export async function exportEliminatedUsers() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { status: 'eliminated' },
        { is_eliminated: true }
      ]
    },
    orderBy: { eliminated_on: 'desc' },
    include: {
      elimination_log: true,
      daily_scores: {
        orderBy: { day_number: 'asc' }
      }
    }
  });

  // Prepare CSV data
  const records = users.map(user => ({
    id: user.id,
    name: user.name || '',
    hackerrank_id: user.hackerrank_id || '',
    email: user.email || '',
    final_score: user.elimination_log?.final_score || user.total_score,
    total_strikes: user.elimination_log?.total_strikes || user.strike_count,
    last_day_played: user.elimination_log?.last_day_played || '',
    eliminated_at: user.elimination_log?.eliminated_at?.toISOString() || user.eliminated_on?.toISOString() || '',
    reinstated: user.elimination_log?.reinstated || false,
    reinstate_reason: user.elimination_log?.reinstate_reason || ''
  }));

  // Generate CSV
  const csv = stringify(records, {
    header: true,
    quoted: true,
    quoted_empty: true
  });

  return csv;
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(options = {}) {
  const { adminId, action, startDate, endDate } = options;

  const where = {};
  if (adminId) where.admin_user_id = adminId;
  if (action) where.action = action;
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate);
  }

  const logs = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { created_at: 'desc' }
  });

  // Prepare CSV data
  const records = logs.map(log => ({
    id: log.id,
    admin_user_id: log.admin_user_id,
    action: log.action,
    target_type: log.target_type || '',
    target_id: log.target_id || '',
    old_value: log.old_value ? JSON.stringify(log.old_value) : '',
    new_value: log.new_value ? JSON.stringify(log.new_value) : '',
    reason: log.reason || '',
    ip_address: log.ip_address || '',
    created_at: log.created_at.toISOString()
  }));

  // Generate CSV
  const csv = stringify(records, {
    header: true,
    quoted: true,
    quoted_empty: true,
    escape: '"'
  });

  return csv;
}

const exportService = {
  exportAllUsers,
  exportEliminatedUsers,
  exportAuditLogs
};

export default exportService;
