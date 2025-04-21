/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 设置为 false 来禁用严格模式
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; 