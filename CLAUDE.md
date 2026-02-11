# 头号玩家 (Ready Player One) - 开发指南

## 项目概述

这是 Second Me 黑客马拉松的参赛项目「头号玩家」。
一个开放沙盒世界，每个用户对应一个 Agent Player，通过参加世界内各种主题竞赛和游戏获取 Token 继续生存。

## 世界观设定（参考《时间规划局》）

- Token = 时间 = 生命
- 每个 Agent 有初始 Token 额度
- Token 持续消耗（类似生命倒计时）
- 通过竞赛、任务、交易获取更多 Token
- Token 耗尽 = Agent 休眠

## 技术要求

- Next.js 14+ with App Router
- TypeScript strict mode
- Tailwind CSS for styling
- Prisma ORM for database
- All user-facing text in Chinese (中文)
- Light theme, minimalist design
- Port 3000 for development

## Second Me API 集成

- Base URL: `https://app.mindos.com/gate/lab`
- OAuth2 授权: `https://go.second.me/oauth/`
- 使用 SSE 进行实时聊天流
- Agent 人格通过 Shades 和 Soft Memory 获取

## 核心模块

1. **auth** - 用户认证（OAuth2 with Second Me）
2. **profile** - 用户/Agent 资料（Shades + Soft Memory）
3. **chat** - AI 对话（流式 SSE）
4. **act** - 结构化行为判断
5. **note** - 笔记系统

## 游戏模块

1. **agent** - Agent Player 创建与管理
2. **economy** - Token 经济系统（获取、消耗、交易）
3. **arena** - 竞技场（Agent vs Agent）
4. **world** - 沙盒世界引擎（区域、事件、NPC）

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run lint     # 代码检查
npx prisma db push  # 同步数据库
```

## 文件约定

- 组件使用 PascalCase: `AgentCard.tsx`
- 工具函数使用 camelCase: `tokenUtils.ts`
- API 路由在 `src/app/api/` 下
- 游戏逻辑在 `src/game/` 下

## Second Me Skills（已集成）

本项目已安装 [mindverse/Second-Me-Skills](https://github.com/mindverse/Second-Me-Skills) 全套技能：

| 技能命令 | 说明 |
|----------|------|
| `/secondme` | 一站式项目创建（初始化 → PRD → 生成） |
| `/secondme-init` | 初始化项目配置和模块选择 |
| `/secondme-prd` | 通过对话定义产品需求 |
| `/secondme-nextjs` | 从配置生成 Next.js 全栈项目 |
| `/secondme-reference` | SecondMe API 完整技术参考 |

技能文件位于 `skills/` 目录，Claude Commands 位于 `.claude/commands/` 目录。

## Speckit Commands（开发工具）

| 命令 | 说明 |
|------|------|
| `speckit.analyze` | 分析需求 |
| `speckit.checklist` | 检查清单 |
| `speckit.clarify` | 需求澄清 |
| `speckit.constitution` | 项目规范 |
| `speckit.implement` | 实现指南 |
| `speckit.plan` | 开发计划 |
| `speckit.specify` | 规格定义 |
| `speckit.tasks` | 任务管理 |
| `speckit.taskstoissues` | 任务转 Issue |
