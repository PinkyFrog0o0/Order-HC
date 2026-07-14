/**
 * 卡车服务
 *
 * 阶段 1：手工维护价格表
 * 阶段 2：按 起运地/目的地/重量/体积 自动匹配
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TruckService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { serviceType?: string; enabled?: boolean; page: number; pageSize: number }) {
    const where: Prisma.TruckServiceWhereInput = {
      deletedAt: null,
      ...(params.serviceType && { serviceType: params.serviceType }),
      ...(params.enabled !== undefined && { enabled: params.enabled }),
    };
    const [items, total] = await Promise.all([
      this.prisma.truckService.findMany({
        where,
        orderBy: [{ serviceType: 'asc' }, { code: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.truckService.count({ where }),
    ]);
    return {
      items,
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async findById(id: string) {
    const item = await this.prisma.truckService.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException({ code: 'TRUCK_SERVICE_NOT_FOUND', message: 'Truck service not found' });
    return item;
  }

  async create(input: {
    serviceType: string;
    code: string;
    name: string;
    originRegion?: string;
    destinationRegion?: string;
    pricingModel: string;
    basePrice: number;
    unitPrice?: number;
    vehicleType?: string;
    containerType?: string;
    surcharges?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
    enabled?: boolean;
    notes?: string;
  }, userId: string) {
    const item = await this.prisma.truckService.create({
      data: {
        serviceType: input.serviceType,
        code: input.code,
        name: input.name,
        originRegion: input.originRegion,
        destinationRegion: input.destinationRegion,
        pricingModel: input.pricingModel,
        basePrice: input.basePrice,
        unitPrice: input.unitPrice,
        vehicleType: input.vehicleType,
        containerType: input.containerType,
        surcharges: input.surcharges as Prisma.InputJsonValue,
        conditions: input.conditions as Prisma.InputJsonValue,
        enabled: input.enabled ?? true,
        notes: input.notes,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'truck.create', resource: 'truck_service', resourceId: item.id },
    });
    return item;
  }

  async update(id: string, input: Partial<{
    name: string;
    originRegion: string;
    destinationRegion: string;
    pricingModel: string;
    basePrice: number;
    unitPrice: number;
    vehicleType: string;
    containerType: string;
    surcharges: Record<string, unknown>;
    conditions: Record<string, unknown>;
    enabled: boolean;
    notes: string;
  }>, userId: string) {
    await this.findById(id);
    const updated = await this.prisma.truckService.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.originRegion !== undefined && { originRegion: input.originRegion }),
        ...(input.destinationRegion !== undefined && { destinationRegion: input.destinationRegion }),
        ...(input.pricingModel && { pricingModel: input.pricingModel }),
        ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
        ...(input.unitPrice !== undefined && { unitPrice: input.unitPrice }),
        ...(input.vehicleType !== undefined && { vehicleType: input.vehicleType }),
        ...(input.containerType !== undefined && { containerType: input.containerType }),
        ...(input.surcharges !== undefined && { surcharges: input.surcharges as Prisma.InputJsonValue }),
        ...(input.conditions !== undefined && { conditions: input.conditions as Prisma.InputJsonValue }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'truck.update', resource: 'truck_service', resourceId: id },
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.findById(id);
    await this.prisma.truckService.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'truck.delete', resource: 'truck_service', resourceId: id },
    });
    return { success: true };
  }
}