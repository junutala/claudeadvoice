/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static generation at build time - all pages rendered at request time
  // This is correct for an authenticated SaaS app with Supabase
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // Supabase env vars may not be present at build time on Vercel
  // Pages will be rendered dynamically at request time
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
