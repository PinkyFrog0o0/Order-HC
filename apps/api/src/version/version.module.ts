import { Module } from '@nestjs/common';

import { UpdateRunner } from './update-runner';
import { VersionController } from './version.controller';
import { VersionService } from './version.service';

@Module({
  controllers: [VersionController],
  providers: [VersionService, UpdateRunner],
})
export class VersionModule {}
