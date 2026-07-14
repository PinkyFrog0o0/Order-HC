import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { DictionaryService } from './dictionary.service';

@Controller('admin/dictionary')
export class DictionaryController {
  constructor(private readonly service: DictionaryService) {}

  @Get('category/:category')
  listByCategory(@Param('category') category: string) {
    return this.service.listByCategory(category);
  }

  @Get()
  listAll(
    @Query('category') category?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '50',
  ) {
    return this.service.listAll({
      category,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 50,
    });
  }

  @Post()
  create(@Body() body: { category: string; code: string; nameZh: string; nameEn?: string; parentCode?: string; extra?: Record<string, unknown>; enabled?: boolean }) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ nameZh: string; nameEn: string; parentCode: string; extra: Record<string, unknown>; enabled: boolean }>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}