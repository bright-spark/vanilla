// Script to check environment variables
console.log('Checking environment variables...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('API_BASE_URL:', process.env.API_BASE_URL || 'not set');

// Load config
const config = require('./config');
console.log('\nConfig values:');
console.log('apiBaseUrl:', config.apiBaseUrl);
console.log('useMockData:', config.useMockData);
console.log('apiKey exists:', !!config.apiKey);
console.log('apiKey length:', config.apiKey ? config.apiKey.length : 0);
