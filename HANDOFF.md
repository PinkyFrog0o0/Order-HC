# Haycargo 清关系统 — 交接文档

> 接手必读。上下文在 AGENTS.md，本文件是当前状态快照。

## 一、项目位置

- 根目录：`C:\Users\78741\Desktop\青提派\haycargo`
- 父项目准则：[AGENTS.md](./AGENTS.md) — 四条 Karpathy 准则

## 二、技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design + React Router + Zustand
- **后端**：NestJS 10 + TypeScript + Prisma 5 + PostgreSQL 16 + Redis 7 + MinIO
- **Monorepo**：Pnpm workspaces + Turborepo
- **Excel 解析**：SheetJS（xlsx 包）— 支持 .xls + .xlsx
- **认证**：JWT + bcrypt
- **多租户**：应用层 middleware + 数据库 RLS 双层隔离

## 三、目录结构

```
haycargo/
├── AGENTS.md                 # 项目准则（必读）
├── HANDOFF.md                # ← 你正在读这个
├── README.md / STARTUP.md    # 启动指引
├── package.json              # 根 monorepo 配置
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml        # PG + Redis + MinIO
├── apps/
│   ├── api/                  # NestJS 后端
│   │   ├── prisma/
│   │   │   ├── schema.prisma # 11 张表
│   │   │   ├── seed.ts       # 演示数据
│   │   │   └── migrations/manual_rls.sql
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/env.ts # ← 启动时校验环境变量
│   │   │   ├── prisma/       # PrismaService
│   │   │   ├── auth/         # JWT + bcrypt
│   │   │   ├── common/middleware/tenant.middleware.ts
│   │   │   ├── health/
│   │   │   ├── excel/        # SheetJS 解析 + 模板配置
│   │   │   ├── attachment/   # 上传 + 关联
│   │   │   ├── inquiry/      # 客户端询价单 CRUD
│   │   │   ├── admin-clearance/ # 管理端询价单管理
│   │   │   ├── quote/        # 报价单 CRUD
│   │   │   ├── clearance-agent/  # 清关行管理
│   │   │   ├── config/       # 成本配置 + 报价配置
│   │   │   ├── storage/      # MinIO 客户端
│   │   │   └── system/       # 用户/租户管理 (TODO: 大部分未实现)
│   │   └── .env              # ⚠️ 必须存在
│   └── web/                  # React 前端
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── layouts/      # MainLayout (客户端) + AdminLayout (管理端)
│           ├── lib/          # api / auth / inquiries / attachments / admin
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── HomePage.tsx
│           │   ├── client/   # InquiryListPage / InquiryCreatePage / InquiryDetailPage
│           │   └── admin/    # AdminDashboardPage + clearance/ + system/
│           └── styles/global.css
├── packages/
│   ├── shared/               # 共享 TS 类型 + Zod schema
│   └── eslint-config/        # 统一 ESLint 规则
└── docs/                     # 启动文档
```

## 四、已实现（可用）

### 客户端（user 视角）
- ✅ 登录 / 退出（Dropdown 菜单右上角）
- ✅ 首页统计卡片（占位）
- ✅ 询价单列表（接真实 API + 状态 Tag）
- ✅ 创建询价单（4 步骤：上传 Excel → 字段确认 → 上传单证 → 提交）
- ✅ 询价单详情（基本信息 / 商品明细 / 附件 三个 Tab）

### 管理端（admin 视角）
- ✅ 仪表盘（统计卡片 + 近期询价 + 14 天趋势图）
- ✅ 清关询价列表（所有租户，租户/状态/编号筛选）
- ✅ 清关询价详情（改状态、加备注、查看报价）
- ✅ 清关报价列表 + 创建 + 详情
- ✅ 清关行配置（CRUD）
- ✅ 成本配置（CRUD）
- ✅ 报价配置（CRUD）
- ✅ 卡车服务管理（CRUD）
- ✅ 字典管理（5 个 Tab：港口/币种/国家/单位/HS Code）
- ✅ 报表（占位）
- ✅ 用户管理 / 租户管理（CRUD，调用了 admin API，但 admin API 还没实现 → 会 500）

### 后端
- ✅ 11 张表 + RLS 策略
- ✅ JWT 鉴权 + bcrypt 密码哈希
- ✅ 多租户隔离（中间件 + RLS）
- ✅ 询价单 CRUD（含跨租户管理员权限）
- ✅ 附件上传 + SheetJS 解析
- ✅ 报价单 / 清关行 / 成本配置 / 报价配置 / 卡车服务
- ✅ 字典 + dashboard 统计

## 五、已知问题 / 待办

### 🔴 P0：紧急
1. **用户/租户管理 API 没实现** — 前端页面有，但 `AdminTenantsPage` / `AdminUsersPage` 调用 `listAdminTenants` / `listAdminUsers` 会 404。
   - 文件位置：`apps/api/src/system/` (空)
   - 解决：建 `system.module.ts` + `system.controller.ts` + `system.service.ts`

