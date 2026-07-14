/**
 * 清关行管理
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface ClearanceAgentInput {
  code: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  specialPorts?: string;
  qualifications?: Record<string, unknown>;
  status?: string;
  performanceRating?: number;
  notes?: string;
}

@Injectable()
export class ClearanceAgentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { status?: string; page: number; pageSize: number }) {
    const where: Prisma.ClearanceAgentWhereInput = {
      deletedAt: null,
      ...(params.status && { status: params.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.clearanceAgent.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.clearanceAgent.count({ where }),
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
    const agent = await this.prisma.clearanceAgent.findFirst({ where: { id, deletedAt: null } });
    if (!agent) throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent not found' });
    return agent;
  }

  async create(input: ClearanceAgentInput, userId: string) {
    const agent = await this.prisma.clearanceAgent.create({
      data: {
        code: input.code,
        name: input.name,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        contactAddress: input.contactAddress,
        specialPorts: input.specialPorts,
        qualifications: input.qualifications as Prisma.InputJsonValue,
        status: input.status ?? 'active',
        performanceRating: input.performanceRating,
        notes: input.notes,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'agent.create', resource: 'clearance_agent', resourceId: agent.id },
    });
    return agent;
  }

  async update(id: string, input: Partial<ClearanceAgentInput>, userId: string) {
    const existing = await this.findById(id);
    const updated = await this.prisma.clearanceAgent.update({
      where: { id: existing.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(input.contactAddress !== undefined && { contactAddress: input.contactAddress }),
        ...(input.specialPorts !== undefined && { specialPorts: input.specialPorts }),
        ...(input.qualifications !== undefined && { qualifications: input.qualifications as Prisma.InputJsonValue }),
        ...(input.status && { status: input.status }),
        ...(input.performanceRating !== undefined && { performanceRating: input.performanceRating }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'agent.update', resource: 'clearance_agent', resourceId: id },
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.findById(id);
    await this.prisma.clearanceAgent.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'agent.delete', resource: 'clearance_agent', resourceId: id },
    });
    return { success: true };
  }
}