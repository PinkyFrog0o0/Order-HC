/**
 * Prisma Service
 *
 * 职责：
 * 1. 暴露 Prisma Client 实例
 * 2. 自动注入租户上下文到每个查询（用 $extends 实现）
 *
 * 为什么不用 middleware：
 * - Prisma 4+ 之后 middleware 已被 $extends 取代
 * - $extends 更类型安全
 *
 * ⚠️ 阶段 1 暂不实现 query extension（先验证连接）
 * 阶段 2 加扩展：自动注入 tenant_id 到 where 子句
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      this.logger.error('Database connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * 在事务中执行并自动注入租户上下文（用于 RLS）
   *
   * 用法：
   * ```ts
   * await prisma.withTenantContext(tenantId, async (tx) => {
   *   return tx.user.findMany();
   * });
   * ```
   */
  async withTenantContext<T>(
    tenantId: string | null,
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // 设置当前连接的 tenant_id（PG session-local 变量）
      if (tenantId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
      }
      return fn(tx as PrismaClient);
    });
  }
}