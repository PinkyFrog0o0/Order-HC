/**
 * 报表
 *
 * 阶段 1：基本汇总（按状态/时间/租户分组）
 * 阶段 2：自定义报表（用户选维度/指标）
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 仪表盘：关键指标
   */
  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayInquiries,
      pendingQuotes,
      inProgressOrders,
      totalInquiries,
      totalQuotes,
      totalTenants,
      totalAgents,
      recentInquiries,
    ] = await Promise.all([
      this.prisma.inquiryOrder.count({ where: { createdAt: { gte: today } } }),
      this.prisma.clearanceQuote.count({ where: { status: { in: ['draft', 'pending_approval', 'approved'] } } }),
      this.prisma.inquiryOrder.count({ where: { status: 'in_progress' } }),
      this.prisma.inquiryOrder.count({ where: { deletedAt: null } }),
      this.prisma.clearanceQuote.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.clearanceAgent.count({ where: { deletedAt: null } }),
      this.prisma.inquiryOrder.findMany({
        where: { deletedAt: null },
        include: { tenant: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // 本月营收（已接受的报价）
    const monthQuotes = await this.prisma.clearanceQuote.findMany({
      where: { acceptedAt: { gte: monthStart }, status: 'accepted' },
      select: { totalAmount: true, currency: true },
    });
    const monthRevenue = monthQuotes.reduce((acc, q) => {
      const cur = q.currency;
      acc[cur] = (acc[cur] ?? 0) + Number(q.totalAmount);
      return acc;
    }, {} as Record<string, number>);

    return {
      today_inquiries: todayInquiries,
      pending_quotes: pendingQuotes,
      in_progress_orders: inProgressOrders,
      total_inquiries: totalInquiries,
      total_quotes: totalQuotes,
      total_tenants: totalTenants,
      total_agents: totalAgents,
      month_revenue: monthRevenue,
      recent_inquiries: recentInquiries.map((i) => ({
        id: i.id,
        business_number: i.businessNumber,
        tenant_code: i.tenant?.code,
        tenant_name: i.tenant?.name,
        status: i.status,
        created_at: i.createdAt,
      })),
    };
  }

  /**
   * 询价按状态分布
   */
  async inquiryStatusDistribution() {
    const groups = await this.prisma.inquiryOrder.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count.status }));
  }

  /**
   * 询价按租户分布
   */
  async inquiryByTenant() {
    const groups = await this.prisma.inquiryOrder.groupBy({
      by: ['tenantId'],
      where: { deletedAt: null },
      _count: { tenantId: true },
    });
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: groups.map((g) => g.tenantId) } },
      select: { id: true, code: true, name: true },
    });
    const map = new Map(tenants.map((t) => [t.id, t]));
    return groups.map((g) => ({
      tenant_id: g.tenantId,
      tenant_code: map.get(g.tenantId)?.code,
      tenant_name: map.get(g.tenantId)?.name,
      count: g._count.tenantId,
    }));
  }

  /**
   * 询价按天（最近 30 天）
   */
  async inquiryDaily(days = 30) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const all = await this.prisma.inquiryOrder.findMany({
      where: { createdAt: { gte: start }, deletedAt: null },
      select: { createdAt: true },
    });

    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const item of all) {
      const key = item.createdAt.toISOString().slice(0, 10);
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }
}