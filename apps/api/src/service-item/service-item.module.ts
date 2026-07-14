import { Module } from '@nestjs/common';

import { ServiceItemController } from './service-item.controller';
import { ServiceItemService } from './service-item.service';

@Module({
  controllers: [ServiceItemController],
  providers: [ServiceItemService],
})
export class ServiceItemModule {}