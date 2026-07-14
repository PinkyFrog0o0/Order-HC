# Haycargo 数据库 Schema 说明

## 文件清单

- `schema.prisma` — Prisma 数据模型定义（单一真相源）
- `migrations/` — Prisma 自动生成的迁移 + 手写的 RLS 脚本

## 核心表（Phase 1）

| 表 | 用途 |
|----|------|
| `tenants` | 租户（货主公司） |
| `users` | 用户（管理员 + 客户端用户） |
| `inquiry_orders` | 询价单主表 |
| `inquiry_items` | 询价单商品明细 |
| `inquiry_attachments` | 询价单附件（装箱单/发票/Excel） |
| `audit_logs` | 全局审计日志 |

## Phase 2+ 才会建的表

- `clearance_quotes` 报价单
- `clearance_orders` 业务单
- `clearance_agents` 清关行
- `cost_configs` 成本配置
- `quote_configs` 报价配置
- `truck_services` 卡车服务（LTL/FTL/港到门）

## 多租户隔离 — 两道防线

### 第一道：应用层（TenantMiddleware + JWT）

每个请求自动注入 `tenant_id`，Prisma 查询全部强制带 `where: { tenantId }`。

### 第二道：数据库 RLS（PostgreSQL Row-Level Security）

即使应用层漏掉 `tenant_id`，数据库也会拒绝跨租户读写。

启用方法：

```bash
# 应用 schema 后单独跑一次（Prisma migrate 不会自动启用 RLS）
psql $DATABASE_URL -f prisma/migrations/manual_rls.sql
```

## 迁移工作流

```bash
# 改完 schema.prisma 后
pnpm --filter @haycargo/api exec prisma migrate dev --name <改动说明>

# 生成 Prisma Client
pnpm --filter @haycargo/api exec prisma generate

# 部署到生产
pnpm --filter @haycargo/api exec prisma migrate deploy

# 单独跑 RLS 脚本（首次部署 + 重大 schema 变更后）
psql $DATABASE_URL -f prisma/migrations/manual_rls.sql
```

## 关键设计决策

1. **UUID 主键** — 不暴露业务量（攻击者无法枚举订单）
2. **业务编号单独字段** — `business_number` 用 `INQ-2026-XM001-000123` 格式，UUID 不直接暴露给用户
3. **金额用 Decimal** — 不用 Float（财务数据严禁浮点）
4. **软删除** — `deleted_at` 字段，清关行业出问题时监管要查
5. **审计字段冗余** — 列表查询频繁的字段（total_*）冗余到主表，避免 JOIN
6. **附件解析结果** — 存 `parsed_data` JSONB + `parse_status`，原始文件 + 解析结果双重保留