import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/prisma';

export async function POST(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { enroll_no, hackerrank_id } = await request.json();

        if (!enroll_no || !String(enroll_no).trim()) {
            return NextResponse.json({ error: 'Enrollment number is required' }, { status: 400 });
        }

        if (!hackerrank_id || !String(hackerrank_id).trim()) {
            return NextResponse.json({ error: 'HackerRank ID is required' }, { status: 400 });
        }

        const normalizedEnrollment = String(enroll_no).trim().toUpperCase();
        const normalizedHackerrankId = String(hackerrank_id).trim().toLowerCase();

        const existingHrClaim = await prisma.account.findFirst({
            where: {
                hackerrank_id: normalizedHackerrankId,
                NOT: { id: decoded.accountId },
            },
        });

        if (existingHrClaim) {
            return NextResponse.json(
                { error: 'This HackerRank ID is already linked to another account.' },
                { status: 409 }
            );
        }

        const conflictingEnrollmentOwner = await prisma.user.findFirst({
            where: {
                enroll_no: normalizedEnrollment,
                NOT: { hackerrank_id: normalizedHackerrankId },
            },
            select: { id: true },
        });

        if (conflictingEnrollmentOwner) {
            return NextResponse.json(
                { error: 'This enrollment number is already assigned to another user.' },
                { status: 409 }
            );
        }

        // Persist account + user profile atomically.
        const account = await prisma.$transaction(async (tx) => {
            const updatedAccount = await tx.account.update({
                where: { id: decoded.accountId },
                data: {
                    hackerrank_id: normalizedHackerrankId,
                },
            });

            await tx.user.upsert({
                where: { hackerrank_id: normalizedHackerrankId },
                update: {
                    enroll_no: normalizedEnrollment,
                    email: updatedAccount.email,
                    name: updatedAccount.name,
                },
                create: {
                    name: updatedAccount.name,
                    hackerrank_id: normalizedHackerrankId,
                    enroll_no: normalizedEnrollment,
                    email: updatedAccount.email,
                },
            });

            return updatedAccount;
        });

        // Re-issue JWT with updated profile details.
        const newToken = jwt.sign(
            {
                accountId: account.id,
                email: account.email,
                name: account.name,
                role: account.role,
                avatar_url: account.avatar_url,
                hackerrank_id: normalizedHackerrankId,
                enroll_no: normalizedEnrollment,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const response = NextResponse.json({
            message: 'Enrollment number linked successfully',
            user: {
                id: account.id,
                email: account.email,
                name: account.name,
                role: account.role,
                avatar_url: account.avatar_url,
                hackerrank_id: normalizedHackerrankId,
                enroll_no: normalizedEnrollment,
            },
        });

        response.cookies.set('auth_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Link HackerRank error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
