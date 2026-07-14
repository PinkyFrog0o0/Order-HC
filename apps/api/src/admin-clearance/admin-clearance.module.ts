import { Module } from '@nestjs/common';

import { AdminClearanceInquiryController } from './admin-clearance-inquiry.controller';
import { ClearanceInquiryService } from './admin-clearance-inquiry.service';

@Module({
  controllers: [AdminClearanceInquiryController],
  providers: [ClearanceInquiryService],
  exports: [ClearanceInquiryService],
})
export class AdminClearanceModule {}