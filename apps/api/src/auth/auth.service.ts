import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';

import {
  LoginInput,
  LoginResponse,
  RegisterInput,
  loginResponseSchema,
} from './auth.schemas';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(input: LoginInput): Promise<LoginResponse> {
    // 找到用户（支持 email 或 phone）
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email } : { id: '00000000-0000-0000-0000-000000000000' },
          input.phone ? { phone: input.phone } : { id: '00000000-0000-0000-0000-000000000000' },
        ],
        deletedAt: null,
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException({ code: 'USER_DISABLED', message: 'User is disabled' });
    }

    // 客户端用户必须匹配 tenant_code
    if (user.tenantId) {
      if (user.tenant?.code !== input.tenant_code) {
        throw new UnauthorizedException({ code: 'TENANT_MISMATCH', message: 'Tenant mismatch' });
      }
      if (user.tenant?.status !== 'active') {
        throw new UnauthorizedException({ code: 'TENANT_SUSPENDED', message: 'Tenant is suspended' });
      }
    } else if (input.tenant_code) {
      // 管理员传了 tenant_code 但用户无 tenant_id — 也算不匹配
      throw new UnauthorizedException({ code: 'TENANT_MISMATCH', message: 'Tenant mismatch' });
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    // 更新最后登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const isAdmin = !user.tenantId; // 管理员无 tenant_id
    const accessToken = this.tokenService.sign({
      user_id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
      is_admin: isAdmin,
    });

    return loginResponseSchema.parse({
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.fullName,
        role: user.role,
        tenant_id: user.tenantId,
      },
    });
  }

  async register(input: RegisterInput): Promise<LoginResponse> {
    // 找到租户
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: input.tenant_code },
    });
    if (!tenant || tenant.status !== 'active') {
      throw new UnauthorizedException({ code: 'INVALID_TENANT', message: 'Invalid tenant' });
    }

    // 检查邮箱是否已被注册
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new UnauthorizedException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        phone: input.phone,
        passwordHash,
        fullName: input.full_name,
        role: 'client_user', // 注册默认为普通客户端用户
      },
    });

    // 写审计日志
    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        action: 'user.register',
        resource: 'user',
        resourceId: user.id,
        after: { email: user.email, role: user.role },
      },
    });

    const accessToken = this.tokenService.sign({
      user_id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
      is_admin: false,
    });

    return loginResponseSchema.parse({
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.fullName,
        role: user.role,
        tenant_id: user.tenantId,
      },
    });
  }
}