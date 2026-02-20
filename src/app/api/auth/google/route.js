import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';
import { validateEnvironmentConfig } from '../../../../lib/config';

/**
 * Generates a unique correlation ID for error tracking
 */
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Logs error with detailed context for debugging
 */
function logError(context, error, additionalInfo = {}) {
  const correlationId = additionalInfo.correlationId || generateCorrelationId();
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint: '/api/auth/google',
    method: 'POST',
    correlationId,
    context,
    error: error.message,
    stack: error.stack,
    ...additionalInfo
  }, null, 2));
  return correlationId;
}

/**
 * Validates the structure of Google tokeninfo response
 */
function validateTokenResponse(googleUser) {
  if (!googleUser || typeof googleUser !== 'object') {
    return { valid: false, error: 'Invalid token response structure' };
  }

  const requiredFields = ['email', 'sub'];
  const missingFields = requiredFields.filter(field => !googleUser[field]);
  
  if (missingFields.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }

  // Validate field types
  if (typeof googleUser.email !== 'string' || !googleUser.email.includes('@')) {
    return { valid: false, error: 'Invalid email format in token' };
  }

  if (typeof googleUser.sub !== 'string' || googleUser.sub.length === 0) {
    return { valid: false, error: 'Invalid Google ID (sub) in token' };
  }

  return { valid: true };
}

/**
 * Normalizes email address to lowercase for consistent storage
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email: must be a non-empty string');
  }
  
  const normalized = email.trim().toLowerCase();
  
  if (!normalized.includes('@')) {
    throw new Error('Invalid email format: missing @ symbol');
  }
  
  return normalized;
}

/**
 * Finds an account by email address
 */
async function findAccountByEmail(email) {
  try {
    const normalizedEmail = normalizeEmail(email);
    const account = await prisma.account.findUnique({ 
      where: { email: normalizedEmail } 
    });
    
    if (account) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'Account found',
        accountId: account.id,
        hasGoogleId: !!account.google_id
      }));
    }
    
    return account;
  } catch (error) {
    logError('Account lookup failed', error, { email });
    throw error;
  }
}

/**
 * Links a Google ID to an existing account
 * Only updates google_id if it's not already set (prevents overwriting)
 */
async function linkGoogleToAccount(accountId, googleId, avatarUrl) {
  try {
    const existingAccount = await prisma.account.findUnique({
      where: { id: accountId }
    });
    
    if (!existingAccount) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    // Prevent overwriting existing google_id
    if (existingAccount.google_id) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'Google ID already set, skipping update',
        accountId: existingAccount.id,
        existingGoogleId: '[REDACTED]'
      }));
      return existingAccount;
    }
    
    // Update google_id and avatar_url
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { 
        google_id: googleId, 
        avatar_url: avatarUrl || existingAccount.avatar_url,
        // Only change provider to GOOGLE if it was EMAIL
        provider: existingAccount.provider === 'EMAIL' ? 'GOOGLE' : existingAccount.provider
      },
    });
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'Account linked to Google',
      accountId: updatedAccount.id
    }));
    
    return updatedAccount;
  } catch (error) {
    logError('Account linking failed', error, { accountId, googleId: '[REDACTED]' });
    throw error;
  }
}

/**
 * Creates a new account with Google authentication
 */
async function createGoogleAccount(email, name, googleId, avatarUrl) {
  try {
    const normalizedEmail = normalizeEmail(email);
    
    // Derive name from email if not provided
    const accountName = name || normalizedEmail.split('@')[0];
    
    const account = await prisma.account.create({
      data: {
        email: normalizedEmail,
        name: accountName,
        google_id: googleId,
        avatar_url: avatarUrl || null,
        role: 'USER',
        provider: 'GOOGLE',
      },
    });
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'New Google account created',
      accountId: account.id,
      provider: 'GOOGLE'
    }));
    
    return account;
  } catch (error) {
    logError('Account creation failed', error, { 
      email: normalizeEmail(email),
      googleId: '[REDACTED]'
    });
    throw error;
  }
}

