/**
 * 多租户中间件（升级版）
 *
 * 设计：直接从 Authorization header 解析 JWT，不依赖 JwtAuthGuard 的执行顺序
 * （NestJS 中间件先于 Guard 运行）
 *
 * 优先级：
 * 1. JWT claims → tenant_id
 * 2. x-tenant-id header → service-to-service
 * 3. 管理员（JWT is_admin=true）允许通过
 */

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import type { UserContext } from '@haycargo/shared';

import { TokenService } from '../../auth/token.service';
import { loadEnv } from '../../config/env';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        code: string;
      };
      user?: UserContext;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tokenService: TokenService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const env = loadEnv();

    // 公开路由：跳过 tenant 校验
    // 注意：中间件按路由挂载，req.path 是相对挂载点的（'/'），真实路径在 req.originalUrl
    const publicPaths = ['/health', '/auth/login', '/auth/register'];
    const isPublic = publicPaths.some((p) => req.originalUrl.includes(p));
    if (isPublic) {
      return next();
    }

    // 优先级 1：解析 Authorization header 中的 JWT
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.tokenService.verify(authHeader.slice(7));
        req.user = {
          user_id: payload.user_id,
          tenant_id: payload.tenant_id,
          role: payload.role,
          permissions: [],
          is_admin: payload.is_admin,
        };
        if (payload.tenant_id) {
          req.tenant = { id: payload.tenant_id, code: 'FROM_JWT' };
          return next();
        }
        if (payload.is_admin) {
          // 管理员无 tenant_id 但允许通过
          return next();
        }
      } catch {
        throw new UnauthorizedException({
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or expired',
        });
      }
    }

    // 优先级 2：从 x-tenant-id header 取（service-to-service）
    const tenantHeader = req.headers[env.TENANT_HEADER] as string | undefined;
    if (tenantHeader) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tenantHeader,
      );
      if (!isUuid) {
        throw new UnauthorizedException({
          code: 'INVALID_TENANT',
          message: 'Tenant header must be a valid UUID',
        });
      }
      req.tenant = { id: tenantHeader, code: 'FROM_HEADER' };
      return next();
    }

    throw new UnauthorizedException({
      code: 'TENANT_REQUIRED',
      message: 'Missing tenant context (JWT or x-tenant-id header required)',
    });
  }
}