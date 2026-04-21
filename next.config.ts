import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // 2. Whitelist the ngrok domain for HMR (Hot Module Replacement)
  allowedDevOrigins: ['catalina-saccharometrical-valentino.ngrok-free.dev'],
};

export default nextConfig;
