/**
 * 基础数据字典（口岸/HS Code/币种/国家/单位）
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DictionaryService {
  constructor(private readonly prisma: PrismaService) {}

  async listByCategory(category: string) {
    return this.prisma.dictionaryEntry.findMany({
      where: { category, enabled: true },
      orderBy: { code: 'asc' },
    });
  }

  async listAll(params: { category?: string; page: number; pageSize: number }) {
    const where: Prisma.DictionaryEntryWhereInput = {
      ...(params.category && { category: params.category }),
    };
    const [items, total] = await Promise.all([
      this.prisma.dictionaryEntry.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.dictionaryEntry.count({ where }),
    ]);
    return { items, total, page: params.page, page_size: params.pageSize, total_pages: Math.ceil(total / params.pageSize) };
  }

  async create(input: {
    category: string;
    code: string;
    nameZh: string;
    nameEn?: string;
    parentCode?: string;
    extra?: Record<string, unknown>;
    enabled?: boolean;
  }) {
    return this.prisma.dictionaryEntry.upsert({
      where: { category_code: { category: input.category, code: input.code } },
      update: {
        nameZh: input.nameZh,
        nameEn: input.nameEn,
        parentCode: input.parentCode,
        extra: input.extra as Prisma.InputJsonValue,
        enabled: input.enabled ?? true,
      },
      create: {
        category: input.category,
        code: input.code,
        nameZh: input.nameZh,
        nameEn: input.nameEn,
        parentCode: input.parentCode,
        extra: input.extra as Prisma.InputJsonValue,
        enabled: input.enabled ?? true,
      },
    });
  }

  async update(id: string, input: Partial<{ nameZh: string; nameEn: string; parentCode: string; extra: Record<string, unknown>; enabled: boolean }>) {
    const existing = await this.prisma.dictionaryEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'DICT_NOT_FOUND', message: 'Dictionary entry not found' });
    return this.prisma.dictionaryEntry.update({
      where: { id },
      data: {
        ...(input.nameZh && { nameZh: input.nameZh }),
        ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
        ...(input.parentCode !== undefined && { parentCode: input.parentCode }),
        ...(input.extra !== undefined && { extra: input.extra as Prisma.InputJsonValue }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.dictionaryEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'DICT_NOT_FOUND', message: 'Dictionary entry not found' });
    await this.prisma.dictionaryEntry.delete({ where: { id } });
    return { success: true };
  }
}