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
  
  // Fix for static assets in standalone mode
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  
  // Ensure proper static file serving
  distDir: '.next',
  
  // Configure static file serving
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig; 