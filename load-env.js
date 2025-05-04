// Script to load environment variables from .env.local
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Function to load environment variables from a file
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const envConfig = dotenv.parse(fs.readFileSync(filePath));
      
      // Set each key-value pair in process.env
      for (const key in envConfig) {
        process.env[key] = envConfig[key];
      }
      
      console.log(`Loaded environment variables from ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return false;
}

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = path.resolve(process.cwd(), `.env.${NODE_ENV}`);
const localEnvFile = path.resolve(process.cwd(), '.env.local');

// First try NODE_ENV specific file, then .env.local, then .env
let loaded = loadEnvFile(envFile);
if (!loaded) {
  loaded = loadEnvFile(localEnvFile);
}
if (!loaded) {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
}

module.exports = { loadEnvFile };
