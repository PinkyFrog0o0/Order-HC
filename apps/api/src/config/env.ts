/**
 * 环境变量校验（启动时强制校验必填项）
 *
 * 任何一个必填变量缺失都会让进程启动失败，而不是运行到一半才报错。
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_VERSION: z.string().default('v1'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET required').default('haycargo-dev-secret-please-change-in-prod-32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  OSS_ENDPOINT: z.string().url(),
  OSS_REGION: z.string().default('us-east-1'),
  OSS_ACCESS_KEY: z.string().min(1),
  OSS_SECRET_KEY: z.string().min(1),
  OSS_BUCKET: z.string().min(1),
  OSS_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  /**
   * 对外可访问的 OSS 基础 URL（如 CDN / MinIO 公开 endpoint）。
   * 留空则回落到 OSS_ENDPOINT + bucket（开发用 MinIO 默认布局）。
   */
  OSS_PUBLIC_BASE_URL: z.string().url().optional(),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  TENANT_HEADER: z.string().default('x-tenant-id'),
  SUPER_ADMIN_BYPASS_TENANT: z.coerce.boolean().default(true),

  /**
   * 检查更新（GitHub Releases）。
   * GITHUB_REPO 格式 "owner/name"；留空则不检查更新，接口返回 configured=false。
   * GITHUB_TOKEN 可选：私有仓库或提高 API 速率限制时用。
   */
  GITHUB_REPO: z.string().default(''),
  GITHUB_TOKEN: z.string().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const messages = Object.entries(formatted)
      .map(([key, errors]) => `  - ${key}: ${(errors ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}