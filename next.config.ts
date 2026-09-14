import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.86.245',
    '192.168.86.30',
    '192.168.86.*',
    '192.168.*.*',
    '10.0.*.*',
    'localhost',
    '127.0.0.1',
  ],
};

export default nextConfig;

