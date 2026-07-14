# 已知隐患 / 待办记录

> 这些是已定位、但按业务决策暂缓处理的问题。修复前需产品/业务确认口径。

## 1. 询价单必填字段与 HC 模板"非必填"不一致 —— ✅ 已解决（2026-07-14）

- **位置**：`apps/api/src/inquiry/inquiry.schemas.ts` — `createInquirySchema`
- **原问题**：`total_gross_weight_kg / total_net_weight_kg / total_packages / total_value` 后端要求**必填且为正**（`.positive()`），与 HC 模板"非必填"矛盾，客户留空提交时报 400 "Validation failed"。
- **处理**：按业务决策放宽为**可选**，改为 `z.number().nonnegative().optional().default(0)`（`total_packages` 另加 `.int()`）。留空按 `0` 存（4 列均为 NOT NULL 数值，存 0 合法，**无需数据库迁移**）。
- **口径**：允许"0 重量 / 0 货值"的询价单进入报价流程，后续由管理端补全。

## 2. destination_port 数据库列为 CHAR(3)，容不下长港口名

- **位置**：`apps/api/prisma/schema.prisma` — `InquiryOrder.destinationPort String @db.Char(3)`
- **现状**：目的港列固定 3 字符。`RTM`（鹿特丹）正好 3 位可用，但 `SHANGHAI`、`NINGBO` 等超 3 字符的目的港会被 **数据库直接拒绝**。
- **对比**：zod schema 允许 `min(2).max(32)`，与 DB 的 `CHAR(3)` 不一致；疑似从 `destination_country`（Char(3)）复制而来的笔误。
- **暂缓原因**：需要 Prisma migration 改列类型。
- **若决定修复**：将 `destinationPort` 改为 `String @db.VarChar(32)`（与 `originPort` 一致），生成并执行 migration。同理可检查 `originPort` 是否也需要长度约束。
