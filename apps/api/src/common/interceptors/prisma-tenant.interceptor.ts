import {
  ExecutionContext,
  Injectable,
  NestInterceptor,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Prisma 查询拦截器（占位）
 *
 * 阶段 2 实现：
 * - 自动给查询注入 tenant_id where 条件
 * - 自动给写操作注入 tenant_id 字段
 *
 * 阶段 1：仅占位，不做实际拦截
 */
@Injectable()
export class PrismaTenantInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(tap(() => undefined));
  }
}