/**
 * Zod schemas — 跨网络传输数据的单一真相源
 *
 * 规则：
 * 1. 所有 API 请求/响应 DTO 必须先有 Zod schema
 * 2. TS 类型用 z.infer<> 推导，不要单独写 interface
 * 3. 字段命名：snake_case（匹配数据库）
 */

import { z } from 'zod';

/**
 * 通用字段
 */
export const idSchema = z.string().uuid();
export const tenantIdSchema = z.string().uuid();
export const timestampSchema = z.string().datetime();

/**
 * 创建询价单请求
 */
export const createInquiryOrderSchema = z.object({
  customer_code: z.string().min(1).max(64),
  trade_type: z.enum(['import', 'export']),
  origin_country: z.string().length(3), // ISO 3166-1 alpha-3
  destination_country: z.string().length(3),
  origin_port: z.string().min(2).max(32),
  destination_port: z.string().min(2).max(32),
  incoterm: z.enum(['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA']),
  total_gross_weight_kg: z.number().positive(),
  total_net_weight_kg: z.number().positive(),
  total_packages: z.number().int().positive(),
  total_value: z.number().positive(),
  currency: z.string().length(3),
  items: z
    .array(
      z.object({
        hs_code: z.string().min(6).max(12),
        description: z.string().min(1).max(500),
        quantity: z.number().positive(),
        unit: z.string().min(1).max(20),
        unit_price: z.number().positive(),
        gross_weight_kg: z.number().positive(),
        net_weight_kg: z.number().positive(),
        packages: z.number().int().positive(),
      }),
    )
    .min(1),
  attachment_ids: z.array(z.string().uuid()).optional(),
});

export type CreateInquiryOrderInput = z.infer<typeof createInquiryOrderSchema>;

/**
 * 询价单响应
 */
export const inquiryOrderResponseSchema = createInquiryOrderSchema.extend({
  id: idSchema,
  tenant_id: tenantIdSchema,
  business_number: z.string(),
  status: z.string(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type InquiryOrderResponse = z.infer<typeof inquiryOrderResponseSchema>;

/**
 * 健康检查响应
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: timestampSchema,
  version: z.string(),
  checks: z.object({
    database: z.enum(['ok', 'down']),
    redis: z.enum(['ok', 'down']),
    storage: z.enum(['ok', 'down']),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;