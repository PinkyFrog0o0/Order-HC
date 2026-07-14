import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { InquiryService } from './inquiry.service';
import {
  CreateInquiryInput,
  ListInquiryQuery,
  createInquirySchema,
  listInquirySchema,
} from './inquiry.schemas';

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post()
  create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createInquirySchema)) input: CreateInquiryInput,
  ) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    return this.inquiryService.create(user.tenant_id, user.user_id, input);
  }

  @Get()
  list(
    @Req() req: Request,
    @Query(new ZodValidationPipe(listInquirySchema)) query: ListInquiryQuery,
  ) {
    const user = req.user as UserContext;
    return this.inquiryService.list(user.tenant_id, query, user.is_admin);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.inquiryService.findById(user.tenant_id, id, user.is_admin);
  }

  @Post(':id/submit')
  submit(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    return this.inquiryService.submit(user.tenant_id, user.user_id, id, user.is_admin);
  }
}