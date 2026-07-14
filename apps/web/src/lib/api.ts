import axios, { AxiosError, AxiosInstance } from 'axios';

import type { ApiError } from '@haycargo/shared';

/**
 * 前后端共享的 API base URL（来自 .env）
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const TENANT_HEADER = import.meta.env.VITE_TENANT_HEADER ?? 'x-tenant-id';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

/**
 * 请求拦截：注入租户 ID
 *
 * 当前从 localStorage 读，后续接 JWT 时改成从 token 解出来
 */
apiClient.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('haycargo:tenant_id');
  if (tenantId) {
    config.headers.set(TENANT_HEADER, tenantId);
  }
  const token = localStorage.getItem('haycargo:token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * 响应拦截：把后端错误归一化成 ApiError
 * 对 zod 校验错误（nestjs-zod 返回 { message, errors: [{path,message}] }），
 * 把具体失败字段折进 message，避免前端只显示笼统的 "Validation failed"
 */
apiClient.interceptors.response.use(
  (response) => response,
  (
    error: AxiosError<
      ApiError & { errors?: Array<{ path?: Array<string | number>; message?: string }> }
    >,
  ) => {
    const data = error.response?.data;
    let message = data?.message ?? error.message;
    const zodErrors = data?.errors;
    if (Array.isArray(zodErrors) && zodErrors.length > 0) {
      const fields = zodErrors
        .map((e) => `${e.path?.join('.') || '?'}: ${e.message ?? ''}`)
        .join('; ');
      message = `${data?.message ?? '请求校验失败'} (${fields})`;
    }
    const apiError: ApiError = {
      code: data?.code ?? 'UNKNOWN_ERROR',
      message,
      details: data?.details,
    };
    return Promise.reject(apiError);
  },
);