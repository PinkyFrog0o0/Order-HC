/**
 * 管理端询价单管理服务
 *
 * 区别于 InquiryService（客户端用）：
 * - 可以看所有租户的询价单
 * - 支持分配操作员、改内部状态、加管理备注
 * - 7 维筛选：客户/状态/编号/国家/港口/创建人/清关行
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClearanceInquiryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 管理端列表（支持 7 维筛选 + 关键字搜索）
   */
  async list(params: {
    tenantId?: string;
    status?: string;
    businessNumber?: string;
    originCountry?: string;
    destinationCountry?: string;
    originPort?: string;
    destinationPort?: string;
    createdById?: string;
    clearanceAgentId?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.InquiryOrderWhereInput = {
      deletedAt: null,
      ...(params.tenantId && { tenantId: params.tenantId }),
      ...(params.status && { status: params.status }),
      ...(params.businessNumber && {
        businessNumber: { contains: params.businessNumber, mode: 'insensitive' },
      }),
      ...(params.originCountry && { originCountry: params.originCountry }),
      ...(params.destinationCountry && { destinationCountry: params.destinationCountry }),
      ...(params.originPort && { originPort: params.originPort }),
      ...(params.destinationPort && { destinationPort: params.destinationPort }),
      ...(params.createdById && { createdById: params.createdById }),
      ...(params.clearanceAgentId && { clearanceAgentId: params.clearanceAgentId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inquiryOrder.findMany({
        where,
        include: {
          tenant: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          clearanceAgent: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true, attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.inquiryOrder.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        ...i,
        tenant_code: i.tenant?.code,
        tenant_name: i.tenant?.name,
        created_by_name: i.createdBy?.fullName,
        clearance_agent_id: i.clearanceAgentId,
        clearance_agent_code: i.clearanceAgent?.code,
        clearance_agent_name: i.clearanceAgent?.name,
        item_count: i._count.items,
        attachment_count: i._count.attachments,
        tenant: undefined,
        createdBy: undefined,
        clearanceAgent: undefined,
        _count: undefined,
      })),
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  /**
   * 询价单详情（含租户信息 + 清关行）
   */
  async findById(id: string) {
    const inquiry = await this.prisma.inquiryOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        tenant: { select: { id: true, code: true, name: true } },
        items: { orderBy: { lineNumber: 'asc' } },
        attachments: { where: { deletedAt: null } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        clearanceAgent: { select: { id: true, code: true, name: true } },
        quote: true,
      },
    });
    if (!inquiry) {
      throw new NotFoundException({ code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' });
    }
    return {
      ...inquiry,
      tenant_code: inquiry.tenant?.code,
      tenant_name: inquiry.tenant?.name,
      created_by_name: inquiry.createdBy?.fullName,
      clearance_agent_id: inquiry.clearanceAgentId,
      clearance_agent_code: inquiry.clearanceAgent?.code,
      clearance_agent_name: inquiry.clearanceAgent?.name,
      tenant: undefined,
      createdBy: undefined,
      clearanceAgent: undefined,
    };
  }

  /**
   * 管理端修改内部状态
   */
  async updateStatus(
    inquiryId: string,
    newStatus: string,
    userId: string,
    note?: string,
  ) {
    const allowed = ['submitted', 'quoting', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: `Invalid status: ${newStatus}` });
    }
    const order = await this.prisma.inquiryOrder.findFirst({
      where: { id: inquiryId, deletedAt: null },
    });
    if (!order) {
      throw new NotFoundException({ code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.inquiryOrder.update({
        where: { id: inquiryId },
        data: { status: newStatus },
      });
      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          userId,
          action: 'inquiry.admin_update_status',
          resource: 'inquiry_order',
          resourceId: inquiryId,
          before: { status: order.status },
          after: { status: newStatus, note: note ?? null },
        },
      });
      return result;
    });
    return updated;
  }

  /**
   * 加管理备注
   */
  async updateInternalNote(inquiryId: string, note: string, userId: string) {
    const order = await this.prisma.inquiryOrder.findFirst({
      where: { id: inquiryId, deletedAt: null },
    });
    if (!order) {
      throw new NotFoundException({ code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' });
    }
    const cleaned = note.replace(/^\[ADMIN\]\s*/g, '');
    const newNotes = cleaned ? `[ADMIN] ${cleaned}` : order.notes;
    const updated = await this.prisma.inquiryOrder.update({
      where: { id: inquiryId },
      data: { notes: newNotes },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: order.tenantId,
        userId,
        action: 'inquiry.update_note',
        resource: 'inquiry_order',
        resourceId: inquiryId,
        after: { note: cleaned },
      },
    });
    return updated;
  }

  /**
   * 指派清关行
   */
  async updateClearanceAgent(inquiryId: string, agentId: string | null, userId: string) {
    const order = await this.prisma.inquiryOrder.findFirst({
      where: { id: inquiryId, deletedAt: null },
    });
    if (!order) {
      throw new NotFoundException({ code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' });
    }
    if (agentId) {
      const agent = await this.prisma.clearanceAgent.findFirst({ where: { id: agentId, deletedAt: null } });
      if (!agent) {
        throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Clearance agent not found' });
      }
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.inquiryOrder.update({
        where: { id: inquiryId },
        data: { clearanceAgentId: agentId },
      });
      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          userId,
          action: 'inquiry.assign_clearance_agent',
          resource: 'inquiry_order',
          resourceId: inquiryId,
          before: { clearance_agent_id: order.clearanceAgentId },
          after: { clearance_agent_id: agentId },
        },
      });
      return result;
    });
    return updated;
  }

  /**
   * 列出所有租户（用于筛选下拉）
   */
  async listTenants() {
    return this.prisma.tenant.findMany({
      where: { status: 'active', deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 列出所有清关行（用于筛选下拉）
   */
  async listClearanceAgents() {
    return this.prisma.clearanceAgent.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 列出所有创建人（distinct）
   */
  async listCreators() {
    const ids = await this.prisma.inquiryOrder.findMany({
      where: { deletedAt: null },
      select: { createdById: true },
      distinct: ['createdById'],
      orderBy: { createdById: 'asc' },
    });
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids.map((r) => r.createdById) } },
      select: { id: true, fullName: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.fullName]));
    return ids.map((r) => ({
      id: r.createdById,
      full_name: nameMap.get(r.createdById) ?? '',
    }));
  }

  /**
   * 聚合筛选选项：所有 7 维列表 + 字典里的国家/港口
   * 一个端点拿全所有下拉数据
   */
  async filterOptions() {
    const [tenants, agents, creators, countries, ports] = await Promise.all([
      this.listTenants(),
      this.listClearanceAgents(),
      this.listCreators(),
      this.prisma.dictionaryEntry.findMany({
        where: { category: 'country', enabled: true },
        select: { code: true, nameZh: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.dictionaryEntry.findMany({
        where: { category: 'port', enabled: true },
        select: { code: true, nameZh: true },
        orderBy: { code: 'asc' },
      }),
    ]);
    return { tenants, agents, creators, countries, ports };
  }
}