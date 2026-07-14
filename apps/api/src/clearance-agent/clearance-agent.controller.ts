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

import { ClearanceAgentInput, ClearanceAgentService } from './clearance-agent.service';

@Controller('admin/clearance/agents')
export class ClearanceAgentController {
  constructor(private readonly service: ClearanceAgentService) {}

  @Get()
  list(@Query('status') status?: string, @Query('page') page = '1', @Query('page_size') pageSize = '20') {
    return this.service.list({
      status,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Req() req: Request, @Body() body: ClearanceAgentInput) {
    const user = req.user as UserContext;
    return this.service.create(body, user.user_id);
  }

  @Put(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: Partial<ClearanceAgentInput>) {
    const user = req.user as UserContext;
    return this.service.update(id, body, user.user_id);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.service.delete(id, user.user_id);
  }
}