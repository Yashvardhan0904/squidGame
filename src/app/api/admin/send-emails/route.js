/**
 * Process Email Queue
 * POST /api/admin/send-emails
 * Processes all pending emails in the email_queue table
 */

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { processPendingEmails } from '@/lib/services/email.service';

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

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: 'RESEND_API_KEY not set in .env' }, { status: 500 });
        }

        const result = await processPendingEmails();

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (error) {
        console.error('[SendEmails] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
