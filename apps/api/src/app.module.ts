/**
 * 根模块
 *
 * 注意：现在只有 HealthController 和 TenantMiddleware 骨架。
 * 真正连接 PG/Redis/OSS 的代码还没写 — 不要预先写抽象层。
 * 等需要的时候再加（Simplicity First）。
 */

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminClearanceModule } from './admin-clearance/admin-clearance.module';
import { AttachmentModule } from './attachment/attachment.module';
import { AuthModule } from './auth/auth.module';
import { ClearanceAgentModule } from './clearance-agent/clearance-agent.module';
import { ConfigModule as ConfigMgmtModule } from './config/config.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { ExcelModule } from './excel/excel.module';
import { HealthModule } from './health/health.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { QuoteModule } from './quote/quote.module';
import { ReportModule } from './report/report.module';
import { ServiceItemModule } from './service-item/service-item.module';
import { SystemModule } from './system/system.module';
import { TruckModule } from './truck/truck.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { VersionModule } from './version/version.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    PrismaModule,
    ExcelModule,
    AuthModule,
    StorageModule,
    HealthModule,
    InquiryModule,
    AttachmentModule,
    AdminClearanceModule,
    QuoteModule,
    ClearanceAgentModule,
    ConfigMgmtModule,
    TruckModule,
    DictionaryModule,
    ReportModule,
    ServiceItemModule,
    SystemModule,
    VersionModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}