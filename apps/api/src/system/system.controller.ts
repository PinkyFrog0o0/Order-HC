import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { SystemService } from './system.service';

@Controller('admin/system')
export class SystemController {
  constructor(private readonly service: SystemService) {}

  // ===== 用户 =====
  @Get('users')
  listUsers(
    @Query('tenant_id') tenantId?: string,
    @Query('role') role?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    return this.service.listUsers({
      tenantId,
      role,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Post('users')
  createUser(
    @Req() req: Request,
    @Body() body: { tenantId?: string; email?: string; phone?: string; password: string; fullName: string; role: string },
  ) {
    const user = req.user as UserContext;
    return this.service.createUser(body, user.user_id);
  }

  @Put('users/:id')
  updateUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: Partial<{ fullName: string; role: string; status: string; password: string }>,
  ) {
    const user = req.user as UserContext;
    return this.service.updateUser(id, body, user.user_id);
  }

  @Delete('users/:id')
  deleteUser(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.deleteUser(id, user.user_id);
  }

  // ===== 租户 =====
  @Get('tenants')
  listTenants(@Query('status') status?: string, @Query('page') page = '1', @Query('page_size') pageSize = '20') {
    return this.service.listTenants({
      status,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Post('tenants')
  createTenant(
    @Req() req: Request,
    @Body() body: { code: string; name: string; contact?: Record<string, unknown>; settings?: Record<string, unknown> },
  ) {
    const user = req.user as UserContext;
    return this.service.createTenant(body, user.user_id);
  }

  @Put('tenants/:id')
  updateTenant(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; contact: Record<string, unknown>; settings: Record<string, unknown>; status: string }>,
  ) {
    const user = req.user as UserContext;
    return this.service.updateTenant(id, body, user.user_id);
  }
}