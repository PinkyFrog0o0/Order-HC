/**
 * 版本 / 检查更新
 *
 * 当前版本为本模块内常量 APP_VERSION（后端不能运行时引入 @haycargo/shared 源码包）。
 * 最新版本来自 GitHub Releases（需配置 GITHUB_REPO）。
 * 未配置或查询失败时优雅降级，不抛错——"检查更新"是只读、非关键路径。
 */

import { Injectable, Logger } from '@nestjs/common';

import { loadEnv } from '../config/env';

import { UpdateRunner, UpdateStatus } from './update-runner';

/**
 * 当前产品版本。
 *
 * 注意：不能从 @haycargo/shared 运行时引入——该包 main 指向 src/*.ts 源码，
 * 编译后的 API（CJS）require 它会因缺扩展名解析失败。前端可从 shared 引入。
 * 发布新版时：本常量与 packages/shared/src/constants.ts 的 APP_VERSION 一起改。
 */
const APP_VERSION = '2.1.1';

export interface VersionCheckResult {
  current: string;
  latest: string | null;
  has_update: boolean;
  /** 是否配置了更新源（GITHUB_REPO） */
  configured: boolean;
  release_url?: string | null;
  release_notes?: string | null;
  published_at?: string | null;
  error?: string;
}

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

  constructor(private readonly updateRunner: UpdateRunner) {}

  async check(): Promise<VersionCheckResult> {
    const env = loadEnv();
    const current = APP_VERSION;

    if (!env.GITHUB_REPO) {
      return { current, latest: null, has_update: false, configured: false };
    }

    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'haycargo',
      };
      if (env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/releases/latest`,
        { headers },
      );

      if (!res.ok) {
        // 404 = 仓库还没有任何 Release：属正常状态，不当错误处理（视为"暂无更新"）
        if (res.status === 404) {
          return { current, latest: null, has_update: false, configured: true };
        }
        // 其它（401/403 权限或速率限制等）才算错误
        return {
          current,
          latest: null,
          has_update: false,
          configured: true,
          error: `GitHub API ${res.status}`,
        };
      }

      const data = (await res.json()) as {
        tag_name?: string;
        html_url?: string;
        body?: string;
        published_at?: string;
      };
      const latest = String(data.tag_name ?? '').replace(/^v/i, '').trim();

      return {
        current,
        latest: latest || null,
        has_update: latest ? isNewer(latest, current) : false,
        configured: true,
        release_url: data.html_url ?? null,
        release_notes: data.body ?? null,
        published_at: data.published_at ?? null,
      };
    } catch (err) {
      this.logger.warn(`Version check failed: ${(err as Error).message}`);
      return {
        current,
        latest: null,
        has_update: false,
        configured: true,
        error: (err as Error).message,
      };
    }
  }

  /**
   * 触发一次更新（管理员操作）。
   * 实际是扔 update.sh 去 background；并发触发由 runner 自己抛 UpdateAlreadyRunningError。
   */
  applyUpdate(): { startedAt: string } {
    this.updateRunner.start();
    return { startedAt: new Date().toISOString() };
  }

  /**
   * 查询当前更新任务状态。
   */
  getUpdateStatus(): UpdateStatus {
    return this.updateRunner.status();
  }
}

/**
 * 语义化版本比较：a 是否比 b 新。仅比较数字段（1.2.3），忽略预发布后缀。
 */
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
