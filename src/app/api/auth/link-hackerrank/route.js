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
        const { hackerrank_id } = await request.json();

        if (!hackerrank_id || !hackerrank_id.trim()) {
            return NextResponse.json({ error: 'HackerRank ID is required' }, { status: 400 });
        }

        const hrId = hackerrank_id.trim().toLowerCase();

        // Check if this HackerRank ID exists in the competition users table
        const competitionUser = await prisma.user.findUnique({
            where: { hackerrank_id: hrId },
        });

        if (!competitionUser) {
            return NextResponse.json(
                { error: 'This HackerRank ID is not registered in the competition. Please check your ID.' },
                { status: 404 }
            );
        }

        // Check if another account already claimed this HackerRank ID
        const existingClaim = await prisma.account.findUnique({
            where: { hackerrank_id: hrId },
        });

        if (existingClaim && existingClaim.id !== decoded.accountId) {
            return NextResponse.json(
                { error: 'This HackerRank ID is already linked to another account.' },
                { status: 409 }
            );
        }

        // Link the HackerRank ID to the account
        const account = await prisma.account.update({
            where: { id: decoded.accountId },
            data: { hackerrank_id: hrId },
        });

        // Sync the verified email to the competition user
        await prisma.user.update({
            where: { hackerrank_id: hrId },
            data: { email: account.email },
        });

        // Re-issue JWT with hackerrank_id
        const newToken = jwt.sign(
            {
                accountId: account.id,
                email: account.email,
                name: account.name,
                role: account.role,
                avatar_url: account.avatar_url,
                hackerrank_id: hrId,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const response = NextResponse.json({
            message: 'HackerRank ID linked successfully',
            user: {
                id: account.id,
                email: account.email,
                name: account.name,
                role: account.role,
                avatar_url: account.avatar_url,
                hackerrank_id: hrId,
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
