#!/bin/bash
set -e

echo "========================================="
echo "  头号玩家 - 环境初始化"
echo "========================================="

# 1. 安装依赖
echo ">>> 安装 npm 依赖..."
npm install

# 2. 生成 Codespaces 回调 URL
if [ -n "$CODESPACE_NAME" ]; then
  CALLBACK_URL="https://${CODESPACE_NAME}-3000.app.github.dev/api/auth/callback"
  echo ">>> 检测到 Codespaces 环境"
  echo ">>> 回调 URL: ${CALLBACK_URL}"
else
  CALLBACK_URL="http://localhost:3000/api/auth/callback"
  echo ">>> 本地环境，使用 localhost 回调"
fi

# 3. 生成 .env.local
# 优先使用 Codespaces Secrets，否则使用默认占位符
CLIENT_ID="${SECONDME_CLIENT_ID:-请填写你的ClientID}"
CLIENT_SECRET="${SECONDME_CLIENT_SECRET:-请填写你的ClientSecret}"

cat > .env.local << EOF
# SecondMe OAuth2 配置
SECONDME_CLIENT_ID=${CLIENT_ID}
SECONDME_CLIENT_SECRET=${CLIENT_SECRET}
SECONDME_REDIRECT_URI=${CALLBACK_URL}

# SecondMe API
SECONDME_API_BASE_URL=https://app.mindos.com/gate/lab
SECONDME_OAUTH_URL=https://go.second.me/oauth/
SECONDME_TOKEN_ENDPOINT=https://app.mindos.com/gate/lab/api/oauth/token/code
SECONDME_REFRESH_TOKEN_ENDPOINT=https://app.mindos.com/gate/lab/api/oauth/token/refresh

# 数据库（PostgreSQL - Vercel 部署请使用 Neon 等云数据库）
DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/readyplayerone}"
EOF

echo ">>> .env.local 已生成"

# 4. 初始化数据库
echo ">>> 初始化 SQLite 数据库..."
npx prisma generate
npx prisma db push

echo ""
echo "========================================="
echo "  初始化完成！"
echo "========================================="
echo ""
echo "启动命令:  npm run dev"
echo ""

if [ -n "$CODESPACE_NAME" ]; then
  echo "重要：请在 SecondMe 开发者后台添加以下回调地址："
  echo "  ${CALLBACK_URL}"
  echo ""
  echo "步骤："
  echo "  1. 访问 https://develop.second.me"
  echo "  2. 找到你的 App → 编辑 Redirect URIs"
  echo "  3. 添加上面的 URL"
  echo ""
fi