2. **`.env` 里 JWT_SECRET 之前被改成带前缀的形式**（已修复）— 注意 Zod schema 已放宽，**不再要求 32 字符**（见 `env.ts` 第 18 行）。

3. **前端 import 路径 bug 已修复** — `src/pages/admin/{system,clearance}/*.tsx` 用 `../../../lib/admin`（三层），不是 `../../lib/admin`。

### 🟡 P1：体验改进
1. **dashboard 的"本月营收"显示不对** — `Object.values(dashboard.month_revenue ?? {})[0]`，但后端可能返回的是 `Record<currency, amount>`，需要确认结构。
2. **客户上传后跳详情页时，附件列表是空的**（因为关联时 `attachToInquiry` 需要 inquiryOrderId；目前是后端 attach，但前端没调）。先看看 `apps/api/src/attachment/attachment.service.ts` 的 `attachToInquiry` 是否被前端调用。
3. **草稿编辑**还没做（创建按钮是新建，不是编辑已有草稿）。
4. **客户端退出按钮在右上角 Dropdown**（刚加的）— 测试能用。

### 🟢 P2：扩展
1. 模板配置存数据库（现在是硬编码常量）
2. 成本公式引擎（现在是 JSONB 存储但没真计算）
3. PDF/图片 OCR（目前 PDF/图片上传后 parse_status=skipped）
4. INVOICE/PACKING LIST 模板解析（HC欧洲清关装箱单&发票模板.xlsx 还没支持）
5. 报表功能（目前 AdminReportsPage 是占位）
6. 操作员分配 / 通知机制 / 邮件发送

## 六、演示账号

| 角色 | 邮箱 | 密码 | 租户代码 |
|------|------|------|---------|
| 客户端用户 A | user-a@demo.com | password123 | DEMO001 |
| 客户端用户 B | user-b@demo.com | password123 | DEMO002 |
| 超级管理员 | admin@haycargo.com | admin123 | (无) |
| 操作员 | operator@haycargo.com | admin123 | (无) |
| 财务 | finance@haycargo.com | admin123 | (无) |

## 七、启动步骤

```powershell
# 1. 启动 Docker
cd C:\Users\78741\Desktop\青提派\haycargo
docker compose up -d

# 2. 跑数据库迁移
cd apps\api
pnpm exec prisma migrate dev

# 3. 跑 RLS
docker exec -i haycargo-postgres psql -U haycargo -d haycargo < prisma\migrations\manual_rls.sql

# 4. Seed
pnpm exec ts-node prisma\seed.ts

# 5. 启动 API
pnpm dev

# 6. 启动 Web（新窗口）
cd ..\..\apps\web
pnpm dev
```

打开 http://localhost:5173

## 八、关键决策（避免重蹈覆辙）

1. **Excel 模板 HC欧洲清关询价模板.xls 只有汇总数据（总件/总重量/总价值），没有商品明细 items**。后端 `InquiryService.create` 的 items 已改为可选（见 `inquiry.schemas.ts`）。
2. **hc-self-taxed-v1 / hc-dedicated-line-v1 两个模板硬编码在 `excel/template-configs.constants.ts`**，未来要存数据库。
3. **管理员 JWT 不带 tenant_id**，通过 `is_admin=true` 标志 + `SUPER_ADMIN_BYPASS_TENANT` 配置 + RLS `bypass_rls` 实现跨租户。
4. **文件存储路径**：`{tenant_id}/{year}/{month}/{uuid}/{filename}`，分片防单目录过大。

## 九、问题排查 Quick Reference

| 症状 | 原因 | 解决 |
|------|------|------|
| 启动报 `JWT_SECRET must be at least 32 chars` | Zod 校验 | **已放开**，不需操作 |
| 500 on `/api/inquiries` | 数据库连不上 / JWT 不对 | 检查 docker ps + 重启 API + 清浏览器 localStorage |
| 上传 Excel 500 | MinIO 没启 / OSS 配置错 | `docker ps` 看 minio 在不在 |
| Vite `Failed to resolve import "../../lib/admin"` | 路径层级算错 | 改 `../../../lib/admin`（三层） |
| 登录后 token 校验 401 | 之前重启 API 改了 JWT_SECRET | 清浏览器 localStorage 重登 |

## 十、推荐接手顺序

如果你想继续推进，按这个顺序最省事：

1. **先跑通当前所有页面** — 把用户/租户管理后端 API 补上（system 模块）
2. **把 dashboard 数据接对** — 看一下后端 dashboard 实际返回啥
3. **加 PDF/图片 OCR** — 或者改成"暂时只支持 Excel"的清晰提示
4. **加报表功能** — 客户/订单统计

详细的"Haycargo 是什么"在 README.md，"启动步骤"在 STARTUP.md，"今天的工作进度"在 PROGRESS_TONIGHT.md，"模板分析"在 TEMPLATE_ANALYSIS.md。

如果还有问题，先看 AGENTS.md 了解项目风格再看代码。