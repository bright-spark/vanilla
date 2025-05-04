/**
 * Special build script for Vercel deployments
 */

const fs = require('fs');
const path = require('path');

// Create a simple config file for Vercel deployments
const vercelConfig = `
// This file is auto-generated for Vercel deployments
const config = {
  apiBaseUrl: 'https://api.redbuilder.io',
  useMockData: false,
  apiKey: process.env.OPENAI_API_KEY || '',
};

module.exports = config;
`;

// Write the config file
fs.writeFileSync(path.join(__dirname, 'vercel-config.js'), vercelConfig);
console.log('Created vercel-config.js for Vercel deployment');

// Create a simple config.js file that works in Vercel
const configJs = `
// This file is auto-generated for Vercel deployments
const config = {
  apiBaseUrl: 'https://api.redbuilder.io',
  useMockData: false,
  apiKey: process.env.OPENAI_API_KEY || '',
};

module.exports = config;
`;

// Write the config.js file
fs.writeFileSync(path.join(__dirname, 'config.js'), configJs);
console.log('Created config.js for Vercel deployment');

// Exit successfully
process.exit(0);
