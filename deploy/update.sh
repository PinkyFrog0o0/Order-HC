#!/bin/bash
# Haycargo 部署更新脚本
# 用法:在 /opt/haycargo 目录下,执行 bash deploy/update.sh
#
# 流程:git pull → pnpm install(如需)→ build → 重启服务 → 验证

set -e

cd /opt/haycargo

echo "=== 1) 拉最新代码 ==="
git pull --rebase origin main 2>&1 | tail -5

echo "=== 2) 装依赖(仅当 package.json 变时,会很快) ==="
pnpm install --frozen-lockfile --reporter=append-only 2>&1 | tail -3

echo "=== 3) Prisma:迁移 + generate ==="
cd apps/api
pnpm exec prisma generate 2>&1 | tail -2
pnpm exec prisma migrate deploy 2>&1 | tail -3
cd /opt/haycargo

echo "=== 4) Build web(api build 必须,因为它会跑 polyfill-crypto.cjs) ==="
cd apps/web
node --require ./polyfill-crypto.cjs ./node_modules/vite/bin/vite.js build 2>&1 | tail -5
cd /opt/haycargo
cd apps/api
pnpm build 2>&1 | tail -3
cd /opt/haycargo

echo "=== 5) 重启 API ==="
systemctl restart haycargo-api
sleep 4
systemctl is-active haycargo-api

echo "=== 6) 健康检查 ==="
curl -s -o /dev/null -w "/v1/health: HTTP %{http_code}\n" --max-time 8 http://127.0.0.1:7790/v1/health
curl -s -o /dev/null -w "公网 7700: HTTP %{http_code}\n" --max-time 10 http://127.0.0.1:7700/

echo "=== ✅ 完成 ==="
