/**
 * Email Queue Management Service
 * View, filter, retry, preview, and delete emails in the queue
 */

import prisma from '../prisma';

/**
 * Get email queue with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Filter by status (pending, sent, failed)
 * @param {string} [filters.template_type] - Filter by template type
 * @param {number} [filters.user_id] - Filter by user ID
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=50] - Items per page
 * @returns {Promise<Object>} Paginated email queue
 */
export async function getEmailQueue(filters = {}) {
  const {
    status,
    template_type,
    user_id,
    page = 1,
    limit = 50
  } = filters;

  // Build where clause
  const where = {};
  if (status) where.status = status;
  if (template_type) where.template_type = template_type;
  if (user_id) where.user_id = parseInt(user_id);

  // Get emails with pagination
  const [emails, total] = await Promise.all([
    prisma.emailQueue.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hackerrank_id: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.emailQueue.count({ where })
  ]);

  return {
    emails,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Retry a failed email
 * Resets status to 'pending', clears error, and schedules for immediate sending
 * @param {number} emailId - Email queue ID
 * @returns {Promise<Object>} Updated email
 * @throws {Error} If email not found
 */
export async function retryEmail(emailId) {
  // Check if email exists
  const email = await prisma.emailQueue.findUnique({
    where: { id: emailId }
  });

  if (!email) {
    throw new Error(`Email ${emailId} not found`);
  }

  // Update email to retry
  const updated = await prisma.emailQueue.update({
    where: { id: emailId },
    data: {
      status: 'pending',
      scheduled_for: new Date(),
      last_error: null,
      last_attempt_at: null
    }
  });

  return updated;
}

/**
 * Preview an email without sending
 * Renders the email template with template_data
 * @param {number} emailId - Email queue ID
 * @returns {Promise<string>} Rendered HTML content
 * @throws {Error} If email not found
 */
export async function previewEmail(emailId) {
  // Get email
  const email = await prisma.emailQueue.findUnique({
    where: { id: emailId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          hackerrank_id: true
        }
      }
    }
  });

  if (!email) {
    throw new Error(`Email ${emailId} not found`);
  }

  // Render template (simple HTML rendering)
  const data = email.template_data || {};
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${email.subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { padding: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${email.subject}</h2>
      </div>
      <div class="content">
        <p>Hi ${data.name || email.user.name},</p>
  `;

  // Template-specific content
  if (email.template_type.startsWith('strike_')) {
    html += `
        <div class="highlight">
          <p><strong>Strike ${data.strikeNumber} issued for Day ${data.dayNumber}</strong></p>
          <p>Remaining strikes before elimination: ${data.remainingStrikes}</p>
        </div>
        <p>You missed the daily challenge. Please ensure you participate in upcoming challenges to avoid elimination.</p>
    `;
  } else if (email.template_type === 'elimination') {
    html += `
        <div class="highlight">
          <p><strong>You have been eliminated from the competition</strong></p>
          <p>Final Score: ${data.finalScore}</p>
          <p>Eliminated on Day: ${data.dayNumber}</p>
        </div>
        <p>Thank you for participating in ACM Squid Game!</p>
    `;
  } else {
    html += `
        <p>Template Type: ${email.template_type}</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
  }

  html += `
      </div>
      <div class="footer">
        <p>ACM Squid Game - 25 Day DSA Challenge</p>
        <p>HackerRank ID: ${data.hackerrank_id || email.user.hackerrank_id}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Delete an email from the queue
 * @param {number} emailId - Email queue ID
 * @returns {Promise<Object>} Deleted email
 * @throws {Error} If email not found
 */
export async function deleteEmail(emailId) {
  // Check if email exists
  const email = await prisma.emailQueue.findUnique({
    where: { id: emailId }
  });

  if (!email) {
    throw new Error(`Email ${emailId} not found`);
  }

  // Delete email
  const deleted = await prisma.emailQueue.delete({
    where: { id: emailId }
  });

  return deleted;
}

const emailQueueService = {
  getEmailQueue,
  retryEmail,
  previewEmail,
  deleteEmail
};

export default emailQueueService;
