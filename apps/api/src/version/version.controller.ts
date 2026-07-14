import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { UpdateAlreadyRunningError } from './update-runner';
import { VersionService } from './version.service';

/**
 * GET  /v1/system/version          — 当前版本 + 检查更新（任意登录用户）
 * POST /v1/system/apply-update     — 触发后台更新（仅管理员）
 * GET  /v1/system/update-status    — 拉取更新任务状态（仅管理员）
 *
 * 挂在 /system 下（非 /admin），与现有检查端点一致。
 * 走全局 TenantMiddleware，需登录（有 tenant 或 is_admin）。
 */
@Controller('system')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get('version')
  check() {
    return this.versionService.check();
  }

  @Post('apply-update')
  @HttpCode(202)
  applyUpdate(@Req() req: Request) {
    const user = req.user as UserContext | undefined;
    if (!user?.is_admin) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: '需要管理员权限' },
        HttpStatus.FORBIDDEN,
      );
    }
    try {
      return this.versionService.applyUpdate();
    } catch (err) {
      if (err instanceof UpdateAlreadyRunningError) {
        throw new HttpException(
          { code: 'UPDATE_ALREADY_RUNNING', message: err.message },
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  @Get('update-status')
  updateStatus(@Req() req: Request) {
    const user = req.user as UserContext | undefined;
    if (!user?.is_admin) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: '需要管理员权限' },
        HttpStatus.FORBIDDEN,
      );
    }
    return this.versionService.getUpdateStatus();
  }
}
