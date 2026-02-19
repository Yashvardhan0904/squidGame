/**
 * Unit tests for environment configuration validation
 */

import { 
  validateEnvironmentConfig, 
  requireEnvironmentConfig, 
  hasEnvVar, 
  getEnvVar 
} from './config';

describe('Environment Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironmentConfig', () => {
    test('returns valid when all required variables are present', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.NODE_ENV = 'test';

      const result = validateEnvironmentConfig();

      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.error).toBeNull();
    });

    test('returns invalid when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.NODE_ENV = 'test';

      const result = validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('JWT_SECRET');
      expect(result.error).toContain('JWT_SECRET');
    });

    test('returns invalid when DATABASE_URL is missing', () => {
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.DATABASE_URL;
      process.env.NODE_ENV = 'test';

      const result = validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('DATABASE_URL');
      expect(result.error).toContain('DATABASE_URL');
    });

    test('returns invalid when NODE_ENV is missing', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://test';
      delete process.env.NODE_ENV;

      const result = validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('NODE_ENV');
      expect(result.error).toContain('NODE_ENV');
    });

    test('returns invalid when multiple variables are missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;
      process.env.NODE_ENV = 'test';

      const result = validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('JWT_SECRET');
      expect(result.missing).toContain('DATABASE_URL');
      expect(result.error).toContain('JWT_SECRET');
      expect(result.error).toContain('DATABASE_URL');
    });

    test('returns invalid when all variables are missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;
      delete process.env.NODE_ENV;

      const result = validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(3);
      expect(result.missing).toContain('JWT_SECRET');
      expect(result.missing).toContain('DATABASE_URL');
      expect(result.missing).toContain('NODE_ENV');
    });
  });

  describe('requireEnvironmentConfig', () => {
    test('does not throw when all required variables are present', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.NODE_ENV = 'test';

      expect(() => requireEnvironmentConfig()).not.toThrow();
    });

    test('throws error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.NODE_ENV = 'test';

      expect(() => requireEnvironmentConfig()).toThrow('JWT_SECRET');
    });

    test('throws error when DATABASE_URL is missing', () => {
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.DATABASE_URL;
      process.env.NODE_ENV = 'test';

      expect(() => requireEnvironmentConfig()).toThrow('DATABASE_URL');
    });

    test('throws error when NODE_ENV is missing', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.DATABASE_URL = 'postgresql://test';
      delete process.env.NODE_ENV;

      expect(() => requireEnvironmentConfig()).toThrow('NODE_ENV');
    });

    test('throws error with all missing variables listed', () => {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;
      delete process.env.NODE_ENV;

      expect(() => requireEnvironmentConfig()).toThrow(/JWT_SECRET.*DATABASE_URL.*NODE_ENV/);
    });
  });

  describe('hasEnvVar', () => {
    test('returns true when variable is set', () => {
      process.env.TEST_VAR = 'value';
      expect(hasEnvVar('TEST_VAR')).toBe(true);
    });

    test('returns false when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(hasEnvVar('TEST_VAR')).toBe(false);
    });

    test('returns false when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(hasEnvVar('TEST_VAR')).toBe(false);
    });
  });

  describe('getEnvVar', () => {
    test('returns variable value when set', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getEnvVar('TEST_VAR')).toBe('test-value');
    });

    test('returns default value when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnvVar('TEST_VAR', 'default')).toBe('default');
    });

    test('returns empty string when variable is not set and no default provided', () => {
      delete process.env.TEST_VAR;
      expect(getEnvVar('TEST_VAR')).toBe('');
    });

    test('returns variable value even when default is provided', () => {
      process.env.TEST_VAR = 'actual-value';
      expect(getEnvVar('TEST_VAR', 'default')).toBe('actual-value');
    });
  });
});
