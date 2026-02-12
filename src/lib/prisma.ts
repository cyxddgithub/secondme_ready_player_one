import { PrismaClient } from "@prisma/client";
import { existsSync, copyFileSync } from "fs";
import { join } from "path";

/**
 * Vercel serverless 文件系统是只读的，只有 /tmp 可写。
 * 构建时 prisma db push + seed 会在 prisma/dev.db 创建含数据的 SQLite。
 * 运行时把它复制到 /tmp/dev.db，Prisma 指向 /tmp 进行读写。
 */
if (process.env.VERCEL) {
  const tmpDb = "/tmp/dev.db";
  if (!existsSync(tmpDb)) {
    // 构建产物中的 DB 文件（已含种子数据）
    const srcDb = join(process.cwd(), "prisma", "dev.db");
    if (existsSync(srcDb)) {
      copyFileSync(srcDb, tmpDb);
      console.log("[Prisma] Copied DB to /tmp/dev.db");
    }
  }
  process.env.DATABASE_URL = "file:/tmp/dev.db";
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
