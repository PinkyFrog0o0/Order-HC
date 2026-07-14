#!/bin/sh
# Haycargo API 启动脚本（运行时 /app 为根目录）
# 顺序：migrations → RLS → 启动 node

set -e

cd /app

echo "[start] ============================================"
echo "[start] Haycargo API 启动中"
echo "[start] NODE_ENV=${NODE_ENV}  PORT=${PORT}"
echo "[start] ============================================"

echo "[start] 1/3 Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy 2>&1 | tail -30 || \
    echo "[start] ⚠️  Prisma migrate 失败（可能表已存在）"

echo "[start] 2/3 RLS 策略..."
if [ -f "prisma/migrations/manual_rls.sql" ]; then
    psql "$DATABASE_URL" -f prisma/migrations/manual_rls.sql 2>&1 | tail -20 || \
        echo "[start] ⚠️  RLS 应用失败（可能已应用过）"
else
    echo "[start] ⚠️  未找到 manual_rls.sql，跳过"
fi

echo "[start] 3/3 启动 Node..."
exec node dist/main.js
