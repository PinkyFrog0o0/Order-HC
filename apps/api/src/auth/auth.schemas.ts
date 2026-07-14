import { z } from 'zod';

/**
 * 登录请求 schema
 */
export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
  password: z.string().min(8).max(128),
  tenant_code: z.string().min(1).max(64).optional(), // 客户端用户登录时必填，管理员可不填
}).refine(
  (data) => Boolean(data.email) || Boolean(data.phone),
  { message: 'Either email or phone is required' },
);

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * 注册请求 schema
 */
export const registerSchema = z.object({
  tenant_code: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * 登录响应
 */
export const loginResponseSchema = z.object({
  access_token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    full_name: z.string(),
    role: z.string(),
    tenant_id: z.string().uuid().nullable(),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;