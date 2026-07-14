/**
 * JWT 认证 Guard
 *
 * 工作流程：
 * 1. 从 Authorization header 提取 Bearer token
 * 2. 校验 token 签名 + 过期
 * 3. 把 user context 挂到 req.user
 *
 * ⚠️ 公开路由（login/register/health）需要用 @Public() 装饰器跳过
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import type { UserContext } from '@haycargo/shared';

import { TokenService } from './token.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'TOKEN_REQUIRED',
        message: 'Missing Bearer token',
      });
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.tokenService.verify(token);
      const user: UserContext = {
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        role: payload.role,
        permissions: [], // 阶段 2：从 role/permissions 表加载
        is_admin: payload.is_admin,
      };
      (req as Request & { user: UserContext }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token is invalid or expired',
      });
    }
  }
}