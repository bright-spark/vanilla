#!/bin/bash

# No need to check for API key as it's read from .env.local

# Set production environment and run the standalone server
NODE_ENV=production node .next/standalone/server.js
