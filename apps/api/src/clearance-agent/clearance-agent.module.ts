import { Module } from '@nestjs/common';

import { ClearanceAgentController } from './clearance-agent.controller';
import { ClearanceAgentService } from './clearance-agent.service';

@Module({
  controllers: [ClearanceAgentController],
  providers: [ClearanceAgentService],
})
export class ClearanceAgentModule {}