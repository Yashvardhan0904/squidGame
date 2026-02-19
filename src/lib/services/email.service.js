/**
 * Email Service
 * Queue-based email sending with retry logic
 */

import prisma from '../prisma';

/**
 * Queue a strike email (idempotent)
 */
export async function queueStrikeEmail(tx, user, strikeNumber, dayNumber) {
  const idempotencyKey = `strike:${user.id}:day${dayNumber}`;

  const templateType = `strike_${strikeNumber}`;
  const subject = strikeNumber >= 3
    ? `🚨 FINAL STRIKE - ACM Squid Game`
    : `⚠️ Strike ${strikeNumber} - ACM Squid Game`;

  try {
    await tx.emailQueue.create({
      data: {
        user_id: user.id,
        to_email: user.email,
        template_type: templateType,
        subject: subject,
        template_data: {
          name: user.name,
          strikeNumber: strikeNumber,
          dayNumber: dayNumber,
          remainingStrikes: Math.max(0, 3 - strikeNumber),
          hackerrank_id: user.hackerrank_id
        },
        idempotency_key: idempotencyKey
      }
    });
  } catch (error) {
    // Ignore duplicate key errors (idempotency working)
    if (!error.message.includes('Unique constraint')) {
      throw error;
    }
  }
}

/**
 * Queue an elimination email (idempotent)
 */
export async function queueEliminationEmail(tx, user, dayNumber) {
  const idempotencyKey = `elimination:${user.id}`;

  try {
    await tx.emailQueue.create({
      data: {
        user_id: user.id,
        to_email: user.email,
        template_type: 'elimination',
        subject: '❌ ELIMINATED - ACM Squid Game',
        template_data: {
          name: user.name,
          dayNumber: dayNumber,
          finalScore: user.total_score,
          hackerrank_id: user.hackerrank_id
        },
        idempotency_key: idempotencyKey
      }
    });
  } catch (error) {
    if (!error.message.includes('Unique constraint')) {
      throw error;
    }
  }
}

/**
 * Process pending emails (call from cron every minute)
 */
export async function processPendingEmails() {
  const BATCH_SIZE = 50;
  const RETRY_DELAYS = [1, 5, 15]; // minutes

  // Get pending emails
  const emails = await prisma.emailQueue.findMany({
    where: {
      status: 'pending',
      scheduled_for: { lte: new Date() },
      attempts: { lt: 3 }
    },
    orderBy: { scheduled_for: 'asc' },
    take: BATCH_SIZE
  });

  if (emails.length === 0) {
    return { processed: 0 };
  }

  let sent = 0, failed = 0;

  for (const email of emails) {
    try {
      await sendEmail(email);
      sent++;
    } catch (error) {
      await handleSendFailure(email, error, RETRY_DELAYS);
      failed++;
    }
  }

  return { processed: emails.length, sent, failed };
}

/**
 * Send a single email via Resend
 */
async function sendEmail(email) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = renderTemplate(email.template_type, email.template_data);

  console.log(`[Email] Sending ${email.template_type} to ${email.to_email}`);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ACM Squid Game <onboarding@resend.dev>',
    to: email.to_email,
    subject: email.subject,
    html: html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  console.log(`[Email] Sent successfully: ${data.id}`);

  // Mark as sent
  await prisma.emailQueue.update({
    where: { id: email.id },
    data: {
      status: 'sent',
      sent_at: new Date(),
      attempts: { increment: 1 },
      last_attempt_at: new Date()
    }
  });
}

/**
 * Handle send failure with retry
 */
