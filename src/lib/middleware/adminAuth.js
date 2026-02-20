/**
 * Admin Authorization Middleware
 * Centralized admin authentication and authorization validation
 * 
 * Usage in API routes:
 * import { requireAdmin } from '@/lib/middleware/adminAuth';
 * 
 * export async function POST(request) {
 *   const admin = await requireAdmin(request);
 *   if (!admin) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // ... admin logic
 * }
 */

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

/**
 * Verify admin credentials and return admin user object
 * @param {Request} request - Next.js request object
 * @returns {Promise<AdminUser|null>} Admin user object or null if unauthorized
 */
export async function requireAdmin(request) {
  try {
    // Extract JWT token from cookies
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('auth_token');
    
    if (!tokenCookie?.value) {
      return null;
    }
    
    // Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    } catch (error) {
      // Invalid token signature or expired
      return null;
    }
    
    // Query Account table to verify user exists and has ADMIN role
    const account = await prisma.account.findUnique({
      where: { id: decoded.accountId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    // Verify account exists
    if (!account) {
      return null;
    }
    
    // Verify role is ADMIN
    if (account.role !== 'ADMIN') {
      return null;
    }
    
    // Return admin user object
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role
    };
    
  } catch (error) {
    console.error('[AdminAuth] Error:', error);
    return null;
  }
}

/**
 * Get admin user with detailed error information
 * Useful for returning specific error codes (401 vs 403)
 * @param {Request} request - Next.js request object
 * @returns {Promise<{admin: AdminUser|null, error: string|null, statusCode: number|null}>}
 */
export async function getAdminWithError(request) {
  try {
    // Extract JWT token from cookies
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('auth_token');
    
    if (!tokenCookie?.value) {
      return {
        admin: null,
        error: 'Missing authentication token',
        statusCode: 401
      };
    }
    
    // Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    } catch (error) {
      return {
        admin: null,
        error: 'Invalid or expired token',
        statusCode: 401
      };
    }
    
    // Query Account table
    const account = await prisma.account.findUnique({
      where: { id: decoded.accountId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    // Verify account exists
    if (!account) {
      return {
        admin: null,
        error: 'Account not found',
        statusCode: 401
      };
    }
    
    // Verify role is ADMIN
    if (account.role !== 'ADMIN') {
      return {
        admin: null,
        error: 'Forbidden: Admin access required',
        statusCode: 403
      };
    }
    
    // Success
    return {
      admin: {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role
      },
      error: null,
      statusCode: null
    };
    
  } catch (error) {
    console.error('[AdminAuth] Error:', error);
    return {
      admin: null,
      error: 'Internal server error',
      statusCode: 500
    };
  }
}

/**
 * @typedef {Object} AdminUser
 * @property {number} id - Admin user ID
 * @property {string} email - Admin email
 * @property {string} name - Admin name
 * @property {string} role - Admin role (always 'ADMIN')
 */
