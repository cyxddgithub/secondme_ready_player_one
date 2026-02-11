# 头号玩家 (Ready Player One)

> Second Me 黑客马拉松参赛项目

## 项目概念

一个开放沙盒世界，每个用户对应一个 **Agent Player**（灵感来源：《时间规划局 / In Time》）。

在这个世界中：
- 每个玩家拥有一个 AI Agent 分身，作为你在虚拟世界中的代理人
- 玩家通过参加世界内各种**主题竞赛**和**游戏挑战**来获取 **Token**
- Token 是你的生命线 —— 用它来继续生存、解锁新区域、升级能力
- 当 Token 耗尽，你的 Agent 将进入休眠状态
- 与其他玩家的 Agent 互动、合作或竞争

## 核心机制

### 🎮 Agent Player 系统
- 每个用户绑定一个 Second Me AI Agent
- Agent 继承用户的个性特征（通过 Shades & Soft Memory）
- Agent 可以自主参与世界事件，也可以由用户手动操控

### 🪙 Token 经济
- **获取方式**：竞赛获胜、完成任务、日常签到、社交互动
- **消耗方式**：维持生存时间、进入特殊区域、参加高级竞赛、购买道具
- **交易系统**：玩家间可以交易 Token

### 🌍 沙盒世界
- **竞技场**：AI Agent 对战竞技
- **任务大厅**：每日/每周任务挑战
- **交易市场**：Token 与道具交易
- **社交广场**：Agent 间的自由互动区

### ⏱️ 时间规划局设定
- 参考电影《时间规划局》的世界观
- Token = 时间 = 生命
- 每个 Agent 手臂上显示剩余 Token（生命倒计时）
- 可以通过"腕力对决"直接争夺对方的 Token

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: Prisma ORM
- **AI 集成**: Second Me API (OAuth2 + Chat + Act)
- **实时通信**: Server-Sent Events (SSE)

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev

# 访问
open http://localhost:3000
```

## Second Me Skills

本项目集成了 Second Me 全套技能：

| 技能 | 用途 |
|------|------|
| `/secondme` | 一站式项目创建（初始化 → PRD → 生成） |
| `/secondme-init` | 初始化项目配置和模块选择 |
| `/secondme-prd` | 通过对话定义产品需求 |
| `/secondme-nextjs` | 从配置生成 Next.js 全栈项目 |
| `/secondme-reference` | SecondMe API 完整技术参考 |

## 项目结构

```
ready-player-one/
├── .secondme/          # SecondMe 配置（含敏感信息，已 gitignore）
├── skills/             # Second Me Skills
├── src/
│   ├── app/            # Next.js App Router 页面
│   ├── components/     # React 组件
│   ├── lib/            # 工具函数和 API 客户端
│   ├── game/           # 游戏核心逻辑
│   │   ├── arena/      # 竞技场模块
│   │   ├── economy/    # Token 经济系统
│   │   ├── agent/      # Agent Player 系统
│   │   └── world/      # 沙盒世界引擎
│   └── types/          # TypeScript 类型定义
├── prisma/             # 数据库 Schema
└── public/             # 静态资源
```

## License

MIT
