/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Enable static exports for better performance */
  output: 'standalone',
  
  /* Strict mode for better development experience */
  reactStrictMode: true,
  
  /* Server Actions configuration for Next.js 15 */
  experimental: {
    serverActions: {
      enabled: true
    }
  },
  
  // Vercel-specific: ensure trailingSlash is false for SSR
  trailingSlash: false,
  
  // Configure static file serving
  images: {
    unoptimized: true
  },
  
  // Vercel-specific environment variables
  env: {
    API_BASE_URL: 'https://api.redbuilder.io',
    USE_MOCK_DATA: 'false',
    IS_VERCEL: 'true'
  }
};

module.exports = nextConfig;
