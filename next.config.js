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
  trailingSlash: false
};

module.exports = nextConfig; 