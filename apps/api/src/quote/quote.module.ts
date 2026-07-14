import { Module } from '@nestjs/common';

import { QuoteController } from './quote.controller';
import { QuoteClientController } from './quote-client.controller';
import { QuoteService } from './quote.service';

@Module({
  controllers: [QuoteController, QuoteClientController],
  providers: [QuoteService],
})
export class QuoteModule {}