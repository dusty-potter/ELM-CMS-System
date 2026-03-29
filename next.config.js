/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run serves on PORT env var; Next.js respects this automatically.
  // Image optimization: allow Firebase Storage domain from legacy imports during migration.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

module.exports = nextConfig;
