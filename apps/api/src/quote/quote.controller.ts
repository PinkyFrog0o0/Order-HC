import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { QuoteLineItem, QuoteService } from './quote.service';

@Controller('admin/clearance/quotes')
export class QuoteController {
  constructor(private readonly service: QuoteService) {}

  @Get()
  list(
    @Query('tenant_id') tenantId?: string,
    @Query('status') status?: string,
    @Query('business_number') businessNumber?: string,
    @Query('origin_country') originCountry?: string,
    @Query('destination_country') destinationCountry?: string,
    @Query('origin_port') originPort?: string,
    @Query('destination_port') destinationPort?: string,
    @Query('created_by_id') createdById?: string,
    @Query('clearance_agent_id') clearanceAgentId?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    return this.service.list({
      tenantId,
      status,
      businessNumber,
      originCountry,
      destinationCountry,
      originPort,
      destinationPort,
      createdById,
      clearanceAgentId,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(
    @Req() req: Request,
    @Body()
    body: {
      inquiryOrderId: string;
      lineItems: QuoteLineItem[];
      currency: string;
      marginPercent?: number;
      internalNotes?: string;
      customerNotes?: string;
      validUntil?: string;
    },
  ) {
    const user = req.user as UserContext;
    return this.service.create({ ...body, userId: user.user_id });
  }

  @Post(':id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const user = req.user as UserContext;
    return this.service.updateStatus(id, body.status, user.user_id);
  }

  @Post(':id/pdf-generate')
  generatePdf(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.generatePdf(id, user.user_id);
  }

  @Post(':id/withdraw')
  withdraw(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.withdraw(id, user.user_id);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.delete(id, user.user_id);
  }
}