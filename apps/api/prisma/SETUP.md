# 数据库迁移 + Seed 流程

## 一次性设置（本地开发）

```bash
# 1. 启动依赖
docker compose up -d

# 2. 生成 Prisma Client
pnpm --filter @haycargo/api prisma:generate

# 3. 应用 schema 到数据库（首次会创建 migration）
pnpm --filter @haycargo/api exec prisma migrate dev --name init

# 4. 启用 RLS（Prisma 不管这个）
pnpm --filter @haycargo/api prisma:rls

# 5. 填演示数据
pnpm --filter @haycargo/api exec ts-node prisma/seed.ts
```

## 演示账号

| 角色 | 凭据 |
|------|------|
| Tenant A 客户端用户 | `user-a@demo.com` / `password123` (tenant_code: DEMO001) |
| Tenant B 客户端用户 | `user-b@demo.com` / `password123` (tenant_code: DEMO002) |
| 管理员 | `admin@haycargo.com` / `admin123` |

## Schema 变更流程

```bash
# 1. 改 prisma/schema.prisma
# 2. 生成 migration
pnpm --filter @haycargo/api exec prisma migrate dev --name <说明>

# 3. 如果是 RLS 相关，追加到 manual_rls.sql 并重跑
pnpm --filter @haycargo/api prisma:rls
```

## 端到端测试

```bash
pnpm --filter @haycargo/api exec ts-node test/integration/tenant-isolation.test.ts
```

会输出彩色 ✓/✗ 标记，并清理测试数据。

## 故障排查

### `prisma migrate dev` 失败：relation already exists

通常是因为表已经手动建过。删除重建：

```bash
docker compose down -v
docker compose up -d
pnpm --filter @haycargo/api exec prisma migrate dev --name init
```

### RLS 拒绝查询

`SET app.bypass_rls = 'true'` 暂时绕过（仅调试用）。

### Prisma Client 类型未生成

```bash
pnpm --filter @haycargo/api prisma:generate
```