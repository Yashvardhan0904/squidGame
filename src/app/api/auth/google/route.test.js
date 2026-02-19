/**
 * Integration tests for Google OAuth authentication route
 * Testing environment configuration validation
 */

import { POST } from './route';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('../../../../lib/prisma', () => ({
  __esModule: true,
  default: {
    account: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
}));

describe('POST /api/auth/google - Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 500 when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.NODE_ENV = 'test';

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'test-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Server configuration error');
  });

  test('returns 500 when DATABASE_URL is missing', async () => {
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'test';

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'test-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Server configuration error');
  });

  test('returns 500 when NODE_ENV is missing', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test';
    delete process.env.NODE_ENV;

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'test-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Server configuration error');
  });

  test('returns 500 when all environment variables are missing', async () => {
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'test-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Server configuration error');
  });

  test('proceeds with authentication when all environment variables are present', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.NODE_ENV = 'test';

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: '' }), // Empty credential to trigger 400
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    // Should get past environment validation and hit the credential validation
    expect(response.status).toBe(400);
    expect(data.error).toBe('Google credential is required');
  });
});

describe('POST /api/auth/google - Token Verification with Retry Logic', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { 
      ...originalEnv,
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgresql://test',
      NODE_ENV: 'test'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  test('returns 400 when credential is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({}),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Google credential is required');
  });

  test('returns 401 when Google token verification fails with 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('Invalid token'),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'invalid-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid Google token');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('retries on 503 status and succeeds on second attempt', async () => {
    const mockGoogleUser = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
      sub: 'google-id-123',
    };

    const prisma = require('../../../../lib/prisma').default;
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      avatar_url: 'https://example.com/pic.jpg',
      hackerrank_id: null,
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: jest.fn().mockResolvedValue('Service temporarily unavailable'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockGoogleUser),
      });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'valid-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Login successful');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('returns 503 after exhausting retries on timeout', async () => {
    global.fetch = jest.fn().mockRejectedValue(
      Object.assign(new Error('Timeout'), { name: 'TimeoutError' })
    );

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'valid-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('temporarily unavailable');
    expect(global.fetch).toHaveBeenCalledTimes(3); // Should retry 3 times
  });

  test('returns 503 after exhausting retries on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'valid-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('Unable to verify Google token');
    expect(global.fetch).toHaveBeenCalledTimes(3); // Should retry 3 times
  });

  test('returns 400 when token response is missing required fields', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        // Missing email and sub
      }),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'invalid-structure-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid token data from Google');
  });

  test('returns 400 when token response has invalid email format', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        email: 'not-an-email',
        name: 'Test User',
        sub: 'google-id-123',
      }),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'invalid-email-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid token data from Google');
  });

  test('returns 400 when token response has empty sub field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
        sub: '',
      }),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'empty-sub-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid token data from Google');
  });

  test('successfully verifies token with valid structure', async () => {
    const mockGoogleUser = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
      sub: 'google-id-123',
    };

    const prisma = require('../../../../lib/prisma').default;
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      avatar_url: 'https://example.com/pic.jpg',
      hackerrank_id: null,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockGoogleUser),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'valid-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Login successful');
    expect(data.user.email).toBe('test@example.com');
  });

  test('retries on 500 status and succeeds on third attempt', async () => {
    const mockGoogleUser = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
      sub: 'google-id-123',
    };

    const prisma = require('../../../../lib/prisma').default;
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      avatar_url: 'https://example.com/pic.jpg',
      hackerrank_id: null,
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: jest.fn().mockResolvedValue('Gateway error'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockGoogleUser),
      });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ credential: 'valid-token' }),
    };

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Login successful');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
