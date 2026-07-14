/**
 * 系统管理：用户/租户
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== 用户 =====
  async listUsers(params: { tenantId?: string; role?: string; page: number; pageSize: number }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.tenantId && { tenantId: params.tenantId }),
      ...(params.role && { role: params.role }),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { tenant: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        ...u,
        passwordHash: undefined,
        tenant_code: u.tenant?.code,
        tenant_name: u.tenant?.name,
        tenant: undefined,
      })),
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async createUser(input: {
    tenantId?: string;
    email?: string;
    phone?: string;
    password: string;
    fullName: string;
    role: string;
  }, userId: string) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email,
        phone: input.phone,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        status: 'active',
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'user.create', resource: 'user', resourceId: user.id, after: { email: user.email, role: user.role } },
    });
    return { ...user, passwordHash: undefined };
  }

  async updateUser(id: string, input: Partial<{ fullName: string; role: string; status: string; password: string }>, userId: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const data: Prisma.UserUpdateInput = {
      ...(input.fullName && { fullName: input.fullName }),
      ...(input.role && { role: input.role }),
      ...(input.status && { status: input.status }),
    };
    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
    }
    const updated = await this.prisma.user.update({ where: { id }, data });
    await this.prisma.auditLog.create({
      data: { userId, action: 'user.update', resource: 'user', resourceId: id },
    });
    return { ...updated, passwordHash: undefined };
  }

  async deleteUser(id: string, userId: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'user.delete', resource: 'user', resourceId: id },
    });
    return { success: true };
  }

  // ===== 租户 =====
  async listTenants(params: { status?: string; page: number; pageSize: number }) {
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      ...(params.status && { status: params.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: { _count: { select: { users: true, inquiryOrders: true } } },
        orderBy: { code: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return {
      items: items.map((t) => ({
        ...t,
        user_count: t._count.users,
        inquiry_count: t._count.inquiryOrders,
        _count: undefined,
      })),
      total,
      page: params.page,
      page_size: params.pageSize,
      total_pages: Math.ceil(total / params.pageSize),
    };
  }

  async createTenant(input: { code: string; name: string; contact?: Record<string, unknown>; settings?: Record<string, unknown> }, userId: string) {
    const tenant = await this.prisma.tenant.create({
      data: {
        code: input.code,
        name: input.name,
        contact: input.contact as Prisma.InputJsonValue,
        settings: input.settings as Prisma.InputJsonValue,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'tenant.create', resource: 'tenant', resourceId: tenant.id },
    });
    return tenant;
  }

  async updateTenant(id: string, input: Partial<{ name: string; contact: Record<string, unknown>; settings: Record<string, unknown>; status: string }>, userId: string) {
    const existing = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.contact !== undefined && { contact: input.contact as Prisma.InputJsonValue }),
        ...(input.settings !== undefined && { settings: input.settings as Prisma.InputJsonValue }),
        ...(input.status && { status: input.status }),
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'tenant.update', resource: 'tenant', resourceId: id },
    });
    return updated;
  }
}