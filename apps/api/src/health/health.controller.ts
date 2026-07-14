import { Controller, Get, HttpCode } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /v1/health
   *
   * 返回服务健康状态。永远返回 200（除非进程崩溃），由 status 字段体现真实状态。
   * 监控/告警系统按 status 字段判断。
   */
  @Get()
  @HttpCode(200)
  async check() {
    return this.healthService.check();
  }
}