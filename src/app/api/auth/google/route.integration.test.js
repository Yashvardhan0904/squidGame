/**
 * Integration Tests for Google OAuth Authentication
 * 
 * These tests verify the complete authentication flow from credential
 * to authenticated session, including all components working together.
 */

import { POST } from './route';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// Mock Next.js Response
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      body,
      headers: new Map(),
      cookies: {
        set: jest.fn()
      }
    }))
  }
}));

// Mock Prisma
jest.mock('../../../../lib/prisma', () => ({
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

describe('Google OAuth Authentication - Integration Tests', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key-for-integration-tests',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe('Complete Authentication Flow - New User', () => {
    test('should successfully authenticate a new Google user and create account', async () => {
      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'newuser@example.com',
          name: 'New User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-id-12345',
          email_verified: true
        })
      });

      // Mock database - no existing account
      prisma.account.findUnique.mockResolvedValue(null);
      
      // Mock account creation
      prisma.account.create.mockResolvedValue({
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        google_id: 'google-id-12345',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: null,
        created_at: new Date()
      });

      // Create mock request
      const request = {
        json: async () => ({
          credential: 'valid-google-id-token'
        })
      };

      // Execute authentication
      const response = await POST(request);

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
        avatar_url: 'https://example.com/avatar.jpg'
      });

      // Verify cookie was set
      expect(response.cookies.set).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'lax',
          maxAge: 604800,
          path: '/'
        })
      );

      // Verify Google API was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/tokeninfo?id_token=valid-google-id-token',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );

      // Verify database operations
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' }
      });
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          name: 'New User',
          google_id: 'google-id-12345',
          avatar_url: 'https://example.com/avatar.jpg',
          role: 'USER',
          provider: 'GOOGLE'
        }
      });
    });
  });

  describe('Complete Authentication Flow - Existing User', () => {
    test('should successfully authenticate existing user and link Google ID', async () => {
      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'existing@example.com',
          name: 'Existing User',
          picture: 'https://example.com/new-avatar.jpg',
          sub: 'google-id-67890',
          email_verified: true
        })
      });

      // Mock database - existing account without Google ID
      const existingAccount = {
        id: 2,
        email: 'existing@example.com',
        name: 'Existing User',
        password_hash: 'hashed-password',
        google_id: null,
        avatar_url: null,
        role: 'USER',
        provider: 'EMAIL',
        hackerrank_id: null,
        created_at: new Date()
      };

      prisma.account.findUnique
        .mockResolvedValueOnce(existingAccount) // First call in findAccountByEmail
        .mockResolvedValueOnce(existingAccount); // Second call in linkGoogleToAccount

      // Mock account update
      prisma.account.update.mockResolvedValue({
        ...existingAccount,
        google_id: 'google-id-67890',
        avatar_url: 'https://example.com/new-avatar.jpg',
        provider: 'GOOGLE'
      });

      // Create mock request
      const request = {
        json: async () => ({
          credential: 'valid-google-id-token'
        })
      };

      // Execute authentication
      const response = await POST(request);

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.id).toBe(2);
      expect(response.body.user.email).toBe('existing@example.com');

      // Verify cookie was set
      expect(response.cookies.set).toHaveBeenCalled();

      // Verify database operations
      expect(prisma.account.findUnique).toHaveBeenCalled();
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          google_id: 'google-id-67890',
          avatar_url: 'https://example.com/new-avatar.jpg',
          provider: 'GOOGLE'
        }
      });
    });

    test('should not overwrite existing Google ID', async () => {
      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'linked@example.com',
          name: 'Linked User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'new-google-id',
          email_verified: true
        })
      });

      // Mock database - existing account with Google ID
      const linkedAccount = {
        id: 3,
        email: 'linked@example.com',
        name: 'Linked User',
        google_id: 'existing-google-id',
        avatar_url: 'https://example.com/old-avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: null,
        created_at: new Date()
      };

      prisma.account.findUnique
        .mockResolvedValueOnce(linkedAccount) // First call in findAccountByEmail
        .mockResolvedValueOnce(linkedAccount); // Second call in linkGoogleToAccount

      // Create mock request
      const request = {
        json: async () => ({
          credential: 'valid-google-id-token'
        })
      };

      // Execute authentication
      const response = await POST(request);

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(3);

      // Verify Google ID was NOT updated
      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('Complete Authentication Flow - Error Scenarios', () => {
    test('should handle missing credential gracefully', async () => {
      const request = {
        json: async () => ({})
      };

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Google credential is required');
      expect(response.body.correlationId).toBeDefined();
      expect(response.cookies.set).not.toHaveBeenCalled();
    });

    test('should handle invalid Google token', async () => {
      // Mock Google tokeninfo endpoint - invalid token
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid token'
      });

      const request = {
        json: async () => ({
          credential: 'invalid-token'
        })
      };

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid Google token');
      expect(response.body.correlationId).toBeDefined();
      expect(response.cookies.set).not.toHaveBeenCalled();
    });

    test('should handle database connection failure', async () => {
      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-id-test',
          email_verified: true
        })
      });

      // Mock database error
      prisma.account.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = {
        json: async () => ({
          credential: 'valid-token'
        })
      };

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Unable to process authentication. Please try again.');
      expect(response.body.correlationId).toBeDefined();
      expect(response.cookies.set).not.toHaveBeenCalled();
    });

    test('should handle missing JWT_SECRET', async () => {
      // Remove JWT_SECRET
      delete process.env.JWT_SECRET;

      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-id-test',
          email_verified: true
        })
      });

      // Mock database
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        google_id: 'google-id-test',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: null
      });

      const request = {
        json: async () => ({
          credential: 'valid-token'
        })
      };

      const response = await POST(request);

      expect(response.status).toBe(500);
      // Environment validation happens first, so we get this error instead
      expect(response.body.error).toBe('Server configuration error. Please contact support.');
      expect(response.body.correlationId).toBeDefined();
      expect(response.cookies.set).not.toHaveBeenCalled();
    });

    test('should handle Google API timeout with retry', async () => {
      // Mock Google tokeninfo endpoint - timeout then success
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call times out
          return Promise.reject(Object.assign(new Error('Timeout'), { name: 'TimeoutError' }));
        }
        // Second call succeeds
        return Promise.resolve({
          ok: true,
          json: async () => ({
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
            sub: 'google-id-test',
            email_verified: true
          })
        });
      });

      // Mock database
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        google_id: 'google-id-test',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: null
      });

      const request = {
        json: async () => ({
          credential: 'valid-token'
        })
      };

      const response = await POST(request);

      // Should succeed after retry
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('JWT Token Validation', () => {
    test('should generate valid JWT token with correct payload', async () => {
      const jwt = require('jsonwebtoken');

      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'jwt-test@example.com',
          name: 'JWT Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-id-jwt',
          email_verified: true
        })
      });

      // Mock database
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        id: 99,
        email: 'jwt-test@example.com',
        name: 'JWT Test User',
        google_id: 'google-id-jwt',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: 'hr-123'
      });

      const request = {
        json: async () => ({
          credential: 'valid-token'
        })
      };

      const response = await POST(request);

      // Get the token that was set in the cookie
      const tokenCall = response.cookies.set.mock.calls[0];
      const token = tokenCall[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.accountId).toBe(99);
      expect(decoded.email).toBe('jwt-test@example.com');
      expect(decoded.name).toBe('JWT Test User');
      expect(decoded.role).toBe('USER');
      expect(decoded.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(decoded.hackerrank_id).toBe('hr-123');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();

      // Verify expiration is 7 days
      const expirationDuration = decoded.exp - decoded.iat;
      expect(expirationDuration).toBe(604800); // 7 days in seconds
    });
  });

  describe('Cookie Configuration', () => {
    test('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';

      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'prod@example.com',
          name: 'Prod User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-id-prod',
          email_verified: true
        })
      });

      // Mock database
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        id: 1,
        email: 'prod@example.com',
        name: 'Prod User',
        google_id: 'google-id-prod',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: null
      });

      const request = {
        json: async () => ({
          credential: 'valid-token'
        })
      };

      const response = await POST(request);

      // Verify secure flag is true in production
      const cookieConfig = response.cookies.set.mock.calls[0][2];
      expect(cookieConfig.secure).toBe(true);
    });

    test('should not set secure cookie in development', async () => {
      process.env.NODE_ENV = 'development';

      // Mock Google tokeninfo endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'dev@example.com',
          name: 'Dev User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-id-dev',
          email_verified: true
        })
      });

      // Mock database
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        id: 1,
        email: 'dev@example.com',
        name: 'Dev User',
        google_id: 'google-id-dev',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'USER',
        provider: 'GOOGLE',
        hackerrank_id: null
      });

      const request = {
        json: async () => ({
          credential: 'valid-token'
        })
      };

      const response = await POST(request);

      // Verify secure flag is false in development
      const cookieConfig = response.cookies.set.mock.calls[0][2];
      expect(cookieConfig.secure).toBe(false);
    });
  });
});
