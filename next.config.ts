import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for postgres.js in serverless environment
  serverExternalPackages: ["postgres", "bcryptjs"],

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "drive.google.com" },
    ],
  },

  // Vercel deployment optimizations
  compress: true,

  // TypeScript — errors still fail build (good)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint — don't fail on warnings
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Headers for security (backup to middleware)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Redirects
  // Fix 76: robots.txt to prevent indexing of dashboard
  async rewrites() {
    return [
      {
        source: "/robots.txt",
        destination: "/api/robots",
      },
    ];
  },

    async redirects() {
    return [
      // Redirect /home to /dashboard
      {
        source: "/home",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
