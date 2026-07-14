import { Button, Modal, Space, App as AntdApp, Spin } from 'antd';
import { ReloadOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

import { APP_VERSION } from '@haycargo/shared';

import { checkVersion, applyUpdate, getUpdateStatus } from '../lib/system';

/**
 * 侧边栏底部：版本号 + 检查更新 + 一键升级
 *
 * 检查更新：调 /system/version 与 GitHub Releases 对比。
 * 一键升级：发现新版本后渲染"更新到 vX.Y.Z"按钮；点击后调 /system/apply-update
 * 并轮询 /system/update-status 拉取实时日志（后端 update.sh 会重启 API，
 *   轮询遇 5xx 静默继续，不报红）。
 */
export function VersionFooter() {
  const { message, modal } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  /** 最近一次 checkVersion 的结果（决定是否渲染"升级"按钮） */
  const [info, setInfo] = useState<Awaited<ReturnType<typeof checkVersion>> | null>(null);
  /** 升级进度 modal 是否打开 */
  const [progressOpen, setProgressOpen] = useState(false);
  /** 升级结果状态（进度 modal 内部用） */
  const [progress, setProgress] = useState<{
    running: boolean;
    lines: string[];
    exitCode: number | null;
  }>({ running: false, lines: [], exitCode: null });
  /** 轮询句柄，关闭/结束时清掉 */
  const pollTimer = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => {
    // 组件卸载时清掉轮询，避免 setState 在 unmount 后
    return () => stopPolling();
  }, []);

  const onCheck = async () => {
    setLoading(true);
    try {
      const result = await checkVersion();
      setInfo(result);
      if (!result.configured) {
        message.info('更新源未配置（请管理员设置 GITHUB_REPO）');
        return;
      }
      if (result.error) {
        message.warning(`检查更新失败：${result.error}`);
        return;
      }
      if (result.has_update && result.latest) {
        Modal.info({
          title: `发现新版本 v${result.latest}`,
          content: (
            <div>
              <p>
                当前版本 v{result.current} → 最新版本 v{result.latest}
              </p>
              {result.release_url && (
                <p>
                  <a href={result.release_url} target="_blank" rel="noreferrer">
                    查看发布说明
                  </a>
                </p>
              )}
              {result.release_notes && (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                    fontSize: 12,
                    color: '#666',
                  }}
                >
                  {result.release_notes}
                </pre>
              )}
            </div>
          ),
        });
      } else {
        message.success(`已是最新版本 v${result.current}`);
      }
    } catch (err) {
      const e = err as { message?: string };
      message.error(`检查更新失败：${e.message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  /** 拉一次状态，按当前是否还在跑决定下一步动作 */
  const pollOnce = async () => {
    try {
      const status = await getUpdateStatus();
      setProgress({
        running: status.running,
        lines: status.lastLines,
        exitCode: status.exitCode,
      });
      if (!status.running) {
        // 不管成不成都停掉轮询
        stopPolling();
      }
    } catch {
      // 5xx / 网络错误：API 正在被 update.sh 重启中，静默继续。
    }
  };

  /** 开始轮询（每 2 秒一次） */
  const startPolling = () => {
    stopPolling();
    void pollOnce();
    pollTimer.current = window.setInterval(() => {
      void pollOnce();
    }, 2000);
  };

  const onApplyUpdate = () => {
    if (!info?.latest) return;

    modal.confirm({
      title: `确认升级到 v${info.latest}？`,
      content:
        '会拉取最新代码、重建、重启 API，约需 30 秒到几分钟。升级过程中 API 会重启、页面短暂不可用。',
      okText: '开始升级',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setProgress({ running: true, lines: [], exitCode: null });
        setProgressOpen(true);

        try {
          await applyUpdate();
        } catch (err) {
          const e = err as { code?: string; message?: string };
          if (e.code === 'UPDATE_ALREADY_RUNNING') {
            // 别人已经在跑——直接进入查看进度模式
          } else {
            // 真正的失败（403/500 等）→ 关掉 modal 报错
            setProgressOpen(false);
            message.error(`启动更新失败：${e.message ?? '未知错误'}`);
            return;
          }
        }

        startPolling();
      },
    });
  };

  /** 进度 modal 关闭按钮：根据状态给出合适的提示 */
  const closeProgressModal = () => {
    stopPolling();
    setProgressOpen(false);
    if (progress.exitCode === 0 && !progress.running) {
      message.success('升级完成，请刷新页面加载新版本');
    } else if (progress.exitCode !== null && progress.exitCode !== 0) {
      message.error('升级失败，可联系管理员查看 deploy/update.log');
    }
  };

  return (
    <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <span>v{APP_VERSION}</span>
        <Space size={4} wrap>
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
          {info?.has_update && info.latest && (
            <Button
              size="small"
              type="primary"
              icon={<CloudDownloadOutlined />}
              onClick={onApplyUpdate}
              style={{ paddingInline: 8 }}
            >
              更新到 v{info.latest}
            </Button>
          )}
        </Space>
      </Space>

      <Modal
        title={
          progress.running
            ? '正在升级…（API 会被重启，期间页面短暂不可用）'
            : progress.exitCode === 0
              ? '升级完成'
              : progress.exitCode !== null
                ? '升级失败'
                : '升级已触发'
        }
        open={progressOpen}
        onCancel={() => {
          // 用户点 X / Esc：根据进度决定是只关 modal 还是同时停轮询
          if (progress.running) {
            setProgressOpen(false);
            message.info('升级仍在后台继续；下次点"检查更新"再回来查看');
          } else {
            closeProgressModal();
          }
        }}
        footer={[
          <Button key="close" onClick={closeProgressModal}>
            {progress.running ? '后台查看' : '关闭'}
          </Button>,
        ]}
        width={760}
        maskClosable={false}
      >
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          {progress.running && <Spin size="small" />}
          <span>
            {progress.running
              ? '实时输出：'
              : progress.exitCode === 0
                ? `退出码 0，新版本已生效。`
                : progress.exitCode !== null
                  ? `退出码 ${progress.exitCode}，请参考下方日志排查。`
                  : '等待后端返回首条状态…'}
          </span>
        </div>
        <pre
          style={{
            background: '#0b1020',
            color: '#d6deeb',
            padding: 12,
            borderRadius: 6,
            maxHeight: 320,
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {progress.lines.length === 0
            ? '（暂无输出）'
            : progress.lines.join('\n')}
        </pre>
      </Modal>
    </div>
  );
}
