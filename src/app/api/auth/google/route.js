import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';

export async function POST(request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'Google credential is required' }, { status: 400 });
    }

    // Verify the Google ID token via Google's tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const googleUser = await verifyRes.json();
    const { email, name, picture, sub: google_id } = googleUser;

    if (!email) {
      return NextResponse.json({ error: 'Could not get email from Google' }, { status: 400 });
    }

    // Find or create account
    let account = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });

    if (account) {
      // Update google info if not set
      if (!account.google_id) {
        account = await prisma.account.update({
          where: { id: account.id },
          data: { google_id, avatar_url: picture || account.avatar_url, provider: account.provider === 'EMAIL' ? 'EMAIL' : 'GOOGLE' },
        });
      }
    } else {
      // Create new account
      account = await prisma.account.create({
        data: {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          google_id,
          avatar_url: picture || null,
          role: 'USER',
          provider: 'GOOGLE',
        },
      });
    }

    const token = jwt.sign(
      { accountId: account.id, email: account.email, name: account.name, role: account.role, avatar_url: account.avatar_url, hackerrank_id: account.hackerrank_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: account.id, email: account.email, name: account.name, role: account.role, avatar_url: account.avatar_url },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
