/**
 * 报价单管理
 *
 * 报价单来源：
 * - 手工录入（管理员按询价单填）
 * - 阶段 2：自动从成本配置 + 报价配置算
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface QuoteLineItem {
  name: string;
  description?: string;
  quantity?: number;
  unit_price: number;
  amount: number;
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 列表（管理端看所有租户）
   * 支持 7 维筛选（清关行 / 国家 / 港口 / 创建人 等通过 inquiryOrder 关系过滤）
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
    const inquiryWhere: Prisma.InquiryOrderWhereInput = {
      ...(params.businessNumber && { businessNumber: { contains: params.businessNumber, mode: 'insensitive' } }),
      ...(params.originCountry && { originCountry: params.originCountry }),
      ...(params.destinationCountry && { destinationCountry: params.destinationCountry }),
      ...(params.originPort && { originPort: params.originPort }),
      ...(params.destinationPort && { destinationPort: params.destinationPort }),
      ...(params.createdById && { createdById: params.createdById }),
      ...(params.clearanceAgentId && { clearanceAgentId: params.clearanceAgentId }),
    };
    const where: Prisma.ClearanceQuoteWhereInput = {
      deletedAt: null,
      ...(params.tenantId && { tenantId: params.tenantId }),
      ...(params.status && { status: params.status }),
      ...(Object.keys(inquiryWhere).length > 0 && { inquiryOrder: inquiryWhere }),
    };
    const [items, total] = await Promise.all([
      this.prisma.clearanceQuote.findMany({
        where,
        include: {
          tenant: { select: { code: true, name: true } },
          inquiryOrder: {
            select: {
              id: true,
              businessNumber: true,
              incoterm: true,
              originPort: true,
              destinationPort: true,
              originCountry: true,
              destinationCountry: true,
              clearanceAgentId: true,
              clearanceAgent: { select: { id: true, code: true, name: true } },
              createdById: true,
              createdBy: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.clearanceQuote.count({ where }),
    ]);

    return {
      items: items.map((q) => {
        const inq = q.inquiryOrder as (typeof q.inquiryOrder & {
          clearanceAgent?: { id: string; code: string; name: string } | null;
          createdBy?: { id: string; fullName: string } | null;
        }) | null;
        return {
          ...q,
          tenant_code: q.tenant?.code,
          tenant_name: q.tenant?.name,
          business_number: inq?.businessNumber,
          origin_country: inq?.originCountry,
          destination_country: inq?.destinationCountry,
          origin_port: inq?.originPort,
          destination_port: inq?.destinationPort,
          clearance_agent_id: inq?.clearanceAgentId,
          clearance_agent_code: inq?.clearanceAgent?.code,
          clearance_agent_name: inq?.clearanceAgent?.name,
          created_by_id: inq?.createdById,
          created_by_name: inq?.createdBy?.fullName,
          tenant: undefined,
          inquiryOrder: undefined,
        };
      }),
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async findById(id: string) {
    const quote = await this.prisma.clearanceQuote.findFirst({
      where: { id, deletedAt: null },
      include: {
        tenant: { select: { code: true, name: true } },
        inquiryOrder: true,
      },
    });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }
    return {
      ...quote,
      tenant_code: quote.tenant?.code,
      tenant_name: quote.tenant?.name,
      tenant: undefined,
    };
  }

  /**
   * 创建报价单
   *
   * 输入：从询价单 ID + 手工录入的费用项
   */
  async create(input: {
    inquiryOrderId: string;
    lineItems: QuoteLineItem[];
    currency: string;
    marginPercent?: number;
    internalNotes?: string;
    customerNotes?: string;
    validUntil?: string;
    userId: string;
  }) {
    const inquiry = await this.prisma.inquiryOrder.findFirst({
      where: { id: input.inquiryOrderId, deletedAt: null },
      include: { tenant: true },
    });
    if (!inquiry) {
      throw new NotFoundException({ code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' });
    }
    const activeQuote = await this.prisma.clearanceQuote.findFirst({
      where: {
        inquiryOrderId: inquiry.id,
        deletedAt: null,
        status: { not: 'withdrawn' },
      },
    });
    if (activeQuote) {
      throw new BadRequestException({ code: 'QUOTE_EXISTS', message: 'Quote already exists for this inquiry' });
    }

    const costAmount = input.lineItems.reduce((sum, li) => sum + li.amount, 0);
    const margin = input.marginPercent ?? 0;
    const totalAmount = costAmount * (1 + margin / 100);

    const businessNumber = `QT-${new Date().getFullYear()}-${inquiry.tenant.code}-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.clearanceQuote.create({
        data: {
          tenantId: inquiry.tenantId,
          inquiryOrderId: inquiry.id,
          businessNumber,
          lineItems: input.lineItems as unknown as Prisma.InputJsonValue,
          totalAmount,
          currency: input.currency,
          marginPercent: margin,
          costAmount,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          internalNotes: input.internalNotes,
          customerNotes: input.customerNotes,
          status: 'draft',
          createdById: input.userId,
        },
      });

      // 询价单状态改为 quoting
      await tx.inquiryOrder.update({
        where: { id: inquiry.id },
        data: { status: 'quoting' },
      });

      await tx.auditLog.create({
        data: {
          tenantId: inquiry.tenantId,
          userId: input.userId,
          action: 'quote.create',
          resource: 'clearance_quote',
          resourceId: quote.id,
          after: { business_number: businessNumber, total_amount: totalAmount },
        },
      });

      return quote;
    });
  }

  /**
   * 更新报价状态
   */
  async updateStatus(id: string, status: string, userId: string) {
    const allowed = ['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired'];
    if (!allowed.includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: `Invalid status: ${status}` });
    }
    const quote = await this.prisma.clearanceQuote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }

    const data: Prisma.ClearanceQuoteUpdateInput = { status };
    if (status === 'sent') data.sentAt = new Date();
    if (status === 'accepted') data.acceptedAt = new Date();
    if (status === 'rejected') data.rejectedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clearanceQuote.update({ where: { id }, data });
      // 同步询价单状态
      if (status === 'sent') {
        await tx.inquiryOrder.update({ where: { id: quote.inquiryOrderId }, data: { status: 'quoted' } });
      }
      if (status === 'accepted') {
        await tx.inquiryOrder.update({ where: { id: quote.inquiryOrderId }, data: { status: 'confirmed' } });
      }
      if (status === 'rejected') {
        await tx.inquiryOrder.update({ where: { id: quote.inquiryOrderId }, data: { status: 'submitted' } });
      }
      await tx.auditLog.create({
        data: {
          tenantId: quote.tenantId,
          userId,
          action: 'quote.update_status',
          resource: 'clearance_quote',
          resourceId: id,
          before: { status: quote.status },
          after: { status },
        },
      });
      return updated;
    });
  }

  /**
   * 删除（软删）
   */
  async delete(id: string, userId: string) {
    const quote = await this.prisma.clearanceQuote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }
    await this.prisma.clearanceQuote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: quote.tenantId,
        userId,
        action: 'quote.delete',
        resource: 'clearance_quote',
        resourceId: id,
      },
    });
    return { success: true };
  }

  /**
   * 撤回报价（管理端）
   *
   * 状态写入 withdrawn；询价单回到 submitted —— 让客户端走 InquiryDetailPage
   * 的"提交询价"按钮重新提交，便于操作员撤回错误报价后重新发起。
   * 历史报价保留（不软删），新报价创建时通过 status != 'withdrawn' 的判定放行。
   */
  async withdraw(id: string, userId: string) {
    const quote = await this.prisma.clearanceQuote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }
    const withdrawable: ReadonlyArray<string> = ['draft', 'pending_approval', 'approved', 'sent'];
    if (!withdrawable.includes(quote.status)) {
      throw new BadRequestException({
        code: 'QUOTE_NOT_WITHDRAWABLE',
        message: `Cannot withdraw quote in status "${quote.status}"`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clearanceQuote.update({
        where: { id },
        data: {
          status: 'withdrawn',
          withdrawnAt: new Date(),
          withdrawnById: userId,
        },
      });
      await tx.inquiryOrder.update({
        where: { id: quote.inquiryOrderId },
        data: { status: 'submitted' },
      });
      await tx.auditLog.create({
        data: {
          tenantId: quote.tenantId,
          userId,
          action: 'quote.withdraw',
          resource: 'clearance_quote',
          resourceId: id,
          before: { status: quote.status },
          after: { status: 'withdrawn' },
        },
      });
      return updated;
    });
  }

  /**
   * 生成 PDF（占位）
   *
   * 真实引擎后续接入。当前写一个明确的 HTML 占位到 Storage 拿回 public URL，
   * 写入 quote.pdfUrl / pdfGeneratedAt，作为可点开的链接。
   */
  async generatePdf(id: string, userId: string) {
    const quote = await this.prisma.clearanceQuote.findFirst({
      where: { id, deletedAt: null },
      include: { tenant: true, inquiryOrder: true },
    });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }

    const lineItems = (quote.lineItems as unknown as QuoteLineItem[]) ?? [];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Quote ${quote.businessNumber}</title></head><body>
<h1>Quote ${quote.businessNumber}</h1>
<p><b>PDF STUB</b> — real rendering engine not yet wired. Generated at ${new Date().toISOString()}.</p>
<p>Customer: ${quote.tenant.name} (${quote.tenant.code})</p>
<p>Total: ${quote.currency} ${quote.totalAmount.toString()}</p>
<table border="1" cellpadding="6" cellspacing="0">
<thead><tr><th>Name</th><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
<tbody>
${lineItems.map((li) => `<tr><td>${escapeHtml(li.name)}</td><td>${escapeHtml(li.description ?? '')}</td><td>${li.quantity ?? 1}</td><td>${li.unit_price}</td><td>${li.amount}</td></tr>`).join('\n')}
</tbody></table>
</body></html>`;

    const key = this.storage.buildKey(quote.tenantId, `${quote.id}.html`);
    await this.storage.put(key, Buffer.from(html, 'utf-8'), 'text/html; charset=utf-8');
    const pdfUrl = this.storage.getPublicUrl(key);

    const updated = await this.prisma.clearanceQuote.update({
      where: { id },
      data: { pdfUrl, pdfGeneratedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: quote.tenantId,
        userId,
        action: 'quote.generate_pdf',
        resource: 'clearance_quote',
        resourceId: id,
        after: { pdfUrl },
      },
    });

    return updated;
  }

  /**
   * 客户端：分页查询本租户的报价
   */
  async findAllForTenant(tenantId: string, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.clearanceQuote.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { inquiryOrder: { select: { businessNumber: true } } },
      }),
      this.prisma.clearanceQuote.count({ where: { tenantId, deletedAt: null } }),
    ]);
    return {
      items: items.map((q) => ({
        id: q.id,
        business_number: q.businessNumber,
        inquiry_order_id: q.inquiryOrderId,
        inquiry_business_number: q.inquiryOrder?.businessNumber,
        total_amount: q.totalAmount.toString(),
        currency: q.currency,
        status: q.status,
        created_at: q.createdAt,
        sent_at: q.sentAt,
        accepted_at: q.acceptedAt,
        rejected_at: q.rejectedAt,
        withdrawn_at: q.withdrawnAt,
        pdf_url: q.pdfUrl,
      })),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 客户端：查询单条报价，限定租户
   */
  async findByIdForTenant(id: string, tenantId: string) {
    const quote = await this.prisma.clearanceQuote.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { inquiryOrder: true },
    });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }
    const inq = quote.inquiryOrder;
    return {
      id: quote.id,
      business_number: quote.businessNumber,
      tenant_id: quote.tenantId,
      inquiry_order_id: quote.inquiryOrderId,
      inquiry_business_number: inq?.businessNumber,
      inquiry_origin_port: inq?.originPort,
      inquiry_destination_port: inq?.destinationPort,
      line_items: (quote.lineItems as unknown as QuoteLineItem[]) ?? [],
      total_amount: quote.totalAmount.toString(),
      currency: quote.currency,
      cost_amount: quote.costAmount.toString(),
      status: quote.status,
      valid_until: quote.validUntil,
      customer_notes: quote.customerNotes,
      created_at: quote.createdAt,
      sent_at: quote.sentAt,
      accepted_at: quote.acceptedAt,
      rejected_at: quote.rejectedAt,
      withdrawn_at: quote.withdrawnAt,
      pdf_url: quote.pdfUrl,
      pdf_generated_at: quote.pdfGeneratedAt,
    };
  }

  /**
   * 客户端：接受报价
   */
  async clientAccept(id: string, tenantId: string, userId: string) {
    return this.clientTransition(id, tenantId, userId, 'accept', 'accepted', 'confirmed');
  }

  /**
   * 客户端：拒绝报价
   */
  async clientReject(id: string, tenantId: string, userId: string) {
    return this.clientTransition(id, tenantId, userId, 'reject', 'rejected', 'submitted');
  }

  private async clientTransition(
    id: string,
    tenantId: string,
    userId: string,
    actionName: 'accept' | 'reject',
    targetStatus: 'accepted' | 'rejected',
    inquiryStatus: 'confirmed' | 'submitted',
  ) {
    const quote = await this.prisma.clearanceQuote.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!quote) {
      throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }
    if (quote.status !== 'sent') {
      throw new BadRequestException({
        code: 'QUOTE_NOT_ACTIONABLE',
        message: `Cannot ${actionName} quote in status "${quote.status}"`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.ClearanceQuoteUpdateInput = { status: targetStatus };
      if (targetStatus === 'accepted') data.acceptedAt = new Date();
      if (targetStatus === 'rejected') data.rejectedAt = new Date();
      const updated = await tx.clearanceQuote.update({ where: { id }, data });
      await tx.inquiryOrder.update({
        where: { id: quote.inquiryOrderId },
        data: { status: inquiryStatus },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: `quote.client_${actionName}`,
          resource: 'clearance_quote',
          resourceId: id,
          before: { status: 'sent' },
          after: { status: targetStatus },
        },
      });
      return updated;
    });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}