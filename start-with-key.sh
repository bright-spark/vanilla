#!/bin/bash

# Check if API key is provided
if [ "$1" == "" ]; then
  echo "Please provide your API key as an argument: ./start-with-key.sh YOUR_API_KEY"
  exit 1
fi

# Create or update .env.production with the API key
echo "OPENAI_API_KEY=$1" > .env.production

# Build the application
echo "Building the application..."
npm run build

# Start the server in production mode
echo "Starting the server in production mode..."
NODE_ENV=production node server.js
