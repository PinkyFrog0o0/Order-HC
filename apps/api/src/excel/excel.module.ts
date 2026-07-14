import { Global, Module } from '@nestjs/common';

import { ExcelParserService } from './excel-parser.service';
import { TemplateGeneratorService } from './template-generator.service';
import { TemplateRegistryService } from './template-registry.service';

@Global()
@Module({
  providers: [ExcelParserService, TemplateGeneratorService, TemplateRegistryService],
  exports: [ExcelParserService, TemplateGeneratorService, TemplateRegistryService],
})
export class ExcelModule {}