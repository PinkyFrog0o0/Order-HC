/**
 * 健康检查服务
 *
 * 阶段 2：真实检查 PG/Redis/MinIO 连接
 * 阶段 3：返回每个依赖的详细指标（连接数、响应时间等）
 */

import { Injectable } from '@nestjs/common';

import { HealthResponse } from '@haycargo/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const allOk = database === 'ok' && redis === 'ok' && storage === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      checks: { database, redis, storage },
    };
  }

  private async checkDatabase(): Promise<'ok' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'ok' | 'down'> {
    // ⚠️ 阶段 2 接入真实 Redis client
    // 现在先返回 ok，避免被前置依赖阻塞
    return 'ok';
  }

  private async checkStorage(): Promise<'ok' | 'down'> {
    // ⚠️ 阶段 2 接入真实 MinIO client
    return 'ok';
  }
}