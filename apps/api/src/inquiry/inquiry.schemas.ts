import { z } from 'zod';

/**
 * 创建询价单请求
 *
 * 与 packages/shared/src/schemas.ts 保持同步 — 实际控制器可考虑共用，
 * 这里先独立定义，避免循环依赖
 */
export const createInquirySchema = z.object({
  customer_code: z.string().min(1).max(64),
  trade_type: z.enum(['import', 'export']),
  incoterm: z.enum(['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA']),
  origin_country: z.string().length(3),
  destination_country: z.string().length(3),
  // 起运港（ETD）为非必填项，允许为空（与询价模板一致）
  origin_port: z.string().max(32).optional().default(''),
  destination_port: z.string().min(2).max(32),
  // 汇总数值项：模板中为非必填，允许留空（缺省按 0 存），询价阶段客户未必有精确数据
  total_gross_weight_kg: z.number().nonnegative().optional().default(0),
  total_net_weight_kg: z.number().nonnegative().optional().default(0),
  total_packages: z.number().int().nonnegative().optional().default(0),
  total_value: z.number().nonnegative().optional().default(0),
  currency: z.string().length(3),
  notes: z.string().max(2000).optional(),
  // items 改为可选 — HC 询价模板只有汇总数据，没有商品明细
  // 阶段 2：客户补传 INVOICE 时再补 items
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
        origin_country: z.string().length(3).optional(),
      }),
    )
    .optional(),
  attachment_ids: z.array(z.string().uuid()).optional(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

/**
 * 询价单列表查询参数
 */
export const listInquirySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type ListInquiryQuery = z.infer<typeof listInquirySchema>;

/**
 * 提交询价单请求（草稿 → 已提交）
 */
export const submitInquirySchema = z.object({
  id: z.string().uuid(),
});

export type SubmitInquiryInput = z.infer<typeof submitInquirySchema>;