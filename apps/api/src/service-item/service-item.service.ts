/**
 * 服务项目录
 *
 * 全局目录（无 tenant_id），供成本&利润配置明细行引用。
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface ServiceItemInput {
  code: string;
  name: string;
  nameEn?: string;
  category: 'fee' | 'tax' | 'service' | 'surcharge';
  unit: string;
  description?: string;
  enabled?: boolean;
}

@Injectable()
export class ServiceItemService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { category?: string; enabled?: string; q?: string; page: number; pageSize: number }) {
    const where: Prisma.ServiceItemWhereInput = {
      deletedAt: null,
      ...(params.category && { category: params.category }),
      ...(params.enabled === 'true' && { enabled: true }),
      ...(params.enabled === 'false' && { enabled: false }),
      ...(params.q && { name: { contains: params.q, mode: 'insensitive' } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.serviceItem.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.serviceItem.count({ where }),
    ]);
    return {
      items,
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async listAllEnabled() {
    return this.prisma.serviceItem.findMany({
      where: { deletedAt: null, enabled: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.serviceItem.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException({ code: 'SERVICE_ITEM_NOT_FOUND', message: 'Service item not found' });
    return item;
  }

  async create(input: ServiceItemInput, userId: string) {
    const item = await this.prisma.serviceItem.create({
      data: {
        code: input.code,
        name: input.name,
        nameEn: input.nameEn,
        category: input.category,
        unit: input.unit,
        description: input.description,
        enabled: input.enabled ?? true,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'service_item.create', resource: 'service_item', resourceId: item.id },
    });
    return item;
  }

  async update(id: string, input: Partial<ServiceItemInput>, userId: string) {
    await this.findById(id);
    const updated = await this.prisma.serviceItem.update({
      where: { id },
      data: {
        ...(input.code && { code: input.code }),
        ...(input.name && { name: input.name }),
        ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
        ...(input.category && { category: input.category }),
        ...(input.unit && { unit: input.unit }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'service_item.update', resource: 'service_item', resourceId: id },
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.findById(id);
    // Phase 3 will add FK constraint with onDelete:Restrict, which will reject deletion
    // automatically at the DB level if any cost config item references this service item.
    await this.prisma.serviceItem.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'service_item.delete', resource: 'service_item', resourceId: id },
    });
    return { success: true };
  }
}