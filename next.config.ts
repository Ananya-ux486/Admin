import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
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
