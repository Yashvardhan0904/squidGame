import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../../../../lib/prisma';
import { validateEnvironmentConfig } from '../../../../lib/config';

function generateCorrelationId() {
  return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapRegisterError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') {
      return { status: 500, error: 'Auth database schema is not ready (accounts table missing)' };
    }
    return { status: 500, error: 'Auth database request failed' };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, error: 'Auth database is unavailable' };
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
      console.error('[Auth][Register] Environment validation failed:', config.error);
      return NextResponse.json({ error: 'Server authentication is misconfigured' }, { status: 500 });
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const account = await prisma.account.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        role: 'USER',
        provider: 'EMAIL',
      },
    });

    const token = jwt.sign(
      { accountId: account.id, email: account.email, name: account.name, role: account.role, avatar_url: null, hackerrank_id: null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      message: 'Account created',
      user: { id: account.id, email: account.email, name: account.name, role: account.role },
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
    const correlationId = generateCorrelationId();
    const mapped = mapRegisterError(error);
    console.error(`[Auth][Register][${correlationId}]`, error);
    return NextResponse.json({ error: mapped.error, correlationId }, { status: mapped.status });
  }
}
