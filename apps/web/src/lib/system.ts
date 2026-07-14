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
