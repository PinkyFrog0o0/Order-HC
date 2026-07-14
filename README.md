# Haycargo 清关系统

多租户清关/物流业务系统。客户端供货主使用（创建询价单、订单管理），管理端供清关公司内部使用（清关询价/报价、成本/清关行配置、LTL/FTL/港到门拖车）。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design Pro
- **后端**：NestJS + TypeScript + PostgreSQL + Redis
- **Monorepo**：Pnpm workspaces + Turborepo
- **代码质量**：ESLint + Prettier + Husky + lint-staged + commitlint
- **API 校验**：Zod

## 项目结构

```
haycargo/
├── apps/
│   ├── api/          # NestJS 后端
│   └── web/          # React 前端
├── packages/
│   ├── shared/       # 共享 TS 类型 + Zod schema
│   └── eslint-config/ # 统一 ESLint 配置
├── docker-compose.yml # 本地开发依赖 (PG/Redis/MinIO)
├── AGENTS.md          # 项目开发准则（必读）
└── README.md
```

## 快速开始

### 1. 前置条件

- Node.js >= 20.10.0（推荐用 nvm 装）
- Pnpm >= 9.0.0（`npm install -g pnpm`）
- Docker + Docker Compose（启动本地 PG/Redis/MinIO）

### 2. 启动本地依赖

```bash
docker compose up -d
```

这会启动：

- PostgreSQL：`localhost:5432`（用户 `haycargo` / 密码 `haycargo`）
- Redis：`localhost:6379`
- MinIO：`localhost:9001`（控制台，用户 `haycargo` / 密码 `haycargo`）

### 3. 安装依赖

```bash
pnpm install
```

### 4. 配置环境变量

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 5. 启动开发

```bash
pnpm dev
```

- API：`http://localhost:3000`
- Web：`http://localhost:5173`

## 常用命令

```bash
pnpm build         # 构建所有包
pnpm lint          # ESLint 检查
pnpm typecheck     # TypeScript 类型检查
pnpm format        # Prettier 格式化
pnpm clean         # 清理所有构建产物和 node_modules
```

## 开发准则

**开始任何工作前，先读 [AGENTS.md](./AGENTS.md)**。简要四条：

1. **Think Before Coding** — 不确定就问，别猜
2. **Simplicity First** — 用最少的代码解决问题
3. **Surgical Changes** — 只动需要动的地方
4. **Goal-Driven Execution** — 定义成功标准，循环验证

## 业务编号约定

- 询价单：`INQ-{年份}-{租户代码}-{6位流水}`，例：`INQ-2026-XM001-000123`
- 报价单：`QT-{年份}-{租户代码}-{6位流水}`
- 业务单：`BG-{年份}-{租户代码}-{6位流水}`

## License

Private — 内部项目