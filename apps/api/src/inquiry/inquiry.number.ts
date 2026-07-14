/**
 * 询价单业务号生成器
 *
 * 格式：INQ-{年份}-{租户代码}-{6位流水}
 * 例：INQ-2026-XM001-000123
 *
 * 实现：用 PG sequence + 租户代码前缀
 * 阶段 1：简化为 "年份+时间戳后6位"（保证唯一即可，不严格流水）
 * 阶段 2：用 sequence 严格流水
 */

import { PrismaService } from '../prisma/prisma.service';

const PREFIX = 'INQ';

export async function generateBusinessNumber(
  _prisma: PrismaService,
  tenantCode: string,
): Promise<string> {
  const year = new Date().getFullYear();
  // 用时间戳后 6 位 + 随机 2 位，避免毫秒级并发冲突
  const suffix = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');

  // 阶段 2：换成 prisma.$queryRaw 调用 sequence
  return `${PREFIX}-${year}-${tenantCode}-${suffix}${random}`;
}