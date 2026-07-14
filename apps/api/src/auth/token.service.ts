/**
 * JWT 工具
 *
 * 单一封装：
 * - access token：短期（如 2h）
 * - refresh token：长期（如 7d）
 *
 * 阶段 1：只实现 access token 签发 + 校验
 * 阶段 2：补 refresh token + 撤销机制（黑名单存 Redis）
 */

import { Injectable } from '@nestjs/common';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

import { loadEnv } from '../config/env';

export interface TokenPayload extends JwtPayload {
  user_id: string;
  tenant_id: string | null;
  role: string;
  is_admin: boolean;
}

@Injectable()
export class TokenService {
  private get secret(): string {
    return loadEnv().JWT_SECRET;
  }

  sign(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const options: SignOptions = {
      expiresIn: loadEnv().JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, this.secret, options);
  }

  verify(token: string): TokenPayload {
    return jwt.verify(token, this.secret) as TokenPayload;
  }
}