# Haycargo 启动脚本（PowerShell）

## 一次性设置（约 5-10 分钟）

### 1. 安装依赖
```powershell
cd C:\Users\78741\Desktop\青提派\haycargo
pnpm install
```

### 2. 启动本地基础设施（PG + Redis + MinIO）
```powershell
# 如果之前起过同名容器，先清理：
docker rm -f haycargo-postgres haycargo-redis haycargo-minio haycargo-minio-init
docker compose up -d
docker compose ps
```

**预期**：4 个容器都是 `Up` 或 `Up (healthy)`

### 3. 复制环境变量
```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
```

### 4. JWT_SECRET 校验已放开（任意长度都行），但 .env 必须有这个 key

### 5. 生成 Prisma Client
```powershell
pnpm --filter @haycargo/api prisma:generate
```

### 6. 应用 schema 到数据库（首次会创建 migration 文件）
```powershell
cd apps\api
pnpm exec prisma migrate dev
```
**预期输出**：`Your database is now in sync with your schema.`

### 7. 启用 RLS（行级安全策略）
用 Docker 替代 psql（Windows 默认没装 psql）：
```powershell
docker exec -i haycargo-postgres psql -U haycargo -d haycargo < prisma\migrations\manual_rls.sql
```
**预期**：无报错。

### 8. 填演示数据
```powershell
pnpm exec ts-node prisma\seed.ts
```
**预期输出**：
```
Seed 完成：
  租户: ...
  客户端账号: ...
  管理端账号: ...
  清关行: 2 个
  卡车服务: 3 个
  字典: 7 港口 + 5 币种 + 5 国家
```

---

## 启动开发服务（每次开发都要做）

开 **两个** PowerShell 窗口：

### 窗口 1：API
```powershell
cd C:\Users\78741\Desktop\青提派\haycargo\apps\api
pnpm dev
```
**预期日志**：
```
[Bootstrap] Haycargo API running on http://localhost:3000/v1
[PrismaService] Database connected
```

### 窗口 2：Web
```powershell
cd C:\Users\78741\Desktop\青提派\haycargo\apps\web
pnpm dev
```
**预期**：浏览器打开 http://localhost:5173

---

## 验证清单

✅ **健康检查**（窗口 1 跑着的时候，新开窗口 3）：
```powershell
curl http://localhost:3000/v1/health
```
应该返回 JSON 含 `status: "ok"` 和 `database: "ok"`

✅ **Web 登录**：
1. 浏览器打开 http://localhost:5173
2. 客户端用 `DEMO001` / `user-a@demo.com` / `password123`
3. 管理端用 `admin@haycargo.com` / `admin123`

✅ **Excel 上传测试**：
1. 客户端登录后点"创建询价单"
2. 拖入 `C:\Users\78741\Desktop\青提派\haycargo\Docs\HC欧洲清关询价模板.xls`
3. 应识别为 `HC 欧洲清关询价 - 自税`，显示客户填的值表

---

## 常见错误

### `pnpm` 不识别
```powershell
npm install -g pnpm
```

### 容器名冲突（之前起过同名）
```powershell
docker rm -f haycargo-postgres haycargo-redis haycargo-minio haycargo-minio-init
docker compose up -d
```

### `prisma migrate dev` 失败：relation already exists
```powershell
docker compose down -v
docker compose up -d
# 重跑 step 5-8
```

### `psql` 不识别（Windows 默认没装）
用 Docker 替代 prisma:rls 脚本：
```powershell
docker exec -i haycargo-postgres psql -U haycargo -d haycargo < prisma\migrations\manual_rls.sql
```

### 端口被占用
```powershell
# 查谁占用 3000
netstat -ano | findstr :3000
# 杀进程（替换 PID）
taskkill /PID <pid> /F
```

### Web 端上传 Excel 后报 401 / 403
- 检查是否登录成功（localStorage 里有 haycargo:token）
- JWT_SECRET 校验已放开，任意长度都行
- 重启 API 服务

### 上传 500 错误
1. 确认 MinIO 容器在跑：`docker ps | findstr minio`
2. 看 API 窗口的红字 ERROR 堆栈
3. 99% 是 MinIO 没启

---

## 任何步骤卡住

把**完整的错误信息**（从 PowerShell 复制出来）发给我，我帮你 debug。