/**
 * 业务类型定义
 *
 * 类型优先从 Zod schema 推导（见 schemas.ts），这里只放：
 * 1. 不经过网络的纯领域模型
 * 2. 工具类型
 */

/**
 * 当前用户上下文（中间件注入到 request）
 */
export interface UserContext {
  user_id: string;
  tenant_id: string | null; // 超级管理员可以为 null
  role: string;
  permissions: string[];
  is_admin: boolean;
}

/**
 * 分页请求
 */
export interface PaginationParams {
  page: number; // 1-based
  page_size: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * API 错误响应统一格式
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}