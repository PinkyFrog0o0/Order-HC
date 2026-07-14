-- 启用多租户行级安全策略 (Row-Level Security)
--
-- 应用层 middleware 已经强制注入 tenant_id，但 RLS 是第二道防线：
-- 即使代码漏掉 WHERE tenant_id = ...，数据库也会拒绝跨租户访问。
--
-- 工作原理：
-- 1. 每个连接启动时执行 `SET LOCAL app.current_tenant = '<uuid>'`
-- 2. RLS 策略读取这个变量来过滤行
-- 3. 超级管理员需要显式 `SET LOCAL app.bypass_rls = 'true'`
--
-- ⚠️ 此迁移必须在 Prisma migrate 之后执行（因为 RLS 引用了 Prisma 创建的表）
-- ⚠️ 所有 CREATE POLICY 用 IF NOT EXISTS 风格的 DROP + CREATE，让脚本可重跑

-- ============================================================
-- 第一步：清理旧 policy（幂等性）
-- ============================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS tenant_isolation_select ON tenants;
  DROP POLICY IF EXISTS tenant_isolation_users ON users;
  DROP POLICY IF EXISTS tenant_isolation_inquiry_orders ON inquiry_orders;
  DROP POLICY IF EXISTS tenant_isolation_inquiry_items ON inquiry_items;
  DROP POLICY IF EXISTS tenant_isolation_inquiry_attachments ON inquiry_attachments;
  DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
  DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
  DROP POLICY IF EXISTS tenant_isolation_quotes ON clearance_quotes;
  DROP POLICY IF EXISTS admin_all_agents ON clearance_agents;
  DROP POLICY IF EXISTS admin_all_cost_configs ON clearance_cost_configs;
  DROP POLICY IF EXISTS admin_all_quote_configs ON clearance_quote_configs;
  DROP POLICY IF EXISTS admin_all_truck_services ON truck_services;
  DROP POLICY IF EXISTS admin_all_dictionary ON dictionary_entries;
EXCEPTION WHEN OTHERS THEN
  -- 表可能还不存在（首次跑），忽略
  NULL;
END $$;

-- ============================================================
-- 第二步：启用 RLS
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_cost_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_quote_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictionary_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 第三步：创建 policy
-- ============================================================

-- tenants 表：用户能查自己所属租户（管理员可查所有）
CREATE POLICY tenant_isolation_select ON tenants
  FOR SELECT
  USING (
    id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- users 表：用户能查同租户的其他人（管理员可查所有）
CREATE POLICY tenant_isolation_users ON users
  USING (
    tenant_id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
    OR tenant_id IS NULL  -- 管理员用户（无 tenant_id）
  );

-- inquiry_orders / items / attachments：按 tenant_id 严格隔离
CREATE POLICY tenant_isolation_inquiry_orders ON inquiry_orders
  USING (
    tenant_id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY tenant_isolation_inquiry_items ON inquiry_items
  USING (
    tenant_id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY tenant_isolation_inquiry_attachments ON inquiry_attachments
  USING (
    tenant_id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- audit_logs：用户可查自己租户的日志（管理员查所有）
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR SELECT
  USING (
    tenant_id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- audit_logs INSERT：允许所有认证用户写入（应用层控制）
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- clearance_quotes：按 tenant_id 严格隔离
CREATE POLICY tenant_isolation_quotes ON clearance_quotes
  USING (
    tenant_id::text = current_setting('app.current_tenant', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- 平台级表（管理端维护，客户端不直接访问）：仅管理员可访问
-- 用 bypass_rls 标志放行（应用层控制只有管理员能调用这些接口）
CREATE POLICY admin_all_agents ON clearance_agents
  USING (current_setting('app.bypass_rls', true) = 'true');

CREATE POLICY admin_all_cost_configs ON clearance_cost_configs
  USING (current_setting('app.bypass_rls', true) = 'true');

CREATE POLICY admin_all_quote_configs ON clearance_quote_configs
  USING (current_setting('app.bypass_rls', true) = 'true');

CREATE POLICY admin_all_truck_services ON truck_services
  USING (current_setting('app.bypass_rls', true) = 'true');

CREATE POLICY admin_all_dictionary ON dictionary_entries
  USING (current_setting('app.bypass_rls', true) = 'true');