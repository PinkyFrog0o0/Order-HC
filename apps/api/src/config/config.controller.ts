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

import { ConfigService } from './config.service';

@Controller('admin/clearance')
export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  // ===== 成本配置 =====
  @Get('cost-configs')
  listCostConfigs(
    @Query('agent_id') agentId?: string,
    @Query('enabled') enabled?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    return this.service.listCostConfigs({
      agentId,
      enabled,
      q,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Get('cost-configs/:id')
  findOneCostConfig(@Param('id') id: string) {
    return this.service.findCostConfigById(id);
  }

  @Post('cost-configs')
  createCostConfig(
    @Req() req: Request,
    @Body() body: { agentId?: string; name: string; conditions?: Record<string, unknown>; priority?: number; enabled?: boolean },
  ) {
    const user = req.user as UserContext;
    return this.service.createCostConfig(body, user.user_id);
  }

  @Put('cost-configs/:id')
  updateCostConfig(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { name?: string; conditions?: Record<string, unknown>; priority?: number; enabled?: boolean },
  ) {
    const user = req.user as UserContext;
    return this.service.updateCostConfig(id, body, user.user_id);
  }

  @Delete('cost-configs/:id')
  deleteCostConfig(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.deleteCostConfig(id, user.user_id);
  }

  // ===== 成本明细行 =====
  @Post('cost-configs/:id/items')
  addCostConfigItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { serviceItemId: string; costAmount: number; profitType: 'percent' | 'fixed'; profitValue: number; sortOrder?: number },
  ) {
    const user = req.user as UserContext;
    return this.service.addCostConfigItem(id, body, user.user_id);
  }

  @Put('cost-config-items/:itemId')
  updateCostConfigItem(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() body: Partial<{ serviceItemId: string; costAmount: number; profitType: 'percent' | 'fixed'; profitValue: number; sortOrder: number }>,
  ) {
    const user = req.user as UserContext;
    return this.service.updateCostConfigItem(itemId, body, user.user_id);
  }

  @Delete('cost-config-items/:itemId')
  deleteCostConfigItem(@Req() req: Request, @Param('itemId') itemId: string) {
    const user = req.user as UserContext;
    return this.service.deleteCostConfigItem(itemId, user.user_id);
  }

  // ===== 报价配置 =====
  @Get('quote-configs')
  listQuoteConfigs(
    @Query('q') q?: string,
    @Query('enabled') enabled?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    return this.service.listQuoteConfigs({
      q,
      enabled,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Post('quote-configs')
  createQuoteConfig(
    @Req() req: Request,
    @Body() body: { name: string; conditions: Record<string, unknown>; marginPercent: number; minimumCharge?: number; enabled?: boolean; priority?: number },
  ) {
    const user = req.user as UserContext;
    return this.service.createQuoteConfig(body, user.user_id);
  }

  @Put('quote-configs/:id')
  updateQuoteConfig(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { name?: string; conditions?: Record<string, unknown>; marginPercent?: number; minimumCharge?: number; enabled?: boolean; priority?: number },
  ) {
    const user = req.user as UserContext;
    return this.service.updateQuoteConfig(id, body, user.user_id);
  }

  @Delete('quote-configs/:id')
  deleteQuoteConfig(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.deleteQuoteConfig(id, user.user_id);
  }
}