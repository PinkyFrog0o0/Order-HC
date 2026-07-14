/**
 * 成本配置 + 报价配置
 *
 * 成本配置：每条 config 是一组明细行（每行 = 一个服务项 + 成本 + 利润）
 * 报价配置：模板级利润率（不变）
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== 成本配置 ==============
  async listCostConfigs(params: {
    agentId?: string;
    enabled?: string;
    q?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.ClearanceCostConfigWhereInput = {
      ...(params.agentId && { agentId: params.agentId }),
      ...(params.enabled === 'true' && { enabled: true }),
      ...(params.enabled === 'false' && { enabled: false }),
      ...(params.q && { name: { contains: params.q, mode: 'insensitive' } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.clearanceCostConfig.findMany({
        where,
        include: {
          agent: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.clearanceCostConfig.count({ where }),
    ]);
    return {
      items: items.map((c) => ({
        ...c,
        agent_code: c.agent?.code,
        agent_name: c.agent?.name,
        item_count: c._count.items,
        agent: undefined,
        _count: undefined,
      })),
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async findCostConfigById(id: string) {
    const cfg = await this.prisma.clearanceCostConfig.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, code: true, name: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { serviceItem: { select: { id: true, code: true, name: true, unit: true } } },
        },
      },
    });
    if (!cfg) {
      throw new NotFoundException({ code: 'COST_CONFIG_NOT_FOUND', message: 'Cost config not found' });
    }
    return {
      ...cfg,
      agent_code: cfg.agent?.code,
      agent_name: cfg.agent?.name,
      agent: undefined,
      items: cfg.items.map((it) => ({
        ...it,
        service_item_code: it.serviceItem?.code,
        service_item_name: it.serviceItem?.name,
        serviceItem: undefined,
      })),
    };
  }

  async createCostConfig(input: {
    agentId?: string;
    name: string;
    conditions?: Record<string, unknown>;
    priority?: number;
    enabled?: boolean;
  }, userId: string) {
    const cfg = await this.prisma.clearanceCostConfig.create({
      data: {
        agentId: input.agentId,
        name: input.name,
        conditions: (input.conditions ?? {}) as Prisma.InputJsonValue,
        priority: input.priority ?? 100,
        enabled: input.enabled ?? true,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'cost_config.create', resource: 'clearance_cost_config', resourceId: cfg.id },
    });
    return cfg;
  }

  async updateCostConfig(id: string, input: Partial<{
    name: string;
    conditions: Record<string, unknown>;
    priority: number;
    enabled: boolean;
  }>, userId: string) {
    const existing = await this.prisma.clearanceCostConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'COST_CONFIG_NOT_FOUND', message: 'Cost config not found' });
    const updated = await this.prisma.clearanceCostConfig.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.conditions !== undefined && { conditions: input.conditions as Prisma.InputJsonValue }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'cost_config.update', resource: 'clearance_cost_config', resourceId: id },
    });
    return updated;
  }

  async deleteCostConfig(id: string, userId: string) {
    const existing = await this.prisma.clearanceCostConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'COST_CONFIG_NOT_FOUND', message: 'Cost config not found' });
    await this.prisma.clearanceCostConfig.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'cost_config.delete', resource: 'clearance_cost_config', resourceId: id },
    });
    return { success: true };
  }

  // ============== 成本明细行 ==============
  async addCostConfigItem(costConfigId: string, input: {
    serviceItemId: string;
    costAmount: number;
    profitType: 'percent' | 'fixed';
    profitValue: number;
    sortOrder?: number;
  }, userId: string) {
    const cfg = await this.prisma.clearanceCostConfig.findUnique({ where: { id: costConfigId } });
    if (!cfg) throw new NotFoundException({ code: 'COST_CONFIG_NOT_FOUND', message: 'Cost config not found' });
    const item = await this.prisma.clearanceCostConfigItem.create({
      data: {
        costConfigId,
        serviceItemId: input.serviceItemId,
        costAmount: input.costAmount,
        profitType: input.profitType,
        profitValue: input.profitValue,
        sortOrder: input.sortOrder ?? 0,
      },
      include: { serviceItem: { select: { id: true, code: true, name: true, unit: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cost_config_item.create',
        resource: 'clearance_cost_config_item',
        resourceId: item.id,
        after: { cost_config_id: costConfigId, ...input },
      },
    });
    return {
      ...item,
      service_item_code: item.serviceItem?.code,
      service_item_name: item.serviceItem?.name,
      serviceItem: undefined,
    };
  }

  async updateCostConfigItem(itemId: string, input: Partial<{
    serviceItemId: string;
    costAmount: number;
    profitType: 'percent' | 'fixed';
    profitValue: number;
    sortOrder: number;
  }>, userId: string) {
    const existing = await this.prisma.clearanceCostConfigItem.findUnique({ where: { id: itemId } });
    if (!existing) throw new NotFoundException({ code: 'COST_CONFIG_ITEM_NOT_FOUND', message: 'Item not found' });
    const updated = await this.prisma.clearanceCostConfigItem.update({
      where: { id: itemId },
      data: {
        ...(input.serviceItemId && { serviceItemId: input.serviceItemId }),
        ...(input.costAmount !== undefined && { costAmount: input.costAmount }),
        ...(input.profitType && { profitType: input.profitType }),
        ...(input.profitValue !== undefined && { profitValue: input.profitValue }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
      include: { serviceItem: { select: { id: true, code: true, name: true, unit: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cost_config_item.update',
        resource: 'clearance_cost_config_item',
        resourceId: itemId,
        before: { cost_amount: existing.costAmount, profit_type: existing.profitType, profit_value: existing.profitValue },
        after: input,
      },
    });
    return {
      ...updated,
      service_item_code: updated.serviceItem?.code,
      service_item_name: updated.serviceItem?.name,
      serviceItem: undefined,
    };
  }

  async deleteCostConfigItem(itemId: string, userId: string) {
    const existing = await this.prisma.clearanceCostConfigItem.findUnique({ where: { id: itemId } });
    if (!existing) throw new NotFoundException({ code: 'COST_CONFIG_ITEM_NOT_FOUND', message: 'Item not found' });
    await this.prisma.clearanceCostConfigItem.delete({ where: { id: itemId } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'cost_config_item.delete', resource: 'clearance_cost_config_item', resourceId: itemId },
    });
    return { success: true };
  }

  // ============== 报价配置 ==============
  async listQuoteConfigs(params: { q?: string; enabled?: string; page: number; pageSize: number }) {
    const where: Prisma.ClearanceQuoteConfigWhereInput = {
      ...(params.q && { name: { contains: params.q, mode: 'insensitive' } }),
      ...(params.enabled === 'true' && { enabled: true }),
      ...(params.enabled === 'false' && { enabled: false }),
    };
    const [items, total] = await Promise.all([
      this.prisma.clearanceQuoteConfig.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.clearanceQuoteConfig.count({ where }),
    ]);
    return {
      items,
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async createQuoteConfig(input: {
    name: string;
    conditions: Record<string, unknown>;
    marginPercent: number;
    minimumCharge?: number;
    enabled?: boolean;
    priority?: number;
  }, userId: string) {
    const cfg = await this.prisma.clearanceQuoteConfig.create({
      data: {
        name: input.name,
        conditions: input.conditions as Prisma.InputJsonValue,
        marginPercent: input.marginPercent,
        minimumCharge: input.minimumCharge,
        enabled: input.enabled ?? true,
        priority: input.priority ?? 100,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'quote_config.create', resource: 'clearance_quote_config', resourceId: cfg.id },
    });
    return cfg;
  }

  async updateQuoteConfig(id: string, input: Partial<{
    name: string;
    conditions: Record<string, unknown>;
    marginPercent: number;
    minimumCharge: number;
    enabled: boolean;
    priority: number;
  }>, userId: string) {
    const existing = await this.prisma.clearanceQuoteConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'QUOTE_CONFIG_NOT_FOUND', message: 'Quote config not found' });
    const updated = await this.prisma.clearanceQuoteConfig.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.conditions !== undefined && { conditions: input.conditions as Prisma.InputJsonValue }),
        ...(input.marginPercent !== undefined && { marginPercent: input.marginPercent }),
        ...(input.minimumCharge !== undefined && { minimumCharge: input.minimumCharge }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.priority !== undefined && { priority: input.priority }),
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'quote_config.update', resource: 'clearance_quote_config', resourceId: id },
    });
    return updated;
  }

  async deleteQuoteConfig(id: string, userId: string) {
    const existing = await this.prisma.clearanceQuoteConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'QUOTE_CONFIG_NOT_FOUND', message: 'Quote config not found' });
    await this.prisma.clearanceQuoteConfig.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'quote_config.delete', resource: 'clearance_quote_config', resourceId: id },
    });
    return { success: true };
  }
}