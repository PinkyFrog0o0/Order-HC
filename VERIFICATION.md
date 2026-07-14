# 骨架验证清单

请在你本地（Windows）按顺序执行，复制粘贴结果回我，我帮你 debug。

## 前置条件

```bash
node -v      # 应该 >= v20.10.0
pnpm -v      # 应该 >= 9.0.0
docker -v    # 任意版本
```

如果 pnpm 没装：

```bash
npm install -g pnpm
```

## Step 1 — 安装依赖

```bash
cd C:\Users\78741\Desktop\青提派\haycargo
pnpm install
```

**预期**：所有 workspace 包的依赖都装上，无 peer dep 错误。

**如果失败**：把错误信息贴给我。常见原因：
- Node 版本不够 → 用 `nvm use` 切到 20.10+
- 网络问题 → 配国内镜像：`pnpm config set registry https://registry.npmmirror.com`

## Step 2 — 启动本地基础设施

```bash
docker compose up -d
docker compose ps
```

**预期**：

```
NAME                     STATUS              PORTS
haycargo-postgres        Up (healthy)        0.0.0.0:5432->5432/tcp
haycargo-redis           Up (healthy)        0.0.0.0:6379->6379/tcp
haycargo-minio           Up (healthy)        0.0.0.0:9000-9001->9000-9001/tcp
haycargo-minio-init      Exited (0)
```

minio-init Exited (0) 是正常的，它只跑一次。

## Step 3 — 复制环境变量

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Step 4 — 类型检查

```bash
pnpm typecheck
```

**预期**：所有包都通过 TS 检查，无错误。

## Step 5 — 构建

```bash
pnpm build
```

**预期**：

- `@haycargo/shared` 构建成功
- `@haycargo/api` 构建成功（dist/ 下有 main.js）
- `@haycargo/web` 构建成功（dist/ 下有 index.html + assets/）

## Step 6 — 启动 API

```bash
cd apps/api
pnpm dev
```

**预期输出**：

```
[Nest] LOG [Bootstrap] Haycargo API running on http://localhost:3000/v1
```

**测试健康检查**：

```bash
curl http://localhost:3000/v1/health
```

应返回：

```json
{
  "status": "ok",
  "timestamp": "2026-07-13T...",
  "version": "0.1.0",
  "checks": { "database": "ok", "redis": "ok", "storage": "ok" }
}
```

**测试租户中间件**：

不带 header 应返回 401：

```bash
curl -i http://localhost:3000/v1/health
# 注意：health 是公开路径，不会被拦
```

带合法 header 应通过（任意 UUID 即可）：

```bash
curl -H "x-tenant-id: 12345678-1234-1234-1234-123456789012" http://localhost:3000/v1/health
```

## Step 7 — 启动 Web

另开一个终端：

```bash
cd apps/web
pnpm dev
```

**预期**：浏览器打开 http://localhost:5173，看到登录页。

**端到端测试**：

1. 输入任意 tenant_id（UUID 格式）+ 用户名 + 密码
2. 点登录 → 应跳转到首页，4 个统计卡片（数字都是 0）
3. 左侧菜单点"询价单" → 看到空列表 + 创建按钮
4. 点"创建询价单" → 看到 4 步步骤条

## Step 8 — Husky 设置（可选，但建议）

```bash
pnpm exec husky init
chmod +x .husky/pre-commit .husky/commit-msg
# 然后按 HUSKY_SETUP.md 替换默认 hooks 内容
```

## 完成后请告诉我

1. 哪个步骤失败了？错误信息是什么？
2. API 健康检查返回的 JSON 是什么？
3. Web 登录后能不能跳转？

收到结果后我会进入 Phase 1 的真实开发（数据库 schema + Excel 解析）。