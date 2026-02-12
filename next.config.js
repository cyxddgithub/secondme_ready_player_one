/** @type {import('next').NextConfig} */
const nextConfig = {
  // 确保 Vercel serverless function 包含 SQLite 数据库文件
  outputFileTracingIncludes: {
    "/api/**": ["./prisma/dev.db"],
  },
};

module.exports = nextConfig;
