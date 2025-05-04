/**
 * Configuration for different environments
 * This file reads environment variables from .env.local in Next.js
 * or from the environment when running the standalone server
 * @typedef {import('./types').AppConfig} AppConfig
 */

// Get API key directly from environment variables
// This will be populated by load-env.js when running the standalone server
function getApiKey() {
  return process.env.OPENAI_API_KEY || '';
}

// Detect if we're running on Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// If we're on Vercel, use the special Vercel configuration
let configToExport;
if (isVercel) {
  try {
    configToExport = require('./vercel-config');
  } catch (e) {
    console.warn('Failed to load Vercel config, falling back to default:', e);
    // Will continue to use the default config below
  }
}

const config = {
  development: {
    // Always use the live API URL on Vercel, even in development mode
    apiBaseUrl: isVercel ? 'https://api.redbuilder.io' : 'http://localhost:8787',
    // For development, we'll use mock data when API key is not available
    get useMockData() { return !isVercel && !getApiKey(); },
    get apiKey() { return getApiKey(); },
  },
  production: {
    apiBaseUrl: 'https://api.redbuilder.io',
    // For production, we should always use the real API
    useMockData: false,
    get apiKey() { return getApiKey(); },
  },
};

// Default to development environment
const env = process.env.NODE_ENV || 'development';

// If we already have a Vercel config, use that, otherwise use the environment-specific config
if (configToExport) {
  module.exports = configToExport;
} else {
  // Export the configuration for the current environment
  module.exports = config[env];
}