/**
 * Finds or creates an account for Google authentication
 * Handles account linking for existing accounts
 */
async function findOrCreateGoogleAccount(googleUser) {
  const { email, name, picture, sub: google_id } = googleUser;
  
  if (!email) {
    throw new Error('Email is required from Google user data');
  }
  
  if (!google_id) {
    throw new Error('Google ID (sub) is required from Google user data');
  }
  
  // Look up existing account by email
  const existingAccount = await findAccountByEmail(email);
  
  if (existingAccount) {
    // Link Google ID if not already set
    return await linkGoogleToAccount(existingAccount.id, google_id, picture);
  } else {
    // Create new account
    return await createGoogleAccount(email, name, google_id, picture);
  }
}

/**
 * Validates JWT payload completeness
 * Ensures all required fields are present before token generation
 */
function validateJWTPayload(account) {
  if (!account || typeof account !== 'object') {
    throw new Error('Account must be a valid object');
  }

  const requiredFields = ['id', 'email', 'name', 'role'];
  const missingFields = requiredFields.filter(field => !account[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`JWT payload missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate field types
  if (typeof account.id !== 'number') {
    throw new Error('Account ID must be a number');
  }

  if (typeof account.email !== 'string' || !account.email.includes('@')) {
    throw new Error('Account email must be a valid email string');
  }

  if (typeof account.name !== 'string' || account.name.length === 0) {
    throw new Error('Account name must be a non-empty string');
  }

  if (typeof account.role !== 'string' || account.role.length === 0) {
    throw new Error('Account role must be a non-empty string');
  }

  return true;
}

/**
 * Generates a JWT authentication token for an account
 * Includes all required user information and sets 7-day expiration
 */
function generateAuthToken(account) {
  // Validate payload completeness
  validateJWTPayload(account);

  // Check JWT_SECRET is available
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const payload = {
    accountId: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    avatar_url: account.avatar_url || null,
    hackerrank_id: account.hackerrank_id || null
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'JWT token generated',
    accountId: account.id,
    expiresIn: '7d'
  }));

  return token;
}

/**
 * Gets cookie configuration based on environment
 * Ensures secure flag is set in production
 */
function getCookieConfig() {
  return {
    httpOnly: true,
    secure: true, // Always use secure (Railway uses HTTPS)
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/'
  };
}

/**
 * Verifies Google ID token with retry logic for transient failures
 */
async function verifyGoogleToken(credential, maxRetries = 3) {
  const retryableStatusCodes = [429, 500, 502, 503, 504];
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
        { signal: AbortSignal.timeout(10000) }
      );

      // Success case
      if (verifyRes.ok) {
        const googleUser = await verifyRes.json();
        
        // Validate response structure
        const validation = validateTokenResponse(googleUser);
        if (!validation.valid) {
          const correlationId = logError('Token response validation failed', new Error(validation.error), {
            attempt,
            googleUser: { ...googleUser, sub: '[REDACTED]' }
          });
          return { 
            success: false, 
            status: 400, 
            error: 'Invalid token data from Google',
            correlationId
          };
        }

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'Token verified successfully',
          attempt,
          email: googleUser.email.toLowerCase()
        }));

        return { success: true, data: googleUser };
      }

      // Check if error is retryable
      if (retryableStatusCodes.includes(verifyRes.status) && attempt < maxRetries) {
        const errorText = await verifyRes.text().catch(() => 'Unable to read error response');
        const correlationId = logError('Google API retryable error', new Error('Retryable status code'), {
          attempt,
          maxRetries,
          status: verifyRes.status,
          statusText: verifyRes.statusText,
          response: errorText
        });

        // Exponential backoff: 100ms, 200ms, 400ms
        const backoffMs = 100 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // Non-retryable error
      const errorText = await verifyRes.text().catch(() => 'Unable to read error response');
      const correlationId = logError('Google token verification failed', new Error('Invalid token'), {
        attempt,
        status: verifyRes.status,
        statusText: verifyRes.statusText,
        response: errorText
      });

      return { 
        success: false, 
        status: 401, 
        error: 'Invalid Google token',
        correlationId
      };

    } catch (fetchError) {
      lastError = fetchError;

      if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
        const correlationId = logError('Google API timeout', fetchError, {
          attempt,
          maxRetries,
          endpoint: 'https://oauth2.googleapis.com/tokeninfo',
          timeout: '10000ms'
        });

        // Retry on timeout if attempts remain
        if (attempt < maxRetries) {
          const backoffMs = 100 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }

        return { 
          success: false, 
          status: 503, 
          error: 'Google authentication service is temporarily unavailable. Please try again.',
          correlationId
        };
      }

      // Network error - retry if attempts remain
      const correlationId = logError('Google API network error', fetchError, {
        attempt,
        maxRetries,
        endpoint: 'https://oauth2.googleapis.com/tokeninfo'
      });

      if (attempt < maxRetries) {
        const backoffMs = 100 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      return { 
        success: false, 
        status: 503, 
        error: 'Unable to verify Google token. Please try again.',
        correlationId
      };
    }
  }

  // Should not reach here, but handle just in case
  const correlationId = logError('Token verification exhausted retries', lastError, { maxRetries });
  return { 
    success: false, 
    status: 503, 
    error: 'Unable to verify Google token after multiple attempts.',
    correlationId
  };
}

export async function POST(request) {
  try {
    // Validate environment configuration (skip during build)
    if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
      const configValidation = validateEnvironmentConfig();
      if (!configValidation.isValid) {
        const correlationId = logError('Environment validation', new Error(configValidation.error), {
          severity: 'CRITICAL',
          missing: configValidation.missing
        });
        return NextResponse.json({ 
          error: 'Server configuration error. Please contact support.',
          correlationId
        }, { status: 500 });
      }
    }

    const { credential } = await request.json();

    if (!credential) {
      const correlationId = generateCorrelationId();
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/google',
        event: 'Missing credential',
        status: 400,
        correlationId
      }));
      return NextResponse.json({ 
        error: 'Google credential is required',
        correlationId
      }, { status: 400 });
    }

    // Verify the Google ID token with retry logic
    const verificationResult = await verifyGoogleToken(credential);
    
    if (!verificationResult.success) {
      const correlationId = verificationResult.correlationId || generateCorrelationId();
      return NextResponse.json({ 
        error: verificationResult.error,
        correlationId
      }, { status: verificationResult.status });
    }

    const googleUser = verificationResult.data;
    const { email } = googleUser;

    if (!email) {
      const correlationId = logError('Missing email in token', new Error('Email not found in Google token'), {
        googleUser: { ...googleUser, sub: '[REDACTED]' }
      });
      return NextResponse.json({ 
        error: 'Could not get email from Google',
        correlationId
      }, { status: 400 });
    }

    // Find or create account using refactored functions
    let account;
    try {
      account = await findOrCreateGoogleAccount(googleUser);
    } catch (dbError) {
      const correlationId = logError('Account management failed', dbError, {
        email: email.toLowerCase()
      });
      return NextResponse.json({ 
        error: 'Unable to process authentication. Please try again.',
        correlationId
      }, { status: 500 });
    }

    // Generate JWT token using refactored function
    let token;
    try {
      token = generateAuthToken(account);
    } catch (jwtError) {
      const correlationId = logError('JWT generation failed', jwtError, {
        accountId: account.id
      });
      return NextResponse.json({ 
        error: 'Unable to create authentication token',
        correlationId
      }, { status: 500 });
    }

    const response = NextResponse.json({
      message: 'Login successful',
      user: { 
        id: account.id, 
        email: account.email, 
        name: account.name, 
        role: account.role, 
        avatar_url: account.avatar_url 
      },
    });

    // Set cookie with environment-specific configuration
    const cookieConfig = getCookieConfig();
    response.cookies.set('auth_token', token, cookieConfig);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'Authentication successful',
      accountId: account.id,
      email: account.email,
      cookieSecure: cookieConfig.secure
    }));

    return response;
  } catch (error) {
    const correlationId = logError('Unexpected error', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}
