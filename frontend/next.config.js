/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  assetPrefix: process.env.ASSET_PREFIX || '',
  env: {
    WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765',
  },
};

module.exports = nextConfig;
