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

import { TruckService } from './truck.service';

@Controller('admin/truck/services')
export class TruckController {
  constructor(private readonly service: TruckService) {}

  @Get()
  list(
    @Query('service_type') serviceType?: string,
    @Query('enabled') enabled?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    return this.service.list({
      serviceType,
      enabled: enabled === undefined ? undefined : enabled === 'true',
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Req() req: Request, @Body() body: {
    serviceType: string;
    code: string;
    name: string;
    originRegion?: string;
    destinationRegion?: string;
    pricingModel: string;
    basePrice: number;
    unitPrice?: number;
    vehicleType?: string;
    containerType?: string;
    surcharges?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
    enabled?: boolean;
    notes?: string;
  }) {
    const user = req.user as UserContext;
    return this.service.create(body, user.user_id);
  }

  @Put(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: Partial<{
    name: string;
    originRegion: string;
    destinationRegion: string;
    pricingModel: string;
    basePrice: number;
    unitPrice: number;
    vehicleType: string;
    containerType: string;
    surcharges: Record<string, unknown>;
    conditions: Record<string, unknown>;
    enabled: boolean;
    notes: string;
  }>) {
    const user = req.user as UserContext;
    return this.service.update(id, body, user.user_id);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.delete(id, user.user_id);
  }
}