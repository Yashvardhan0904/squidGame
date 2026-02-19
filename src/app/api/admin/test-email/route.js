/**
 * Test Email Endpoint
 * POST /api/admin/test-email
 * Body: { email: "target@example.com" } (optional, defaults to your own)
 */

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

export async function POST(request) {
    try {
        // Auth check - admin only
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }

        // Get target email
        let targetEmail;
        try {
            const body = await request.json();
            targetEmail = body.email || decoded.email;
        } catch {
            targetEmail = decoded.email;
        }

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: 'RESEND_API_KEY not set in .env' }, { status: 500 });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        // Send a test strike email
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'ACM Squid Game <onboarding@resend.dev>',
            to: targetEmail,
            subject: '🧪 Test Email - ACM Squid Game',
            html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; border-radius: 12px; padding: 40px;">
            <h1 style="color: #ff2e88; margin: 0 0 20px;">✅ Email System Working!</h1>
            <p style="color: #ccc; font-size: 16px;">Hi <strong>${decoded.name}</strong>,</p>
            <p style="color: #ccc; font-size: 16px;">This is a test email from ACM Squid Game. If you're reading this, the email system is configured correctly!</p>
            <div style="background: #1a1a1a; border-left: 4px solid #00ff88; padding: 15px; margin: 20px 0;">
              <p style="color: #00ff88; font-size: 18px; margin: 0;">🎮 System Status: ONLINE</p>
              <p style="color: #888; margin: 5px 0 0;">Strike notifications will be sent from this address.</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        </body>
        </html>
      `,
        });

        if (error) {
            return NextResponse.json({ error: `Resend error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Test email sent to ${targetEmail}`,
            emailId: data.id,
        });

    } catch (error) {
        console.error('[TestEmail] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
