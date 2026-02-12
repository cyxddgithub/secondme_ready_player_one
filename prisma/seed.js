/**
 * 数据库种子脚本
 * 从 data/db.json 读取数据并写入 SQLite 数据库
 * 用于 Vercel 构建时恢复用户数据
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

async function seed() {
  const dbPath = path.join(__dirname, "..", "data", "db.json");

  if (!fs.existsSync(dbPath)) {
    console.log("[Seed] data/db.json not found, skipping");
    return;
  }

  const raw = fs.readFileSync(dbPath, "utf-8");
  const data = JSON.parse(raw);

  const isEmpty = Object.values(data).every(
    (arr) => !Array.isArray(arr) || arr.length === 0
  );
  if (isEmpty) {
    console.log("[Seed] data/db.json is empty, skipping");
    return;
  }

  const prisma = new PrismaClient();

  try {
    // 按外键依赖顺序导入（无依赖的先导入）

    // 1. User（无依赖）
    for (const item of data.users || []) {
      await prisma.user.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] Users: ${(data.users || []).length}`);

    // 2. Agent（依赖 User）
    for (const item of data.agents || []) {
      await prisma.agent.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] Agents: ${(data.agents || []).length}`);

    // 3. NbaSeason（无依赖）
    for (const item of data.nbaSeasons || []) {
      await prisma.nbaSeason.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] NbaSeasons: ${(data.nbaSeasons || []).length}`);

    // 4. WorldTask（无依赖）
    for (const item of data.worldTasks || []) {
      await prisma.worldTask.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] WorldTasks: ${(data.worldTasks || []).length}`);

    // 5. NbaGame（依赖 NbaSeason, Agent）
    for (const item of data.nbaGames || []) {
      await prisma.nbaGame.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] NbaGames: ${(data.nbaGames || []).length}`);

    // 6. NbaGameStats（依赖 NbaGame, Agent）
    for (const item of data.nbaGameStats || []) {
      await prisma.nbaGameStats.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] NbaGameStats: ${(data.nbaGameStats || []).length}`);

    // 7. NbaSeasonStats（依赖 NbaSeason, Agent）
    for (const item of data.nbaSeasonStats || []) {
      await prisma.nbaSeasonStats.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] NbaSeasonStats: ${(data.nbaSeasonStats || []).length}`);

    // 8. ChatSession（依赖 User）
    for (const item of data.chatSessions || []) {
      await prisma.chatSession.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] ChatSessions: ${(data.chatSessions || []).length}`);

    // 9. ArenaMatch（依赖 Agent）
    for (const item of data.arenaMatches || []) {
      await prisma.arenaMatch.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] ArenaMatches: ${(data.arenaMatches || []).length}`);

    // 10. TokenTransaction（依赖 Agent）
    for (const item of data.tokenTransactions || []) {
      await prisma.tokenTransaction.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] TokenTransactions: ${(data.tokenTransactions || []).length}`);

    // 11. TaskCompletion（依赖 Agent, WorldTask）
    for (const item of data.taskCompletions || []) {
      await prisma.taskCompletion.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] TaskCompletions: ${(data.taskCompletions || []).length}`);

    // 12. ActivityLog（依赖 Agent）
    for (const item of data.activityLogs || []) {
      await prisma.activityLog.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] ActivityLogs: ${(data.activityLogs || []).length}`);

    // 13. Reflection（依赖 Agent）
    for (const item of data.reflections || []) {
      await prisma.reflection.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`[Seed] Reflections: ${(data.reflections || []).length}`);

    console.log("[Seed] Done!");
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((e) => {
  console.error("[Seed] Error:", e);
  process.exit(1);
});
