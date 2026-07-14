import { apiClient } from './api';

export interface VersionInfo {
  current: string;
  latest: string | null;
  has_update: boolean;
  configured: boolean;
  release_url?: string | null;
  release_notes?: string | null;
  published_at?: string | null;
  error?: string;
}

/**
 * 检查更新：返回当前版本 + GitHub 最新 Release 对比结果
 */
export async function checkVersion(): Promise<VersionInfo> {
  const res = await apiClient.get<VersionInfo>('/system/version');
  return res.data;
}

export interface UpdateStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  /** 最近 ~200 行日志（stdout+stderr 行合并） */
  lastLines: string[];
}

/**
 * 触发后台更新（管理员）
 *
 * 后端返回 202。并发触发会拿到 409（UPDATE_ALREADY_RUNNING）。
 */
export async function applyUpdate(): Promise<{ startedAt: string }> {
  const res = await apiClient.post<{ startedAt: string }>('/system/apply-update');
  return res.data;
}

/**
 * 查询当前更新任务状态（管理员）
 */
export async function getUpdateStatus(): Promise<UpdateStatus> {
  const res = await apiClient.get<UpdateStatus>('/system/update-status');
  return res.data;
}
