import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Disable strict mode to prevent double-firing of useEffect in dev,
  // which causes the session check to race and show the loading screen repeatedly.
  reactStrictMode: false,
  serverExternalPackages: [
    "bcryptjs",
    "mongoose",
    "express",
    "express-rate-limit",
    "cors",
    "helmet",
    "morgan",
    "cookie-parser",
    "pdfkit",
    "dotenv",
  ],
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  // Prevent webpack from watching server-api and unified-server files.
  // These files are Node.js server code, not Next.js frontend code.
  // Without this, any request hitting the Express API causes file-system
  // writes (logs, etc.) that webpack picks up and triggers a full HMR reload.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/src/server-api/**",
          "**/unified-server.mjs",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
