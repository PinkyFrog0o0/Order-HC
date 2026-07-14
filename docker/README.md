# Docker / 本地开发

本目录存放 docker-compose 启动所需的配置文件。

## 服务列表

| 服务 | 端口 | 凭据 |
|------|------|------|
| PostgreSQL | 5432 | haycargo / haycargo |
| Redis | 6379 | 无 |
| MinIO API | 9000 | haycargo / haycargo |
| MinIO Console | 9001 | haycargo / haycargo |

## 常用命令

```bash
# 启动
docker compose up -d

# 查看日志
docker compose logs -f postgres

# 停止（保留数据）
docker compose down

# 重置（删除所有数据，慎用）
docker compose down -v

# 进入 PostgreSQL CLI
docker exec -it haycargo-postgres psql -U haycargo -d haycargo

# 进入 Redis CLI
docker exec -it haycargo-redis redis-cli
```

MinIO Console：http://localhost:9001

## 与 apps/api 的对应关系

`apps/api/.env` 里的连接串（默认）：

```
DATABASE_URL=postgresql://haycargo:haycargo@localhost:5432/haycargo
REDIS_URL=redis://localhost:6379
OSS_ENDPOINT=http://localhost:9000
OSS_ACCESS_KEY=haycargo
OSS_SECRET_KEY=haycargo
OSS_BUCKET=haycargo-files
```