import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh account data (may have been updated after JWT was issued).
    const account = await prisma.account.findUnique({
      where: { id: decoded.accountId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar_url: true,
        hackerrank_id: true,
        enroll_no: true,
      },
    });

    if (!account) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        avatar_url: account.avatar_url,
        hackerrank_id: account.hackerrank_id,
        enroll_no: account.enroll_no,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
