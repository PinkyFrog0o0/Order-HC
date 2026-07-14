# === Build stage ===
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm via corepack（与 lockfile 一致）
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# 复制 workspace 根 manifest + 各子包 manifest
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# 装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages ./packages

# 生成 Prisma Client 后 build（NestJS 编译需要 prisma 类型）
RUN pnpm --filter @haycargo/api exec prisma generate
RUN pnpm --filter @haycargo/api build

# 用 pnpm deploy 创建自包含的部署包（解析 symlink，包含全部运行时依赖）
RUN pnpm --filter @haycargo/api deploy /tmp/api-deploy
# pnpm deploy 不会带这些手动加的文件，补上
RUN cp -r /app/apps/api/dist /tmp/api-deploy/dist && \
    cp -r /app/apps/api/prisma /tmp/api-deploy/prisma && \
    cp /app/apps/api/start.sh /tmp/api-deploy/start.sh && \
    chmod +x /tmp/api-deploy/start.sh

# === Runtime stage ===
FROM node:20-alpine

WORKDIR /app

# psql（跑 RLS SQL） + curl（healthcheck） + bash（start.sh 用）
RUN apk add --no-cache postgresql-client curl bash

# 复制自包含部署包
COPY --from=builder /tmp/api-deploy /app

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:3000/v1/system/version || exit 1

CMD ["./start.sh"]
