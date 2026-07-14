/**
 * 客户端报价接口
 *
 * 与 inquiry.controller.ts 共用"客户端 API 以纯复数名词挂载"的模式：
 * 控制器路径 /quotes，前端 apiClient.get('/quotes') 直接命中。
 * 租户隔离通过 TenantMiddleware 注入的 req.user.tenant_id 强制。
 */

import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { QuoteService } from './quote.service';

@Controller('quotes')
export class QuoteClientController {
  constructor(private readonly service: QuoteService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    return this.service.findAllForTenant(
      user.tenant_id,
      parseInt(page, 10) || 1,
      parseInt(pageSize, 10) || 20,
    );
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    return this.service.findByIdForTenant(id, user.tenant_id);
  }

  @Post(':id/accept')
  accept(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    return this.service.clientAccept(id, user.tenant_id, user.user_id);
  }

  @Post(':id/reject')
  reject(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    return this.service.clientReject(id, user.tenant_id, user.user_id);
  }
}
