import { Controller, Get } from '@nestjs/common';

import { VersionService } from './version.service';

/**
 * GET /v1/system/version — 当前版本 + 检查更新
 *
 * 挂在 /system 下（非 /admin），客户端与管理端侧边栏都可调用。
 * 走全局 TenantMiddleware，需登录（有 tenant 或 is_admin）。
 */
@Controller('system')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get('version')
  check() {
    return this.versionService.check();
  }
}
