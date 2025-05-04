/**
 * Special configuration for Vercel deployments
 * This ensures the application always connects to the live API on Vercel
 */

module.exports = {
  // Force production environment on Vercel
  env: {
    NODE_ENV: 'production',
  },
  
  // Always use the live API URL
  apiBaseUrl: 'https://api.redbuilder.io',
  
  // Never use mock data on Vercel
  useMockData: false,
  
  // Get API key from Vercel environment variables
  apiKey: process.env.OPENAI_API_KEY || '',
};
