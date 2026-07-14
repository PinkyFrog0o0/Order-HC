# === Build stage ===
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm via corepack (锁定版本与 lockfile 一致)
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# 复制 workspace 根文件 + 子包 manifest
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# 安装依赖（含 devDeps，构建需要）
RUN pnpm install --frozen-lockfile

# 复制源码
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages ./packages

# 关键：先生成 Prisma Client，再 build（NestJS 编译需要 prisma 类型）
RUN pnpm --filter @haycargo/api exec prisma generate
RUN pnpm --filter @haycargo/api build

# === Runtime stage ===
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 安装 psql（用于跑 RLS SQL 文件）
RUN apk add --no-cache postgresql-client curl

# 复制构建产物
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/start.sh ./apps/api/start.sh

# 复制生产依赖（精确拷贝，避免 devDeps）
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# 复制 Prisma 生成的 client（位于 node_modules/.prisma 和 @prisma/client）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma

# 复制 ts-node（seed 脚本需要，体积 ~50MB）
COPY --from=builder /app/apps/api/node_modules/ts-node ./apps/api/node_modules/ts-node
COPY --from=builder /app/node_modules/ts-node ./node_modules/ts-node
COPY --from=builder /app/apps/api/node_modules/typescript ./apps/api/node_modules/typescript
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript

# 复制 tsconfig（ts-node 解析路径用）
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json

RUN chmod +x /app/apps/api/start.sh

WORKDIR /app/apps/api

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:3000/v1/system/version || exit 1

CMD ["./start.sh"]
