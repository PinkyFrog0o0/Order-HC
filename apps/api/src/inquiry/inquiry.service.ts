import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateInquiryInput, ListInquiryQuery } from './inquiry.schemas';
import { generateBusinessNumber } from './inquiry.number';

@Injectable()
export class InquiryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建询价单（草稿状态）
   */
  async create(tenantId: string, userId: string, input: CreateInquiryInput) {
    // 校验租户存在
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || tenant.status !== 'active') {
      throw new ForbiddenException({ code: 'INVALID_TENANT', message: 'Invalid tenant' });
    }

    // 业务号
    const businessNumber = await generateBusinessNumber(this.prisma, tenant.code);

    // 创建询价单 + 商品明细（事务）
    const inquiry = await this.prisma.$transaction(async (tx) => {
      const order = await tx.inquiryOrder.create({
        data: {
          tenantId,
          businessNumber,
          customerCode: input.customer_code,
          tradeType: input.trade_type,
          incoterm: input.incoterm,
          originCountry: input.origin_country,
          destinationCountry: input.destination_country,
          originPort: input.origin_port,
          destinationPort: input.destination_port,
          totalGrossWeightKg: input.total_gross_weight_kg,
          totalNetWeightKg: input.total_net_weight_kg,
          totalPackages: input.total_packages,
          totalValue: input.total_value,
          currency: input.currency,
          notes: input.notes,
          status: 'draft',
          source: 'manual',
          createdById: userId,
          ...(input.items &&
            input.items.length > 0 && {
              items: {
                create: input.items.map((item, idx) => ({
                  tenantId,
                  lineNumber: idx + 1,
                  hsCode: item.hs_code,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unit_price,
                  grossWeightKg: item.gross_weight_kg,
                  netWeightKg: item.net_weight_kg,
                  packages: item.packages,
                  originCountry: item.origin_country,
                })),
              },
            }),
        },
        include: { items: true },
      });

      // 审计日志
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'inquiry.create',
          resource: 'inquiry_order',
          resourceId: order.id,
          after: { business_number: businessNumber, status: 'draft' },
        },
      });

      return order;
    });

    return inquiry;
  }

  /**
   * 列表查询
   * - 客户端用户只能看自己租户的询价单
   * - 管理员（is_admin=true）可以看所有租户
   */
  async list(
    tenantId: string | null,
    query: ListInquiryQuery,
    isAdmin: boolean,
  ) {
    const { status, page, page_size } = query;
    const where = {
      deletedAt: null,
      ...(isAdmin ? {} : { tenantId: tenantId ?? undefined }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inquiryOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
        include: {
          tenant: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true, attachments: true } },
        },
      }),
      this.prisma.inquiryOrder.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        tenant_code: item.tenant?.code,
        tenant_name: item.tenant?.name,
        item_count: item._count.items,
        attachment_count: item._count.attachments,
        tenant: undefined,
        _count: undefined,
      })),
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    };
  }

  /**
   * 详情查询
   * 管理员可跨租户访问，客户端仅自己租户
   */
  async findById(tenantId: string | null, id: string, isAdmin: boolean) {
    const inquiry = await this.prisma.inquiryOrder.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isAdmin ? {} : { tenantId: tenantId ?? undefined }),
      },
      include: {
        items: { orderBy: { lineNumber: 'asc' } },
        attachments: { where: { deletedAt: null } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        tenant: { select: { id: true, code: true, name: true } },
      },
    });
    if (!inquiry) {
      throw new NotFoundException({
        code: 'INQUIRY_NOT_FOUND',
        message: 'Inquiry not found or access denied',
      });
    }
    return inquiry;
  }

  /**
   * 提交询价单（草稿 → submitted）
   */
  async submit(tenantId: string | null, userId: string, id: string, isAdmin: boolean) {
    const inquiry = await this.prisma.inquiryOrder.findFirst({
      where: { id, deletedAt: null, ...(isAdmin ? {} : { tenantId: tenantId ?? undefined }) },
    });
    if (!inquiry) {
      throw new NotFoundException({
        code: 'INQUIRY_NOT_FOUND',
        message: 'Inquiry not found or access denied',
      });
    }
    if (inquiry.status !== 'draft') {
      throw new BadRequestException({
        code: 'INVALID_STATE',
        message: `Cannot submit inquiry in status: ${inquiry.status}`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.inquiryOrder.update({
        where: { id },
        data: { status: 'submitted', submittedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'inquiry.submit',
          resource: 'inquiry_order',
          resourceId: id,
          before: { status: 'draft' },
          after: { status: 'submitted' },
        },
      });
      return result;
    });

    return updated;
  }
}