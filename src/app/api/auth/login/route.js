import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../../../../lib/prisma';
import { validateEnvironmentConfig } from '../../../../lib/config';

function generateCorrelationId() {
  return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapLoginError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') {
      return { status: 500, error: 'Auth database schema is not ready (accounts table missing)' };
    }
    return { status: 500, error: 'Auth database request failed' };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, error: 'Auth database is unavailable' };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { status: 500, error: 'Auth database engine failed' };
  }

  if (typeof error?.message === 'string' && error.message.includes('secretOrPrivateKey')) {
    return { status: 500, error: 'Server authentication is misconfigured (JWT secret)' };
  }

  return { status: 500, error: 'Internal server error' };
}

export async function POST(request) {
  try {
    const config = validateEnvironmentConfig();
    if (!config.isValid) {
      console.error('[Auth][Login] Environment validation failed:', config.error);
      return NextResponse.json({ error: 'Server authentication is misconfigured' }, { status: 500 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });

    if (!account || !account.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, account.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    const correlationId = generateCorrelationId();
    const mapped = mapLoginError(error);
    console.error(`[Auth][Login][${correlationId}]`, error);
    return NextResponse.json({ error: mapped.error, correlationId }, { status: mapped.status });
  }
}
