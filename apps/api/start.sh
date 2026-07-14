#!/bin/sh
# Haycargo API 启动脚本
# 顺序：migrations → RLS → seed → 启动

set -e

cd /app/apps/api

echo "[start] ============================================"
echo "[start] Haycargo API 启动中..."
echo "[start] NODE_ENV=${NODE_ENV}"
echo "[start] PORT=${PORT}"
echo "[start] ============================================"

echo "[start] 1/3 运行 Prisma migrations..."
pnpm exec prisma migrate deploy 2>&1 | tail -30 || {
    echo "[start] ⚠️  Prisma migrate 失败，但尝试继续（可能表已存在）"
}

echo "[start] 2/3 应用 RLS 策略..."
if [ -f "prisma/migrations/manual_rls.sql" ]; then
    psql "$DATABASE_URL" -f prisma/migrations/manual_rls.sql 2>&1 | tail -20 || {
        echo "[start] ⚠️  RLS 应用失败（可能已应用过）"
    }
else
    echo "[start] ⚠️  未找到 manual_rls.sql，跳过"
fi

echo "[start] 3/3 启动 Node 应用..."
exec node dist/main.js