async function handleSendFailure(email, error, retryDelays) {
  const newAttempts = email.attempts + 1;
  const shouldRetry = newAttempts < email.max_attempts;

  let nextSchedule = null;
  if (shouldRetry) {
    const delayMinutes = retryDelays[Math.min(newAttempts - 1, retryDelays.length - 1)];
    nextSchedule = new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  await prisma.emailQueue.update({
    where: { id: email.id },
    data: {
      status: shouldRetry ? 'pending' : 'failed',
      attempts: newAttempts,
      last_attempt_at: new Date(),
      last_error: error.message,
      scheduled_for: nextSchedule || undefined
    }
  });

  console.error(`[Email] Failed to send ${email.id}:`, error.message);
}

/**
 * Render email template
 */
function renderTemplate(templateType, data) {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;

  const templates = {
    strike_1: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; border-radius: 12px; padding: 40px;">
          <h1 style="color: #ff6b6b; margin: 0 0 20px;">⚠️ First Strike Warning</h1>
          <p style="color: #ccc; font-size: 16px;">Hi <strong>${parsed.name}</strong>,</p>
          <p style="color: #ccc; font-size: 16px;">You missed Day <strong>${parsed.dayNumber}</strong>'s challenge on ACM Squid Game.</p>
          <div style="background: #1a1a1a; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0;">
            <p style="color: #ff6b6b; font-size: 20px; margin: 0;">Strike 1 of 3</p>
            <p style="color: #888; margin: 5px 0 0;">You have <strong>2 more chances</strong> before elimination.</p>
          </div>
          <p style="color: #ff2e88;">Stay in the game! Complete today's challenge to reset your streak.</p>
          <a href="https://www.hackerrank.com/contests" style="display: inline-block; background: #ff2e88; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Go to HackerRank</a>
        </div>
      </body>
      </html>
    `,

    strike_2: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #ff6b6b; border-radius: 12px; padding: 40px;">
          <h1 style="color: #ff2e88; margin: 0 0 20px;">⚠️⚠️ Second Strike Warning</h1>
          <p style="color: #ccc; font-size: 16px;">Hi <strong>${parsed.name}</strong>,</p>
          <p style="color: #ccc; font-size: 16px;">You missed Day <strong>${parsed.dayNumber}</strong>'s challenge.</p>
          <div style="background: #2a0a0a; border: 2px solid #ff2e88; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #ff2e88; font-size: 28px; margin: 0; font-weight: bold;">⚠️ DANGER ZONE</p>
            <p style="color: #ff6b6b; font-size: 18px; margin: 10px 0 0;">ONE MORE MISS = ELIMINATION!</p>
          </div>
          <p style="color: #ff6b6b;">This is your <strong>2nd consecutive strike</strong>. Don't let it end here!</p>
          <a href="https://www.hackerrank.com/contests" style="display: inline-block; background: #ff2e88; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">SOLVE NOW</a>
        </div>
      </body>
      </html>
    `,

    strike_3: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #200; border: 2px solid #ff2e88; border-radius: 12px; padding: 40px;">
          <h1 style="color: #ff2e88; margin: 0 0 20px;">🚨 FINAL STRIKE</h1>
          <p style="color: #ccc; font-size: 16px;">Hi <strong>${parsed.name}</strong>,</p>
          <p style="color: #ff6b6b; font-size: 18px;">You missed Day <strong>${parsed.dayNumber}</strong>'s challenge.</p>
          <div style="background: #000; border: 3px solid #ff0000; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #ff0000; font-size: 24px; margin: 0;">STRIKE 3</p>
            <p style="color: #ff6b6b; margin: 10px 0 0;">You are now pending elimination...</p>
          </div>
        </div>
      </body>
      </html>
    `,

    elimination: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 3px solid #ff2e88; border-radius: 12px; padding: 40px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">💀</div>
          <h1 style="color: #ff2e88; margin: 0 0 20px; font-size: 36px;">ELIMINATED</h1>
          <p style="color: #ccc; font-size: 18px;">Hi <strong>${parsed.name}</strong>,</p>
          <p style="color: #888; font-size: 16px;">You have been eliminated from ACM Squid Game after 3 consecutive misses.</p>
          <div style="background: #111; padding: 20px; margin: 30px 0; border-radius: 8px;">
            <p style="color: #888; margin: 0;">Final Score</p>
            <p style="color: #ff2e88; font-size: 36px; margin: 5px 0; font-weight: bold;">${parsed.finalScore}</p>
            <p style="color: #666; margin: 0;">Day Eliminated: ${parsed.dayNumber}</p>
          </div>
          <p style="color: #666;">Better luck next time! 🎮</p>
        </div>
      </body>
      </html>
    `
  };

  return templates[templateType] || `<p>Template not found: ${templateType}</p>`;
}

function htmlToText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const emailService = {
  queueStrikeEmail,
  queueEliminationEmail,
  processPendingEmails,
  renderTemplate
};

export default emailService;
