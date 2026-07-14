import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { ClearanceInquiryService } from './admin-clearance-inquiry.service';

@Controller('admin/clearance/inquiries')
export class AdminClearanceInquiryController {
  constructor(private readonly service: ClearanceInquiryService) {}

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

  @Get('filter-options')
  filterOptions() {
    return this.service.filterOptions();
  }

  @Get('tenants')
  listTenants() {
    return this.service.listTenants();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { clearance_agent_id?: string | null },
  ) {
    const user = req.user as UserContext;
    return this.service.updateClearanceAgent(id, body.clearance_agent_id ?? null, user.user_id);
  }

  @Post(':id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: string; note?: string },
  ) {
    const user = req.user as UserContext;
    return this.service.updateStatus(id, body.status, user.user_id, body.note);
  }

  @Post(':id/note')
  updateNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    const user = req.user as UserContext;
    return this.service.updateInternalNote(id, body.note, user.user_id);
  }
}