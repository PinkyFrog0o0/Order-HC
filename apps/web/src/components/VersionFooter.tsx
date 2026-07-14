import { Button, Modal, Space, App as AntdApp } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { APP_VERSION } from '@haycargo/shared';

import { checkVersion } from '../lib/system';

/**
 * 侧边栏底部：版本号 + 检查更新
 *
 * "检查更新"为只读操作：调用 /system/version，与 GitHub 最新 Release 比对，
 * 提示是否有新版本。真正的升级执行是后续独立能力，这里不做。
 */
export function VersionFooter() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);

  const onCheck = async () => {
    setLoading(true);
    try {
      const info = await checkVersion();
      if (!info.configured) {
        message.info('更新源未配置（请管理员设置 GITHUB_REPO）');
        return;
      }
      if (info.error) {
        message.warning(`检查更新失败：${info.error}`);
        return;
      }
      if (info.has_update && info.latest) {
        Modal.info({
          title: `发现新版本 v${info.latest}`,
          content: (
            <div>
              <p>
                当前版本 v{info.current} → 最新版本 v{info.latest}
              </p>
              {info.release_url && (
                <p>
                  <a href={info.release_url} target="_blank" rel="noreferrer">
                    查看发布说明
                  </a>
                </p>
              )}
              {info.release_notes && (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                    fontSize: 12,
                    color: '#666',
                  }}
                >
                  {info.release_notes}
                </pre>
              )}
            </div>
          ),
        });
      } else {
        message.success(`已是最新版本 v${info.current}`);
      }
    } catch (err) {
      const e = err as { message?: string };
      message.error(`检查更新失败：${e.message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <span>v{APP_VERSION}</span>
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={onCheck}
          style={{ color: 'rgba(255,255,255,0.65)', paddingLeft: 0 }}
        >
          检查更新
        </Button>
      </Space>
    </div>
  );
}
