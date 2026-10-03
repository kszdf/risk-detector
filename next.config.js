/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 独立输出：产物自带最小运行时，便于在腾讯云用 Docker/PM2 部署（对 Vercel 无副作用）
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
