-- PostgreSQL 初始化脚本（首次启动时自动执行）
-- 用于启用多租户隔离必需的扩展

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID 生成
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- 加密函数
CREATE EXTENSION IF NOT EXISTS "citext";        -- 大小写不敏感文本

-- 注意：
-- 1. 业务表 schema 在 Phase 1 数据库设计阶段创建，本文件只放扩展
-- 2. RLS（行级安全策略）将在应用表创建后开启
-- 3. 审计日志表（audit_logs）也将在那时创建