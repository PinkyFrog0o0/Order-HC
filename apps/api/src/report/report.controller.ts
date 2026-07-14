import { Controller, Get, Query } from '@nestjs/common';

import { ReportService } from './report.service';

@Controller('admin/reports')
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('inquiry-status')
  inquiryStatus() {
    return this.service.inquiryStatusDistribution();
  }

  @Get('inquiry-by-tenant')
  inquiryByTenant() {
    return this.service.inquiryByTenant();
  }

  @Get('inquiry-daily')
  inquiryDaily(@Query('days') days = '30') {
    return this.service.inquiryDaily(parseInt(days, 10) || 30);
  }
}