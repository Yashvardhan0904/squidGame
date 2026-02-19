/**
 * Environment Configuration Validation Utility
 * 
 * Validates required environment variables and provides clear error messages
 * for missing configuration. This module can be used across the application
 * to ensure proper configuration at startup or runtime.
 */

/**
 * Configuration validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether all required variables are present
 * @property {string[]} missing - Array of missing variable names
 * @property {string} error - Error message if validation fails
 */

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  JWT_SECRET: 'JWT secret key for signing authentication tokens',
  DATABASE_URL: 'PostgreSQL database connection string',
  NODE_ENV: 'Node environment (development, production, or test)'
};

/**
 * Validates that all required environment variables are present
 * 
 * @returns {ValidationResult} Validation result with details about missing variables
 */
export function validateEnvironmentConfig() {
  const missing = [];
  
  for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please ensure these are configured in your environment.`;
    
    return {
      isValid: false,
      missing,
      error: errorMessage
    };
  }
  
  return {
    isValid: true,
    missing: [],
    error: null
  };
}

/**
 * Validates environment configuration and throws an error if validation fails
 * Use this at application startup to fail fast if configuration is missing
 * 
 * @throws {Error} If required environment variables are missing
 */
export function requireEnvironmentConfig() {
  const result = validateEnvironmentConfig();
  
  if (!result.isValid) {
    throw new Error(result.error);
  }
}

/**
 * Validates a specific environment variable
 * 
 * @param {string} varName - Name of the environment variable to validate
 * @returns {boolean} True if the variable is present and non-empty
 */
export function hasEnvVar(varName) {
  return !!process.env[varName];
}

/**
 * Gets an environment variable with a fallback value
 * 
 * @param {string} varName - Name of the environment variable
 * @param {string} defaultValue - Default value if variable is not set
 * @returns {string} The environment variable value or default
 */
export function getEnvVar(varName, defaultValue = '') {
  return process.env[varName] || defaultValue;
}

/**
 * Logs detailed configuration status (useful for debugging)
 * Does not log sensitive values, only presence/absence
 */
export function logConfigStatus() {
  const status = {};
  
  for (const varName of Object.keys(REQUIRED_ENV_VARS)) {
    status[varName] = process.env[varName] ? 'SET' : 'MISSING';
  }
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'Environment configuration status',
    config: status
  }, null, 2));
}
