/**
 * Property-based tests for Google OAuth authentication
 * Feature: google-oauth-authentication
 * 
 * Tests JWT token generation and cookie configuration properties
 */

// Mock Next.js modules BEFORE imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status || 200,
      cookies: {
        set: jest.fn()
      }
    }))
  }
}));

// Mock Prisma BEFORE imports
jest.mock('../../../../lib/prisma', () => ({
  __esModule: true,
  default: {
    account: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));

// Mock config validation BEFORE imports
jest.mock('../../../../lib/config', () => ({
  validateEnvironmentConfig: jest.fn(() => ({
    isValid: true,
    missing: [],
    error: null
  }))
}));

// Now import after mocks
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { POST } from './route.js';
import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

describe('Google OAuth Authentication - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { 
      ...originalEnv,
      JWT_SECRET: 'test-secret-key-for-jwt-signing',
      DATABASE_URL: 'postgresql://test',
      NODE_ENV: 'test'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Property 7: JWT Payload Completeness
   * Validates: Requirements 3.1
   * 
   * For any successful authentication, the generated JWT token should contain 
   * all required fields: accountId, email, name, role, avatar_url, and hackerrank_id.
   */
  describe('Property 7: JWT Payload Completeness', () => {
    test('JWT tokens contain all required fields for any valid account', async () => {
      // Mock Google token verification
      global.fetch = jest.fn((url) => {
        if (url.includes('oauth2.googleapis.com/tokeninfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
              sub: 'google-id-123'
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary account data
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('USER', 'ADMIN'),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            hackerrank_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            google_id: fc.string({ minLength: 1, maxLength: 100 }),
            provider: fc.constant('GOOGLE'),
            created_at: fc.date()
          }),
          async (accountData) => {
            // Mock database to return the generated account
            prisma.account.findUnique.mockResolvedValue(null);
            prisma.account.create.mockResolvedValue(accountData);

            // Create mock request
            const request = {
              json: async () => ({ credential: 'mock-google-token' })
            };

            // Call the POST handler
            const response = await POST(request);

            // Verify response was successful
            expect(response.status).toBe(200);

            // Extract the token from the cookie set call
            expect(response.cookies.set).toHaveBeenCalled();
            const cookieCall = response.cookies.set.mock.calls[0];
            expect(cookieCall[0]).toBe('auth_token');
            const token = cookieCall[1];

            // Decode the JWT token
            const decoded = jwt.decode(token);

            // Verify all required fields are present
            expect(decoded).toHaveProperty('accountId', accountData.id);
            expect(decoded).toHaveProperty('email', accountData.email);
            expect(decoded).toHaveProperty('name', accountData.name);
            expect(decoded).toHaveProperty('role', accountData.role);
            expect(decoded).toHaveProperty('avatar_url');
            expect(decoded).toHaveProperty('hackerrank_id');

            // Verify field values match account data
            expect(decoded.accountId).toBe(accountData.id);
            expect(decoded.email).toBe(accountData.email);
            expect(decoded.name).toBe(accountData.name);
            expect(decoded.role).toBe(accountData.role);
            expect(decoded.avatar_url).toBe(accountData.avatar_url);
            expect(decoded.hackerrank_id).toBe(accountData.hackerrank_id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: JWT Expiration Time
   * Validates: Requirements 3.2
   * 
   * For any generated JWT token, decoding the token should reveal an expiration time 
   * (exp claim) that is exactly 7 days (604800 seconds) after the issued time (iat claim).
   */
  describe('Property 8: JWT Expiration Time', () => {
    test('JWT tokens expire exactly 7 days after issuance', async () => {
      // Mock Google token verification
      global.fetch = jest.fn((url) => {
        if (url.includes('oauth2.googleapis.com/tokeninfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
              sub: 'google-id-123'
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('USER', 'ADMIN'),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            hackerrank_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            google_id: fc.string({ minLength: 1, maxLength: 100 }),
            provider: fc.constant('GOOGLE'),
            created_at: fc.date()
          }),
          async (accountData) => {
            prisma.account.findUnique.mockResolvedValue(null);
            prisma.account.create.mockResolvedValue(accountData);

            const request = {
              json: async () => ({ credential: 'mock-google-token' })
            };

            const response = await POST(request);
            expect(response.status).toBe(200);

            const cookieCall = response.cookies.set.mock.calls[0];
            const token = cookieCall[1];
            const decoded = jwt.decode(token);

            // Verify exp and iat claims exist
            expect(decoded).toHaveProperty('exp');
            expect(decoded).toHaveProperty('iat');

            // Calculate the difference (should be exactly 7 days = 604800 seconds)
            const expirationDuration = decoded.exp - decoded.iat;
            const sevenDaysInSeconds = 60 * 60 * 24 * 7;

            expect(expirationDuration).toBe(sevenDaysInSeconds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Cookie Configuration
   * Validates: Requirements 3.3, 3.4
   * 
   * For any successful authentication response, the auth_token cookie should be set 
   * with httpOnly=true, sameSite='lax', maxAge=604800 (7 days), path='/', and secure 
   * flag matching the production environment status.
   */
  describe('Property 9: Cookie Configuration', () => {
    test('auth_token cookie has correct configuration for any authentication', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('oauth2.googleapis.com/tokeninfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
              sub: 'google-id-123'
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('USER', 'ADMIN'),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            hackerrank_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            google_id: fc.string({ minLength: 1, maxLength: 100 }),
            provider: fc.constant('GOOGLE'),
            created_at: fc.date()
          }),
          fc.constantFrom('test', 'development', 'production'),
          async (accountData, nodeEnv) => {
            process.env.NODE_ENV = nodeEnv;
            
            prisma.account.findUnique.mockResolvedValue(null);
            prisma.account.create.mockResolvedValue(accountData);

            const request = {
              json: async () => ({ credential: 'mock-google-token' })
            };

            const response = await POST(request);
            expect(response.status).toBe(200);

            // Verify cookie was set
            expect(response.cookies.set).toHaveBeenCalled();
            const cookieCall = response.cookies.set.mock.calls[0];
            
            // Verify cookie name
            expect(cookieCall[0]).toBe('auth_token');
            
            // Verify cookie configuration
            const cookieConfig = cookieCall[2];
            expect(cookieConfig.httpOnly).toBe(true);
            expect(cookieConfig.sameSite).toBe('lax');
            expect(cookieConfig.maxAge).toBe(60 * 60 * 24 * 7); // 7 days in seconds
            expect(cookieConfig.path).toBe('/');
            
            // Verify secure flag matches environment
            const expectedSecure = nodeEnv === 'production';
            expect(cookieConfig.secure).toBe(expectedSecure);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Response User Information
   * Validates: Requirements 3.5
   * 
   * For any successful authentication, the response body should contain a user object 
   * with id, email, name, role, and avatar_url fields matching the authenticated account.
   */
  describe('Property 10: Response User Information', () => {
    test('response contains correct user information for any account', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('oauth2.googleapis.com/tokeninfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
              sub: 'google-id-123'
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('USER', 'ADMIN'),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            hackerrank_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            google_id: fc.string({ minLength: 1, maxLength: 100 }),
            provider: fc.constant('GOOGLE'),
            created_at: fc.date()
          }),
          async (accountData) => {
            prisma.account.findUnique.mockResolvedValue(null);
            prisma.account.create.mockResolvedValue(accountData);

            const request = {
              json: async () => ({ credential: 'mock-google-token' })
            };

            const response = await POST(request);
            expect(response.status).toBe(200);

            // Verify response body structure
            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('user');

            const user = response.body.user;

            // Verify all required user fields are present
            expect(user).toHaveProperty('id', accountData.id);
            expect(user).toHaveProperty('email', accountData.email);
            expect(user).toHaveProperty('name', accountData.name);
            expect(user).toHaveProperty('role', accountData.role);
            expect(user).toHaveProperty('avatar_url', accountData.avatar_url);

            // Verify values match account data
            expect(user.id).toBe(accountData.id);
            expect(user.email).toBe(accountData.email);
            expect(user.name).toBe(accountData.name);
            expect(user.role).toBe(accountData.role);
            expect(user.avatar_url).toBe(accountData.avatar_url);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: JWT Signature Verification
   * Validates: Requirements 5.2
   * 
   * For any generated JWT token, verifying the token with the JWT_SECRET environment 
   * variable should succeed, confirming the token was signed with the correct secret.
   */
  describe('Property 12: JWT Signature Verification', () => {
    test('JWT tokens can be verified with the correct secret', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('oauth2.googleapis.com/tokeninfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
              sub: 'google-id-123'
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('USER', 'ADMIN'),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            hackerrank_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            google_id: fc.string({ minLength: 1, maxLength: 100 }),
            provider: fc.constant('GOOGLE'),
            created_at: fc.date()
          }),
          async (accountData) => {
            const jwtSecret = 'test-secret-key-for-jwt-signing';
            process.env.JWT_SECRET = jwtSecret;

            prisma.account.findUnique.mockResolvedValue(null);
            prisma.account.create.mockResolvedValue(accountData);

            const request = {
              json: async () => ({ credential: 'mock-google-token' })
            };

            const response = await POST(request);
            expect(response.status).toBe(200);

            const cookieCall = response.cookies.set.mock.calls[0];
            const token = cookieCall[1];

            // Verify the token with the secret
            let verificationSucceeded = false;
            let decoded = null;

            try {
              decoded = jwt.verify(token, jwtSecret);
              verificationSucceeded = true;
            } catch (error) {
              verificationSucceeded = false;
            }

            // Verification should succeed
            expect(verificationSucceeded).toBe(true);
            expect(decoded).not.toBeNull();

            // Verify the decoded payload contains expected data
            expect(decoded.accountId).toBe(accountData.id);
            expect(decoded.email).toBe(accountData.email);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Secure Cookie in Production
   * Validates: Requirements 5.3
   * 
   * For any successful authentication when NODE_ENV is set to "production", the 
   * auth_token cookie should have the secure flag set to true; when NODE_ENV is 
   * not "production", the secure flag should be false.
   */
  describe('Property 13: Secure Cookie in Production', () => {
    test('secure flag is true in production and false otherwise', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('oauth2.googleapis.com/tokeninfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
              sub: 'google-id-123'
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('USER', 'ADMIN'),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            hackerrank_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            google_id: fc.string({ minLength: 1, maxLength: 100 }),
            provider: fc.constant('GOOGLE'),
            created_at: fc.date()
          }),
          fc.constantFrom('production', 'development', 'test', 'staging'),
          async (accountData, nodeEnv) => {
            process.env.NODE_ENV = nodeEnv;

            prisma.account.findUnique.mockResolvedValue(null);
            prisma.account.create.mockResolvedValue(accountData);

            const request = {
              json: async () => ({ credential: 'mock-google-token' })
            };

            const response = await POST(request);
            expect(response.status).toBe(200);

            const cookieCall = response.cookies.set.mock.calls[0];
            const cookieConfig = cookieCall[2];

            // Verify secure flag matches environment
            if (nodeEnv === 'production') {
              expect(cookieConfig.secure).toBe(true);
            } else {
              expect(cookieConfig.secure).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: No Cookie on Error
   * Validates: Requirements 4.4
   * 
   * For any authentication request that results in an error response (4xx or 5xx status), 
   * the response should not include a Set-Cookie header for auth_token.
   */
  describe('Property 11: No Cookie on Error', () => {
    test('error responses do not set auth_token cookie', async () => {
      // Reduce runs to 20 to avoid timeout issues with retry logic
      await fc.assert(
        fc.asyncProperty(
          // Generate different error scenarios
          fc.constantFrom(
            { type: 'missing_credential', status: 400 },
            { type: 'invalid_token', status: 401 },
            { type: 'database_error', status: 500 },
            { type: 'missing_email', status: 400 }
          ),
          async (errorScenario) => {
            // Setup mocks based on error scenario
            if (errorScenario.type === 'missing_credential') {
              // Request without credential
              const request = {
                json: async () => ({})
              };

              const response = await POST(request);
              
              expect(response.status).toBe(errorScenario.status);
              expect(response.body).toHaveProperty('error');
              expect(response.body).toHaveProperty('correlationId');
              expect(response.cookies.set).not.toHaveBeenCalled();
            } 
            else if (errorScenario.type === 'invalid_token') {
              // Mock Google returning invalid token error
              global.fetch = jest.fn((url) => {
                if (url.includes('oauth2.googleapis.com/tokeninfo')) {
                  return Promise.resolve({
                    ok: false,
                    status: 400,
                    statusText: 'Bad Request',
                    text: () => Promise.resolve('Invalid token')
                  });
                }
                return Promise.reject(new Error('Unexpected URL'));
              });

              const request = {
                json: async () => ({ credential: 'invalid-token' })
              };

              const response = await POST(request);
              
              expect(response.status).toBe(errorScenario.status);
              expect(response.body).toHaveProperty('error');
              expect(response.body).toHaveProperty('correlationId');
              expect(response.cookies.set).not.toHaveBeenCalled();
            } 
            else if (errorScenario.type === 'database_error') {
              // Mock successful Google verification but database error
              global.fetch = jest.fn((url) => {
                if (url.includes('oauth2.googleapis.com/tokeninfo')) {
                  return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                      email: 'test@example.com',
                      name: 'Test User',
                      picture: 'https://example.com/avatar.jpg',
                      sub: 'google-id-123'
                    })
                  });
                }
                return Promise.reject(new Error('Unexpected URL'));
              });

              // Mock database error
              prisma.account.findUnique.mockRejectedValue(new Error('Database connection failed'));

              const request = {
                json: async () => ({ credential: 'valid-token' })
              };

              const response = await POST(request);
              
              expect(response.status).toBe(errorScenario.status);
              expect(response.body).toHaveProperty('error');
              expect(response.body).toHaveProperty('correlationId');
              expect(response.cookies.set).not.toHaveBeenCalled();
            }
            else if (errorScenario.type === 'missing_email') {
              // Mock Google returning token without email
              global.fetch = jest.fn((url) => {
                if (url.includes('oauth2.googleapis.com/tokeninfo')) {
                  return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                      name: 'Test User',
                      picture: 'https://example.com/avatar.jpg',
                      sub: 'google-id-123'
                      // Missing email field
                    })
                  });
                }
                return Promise.reject(new Error('Unexpected URL'));
              });

              const request = {
                json: async () => ({ credential: 'token-without-email' })
              };

              const response = await POST(request);
              
              expect(response.status).toBe(errorScenario.status);
              expect(response.body).toHaveProperty('error');
              expect(response.body).toHaveProperty('correlationId');
              expect(response.cookies.set).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100 to avoid timeout issues with retry logic
      );
    });
  });
});
