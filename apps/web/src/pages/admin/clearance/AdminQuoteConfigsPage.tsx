import { Button, Card, Form, Input, InputNumber, Space, Switch, Table, App as AntdApp, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { createQuoteConfig, deleteQuoteConfig, listQuoteConfigs, updateQuoteConfig } from '../../../lib/admin';

interface QuoteConfig {
  id: string;
  name: string;
  conditions: Record<string, unknown>;
  marginPercent: string;
  minimumCharge: string | null;
  enabled: boolean;
  priority: number;
}

export function AdminQuoteConfigsPage() {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<QuoteConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<QuoteConfig> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listQuoteConfigs();
      setItems(data.items);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name) { message.error('名称必填'); return; }
    try {
      if (editing.id) {
        await updateQuoteConfig(editing.id, editing as unknown as Parameters<typeof updateQuoteConfig>[1]);
        message.success('已更新');
      } else {
        await createQuoteConfig({
          name: editing.name!,
          conditions: editing.conditions ?? {},
          marginPercent: Number(editing.marginPercent) || 0,
          minimumCharge: editing.minimumCharge ? Number(editing.minimumCharge) : undefined,
          enabled: editing.enabled,
          priority: editing.priority,
        });
        message.success('已创建');
      }
      setEditing(null);
      void load();
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    }
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h2 style={{ margin: 0 }}>报价配置（利润率模板）</h2>
          <Button type="primary" onClick={() => setEditing({ enabled: true, priority: 100, conditions: {}, marginPercent: '20' })}>+ 新建配置</Button>
        </Space>
      </Card>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '利润率', dataIndex: 'marginPercent', width: 100, render: (v: string) => `${v}%` },
          { title: '最低收费', dataIndex: 'minimumCharge', width: 100, render: (v: string | null) => v ?? '-' },
          { title: '优先级', dataIndex: 'priority', width: 80 },
          { title: '启用', dataIndex: 'enabled', width: 80, render: (v: boolean) => v ? <span style={{ color: 'green' }}>✓</span> : <span style={{ color: '#999' }}>✗</span> },
          {
            title: '操作', width: 150,
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => setEditing(r)}>编辑</Button>
                <Button type="link" size="small" danger onClick={async () => { await deleteQuoteConfig(r.id); message.success('已删'); void load(); }}>删除</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing?.id ? '编辑报价配置' : '新建报价配置'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
        width={500}
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="名称" required>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Form.Item>
            <Form.Item label="利润率 (%)">
              <InputNumber value={editing.marginPercent ? Number(editing.marginPercent) : 0} onChange={(v) => setEditing({ ...editing, marginPercent: String(v ?? 0) })} min={0} max={500} />
            </Form.Item>
            <Form.Item label="最低收费">
              <InputNumber value={editing.minimumCharge ? Number(editing.minimumCharge) : null} onChange={(v) => setEditing({ ...editing, minimumCharge: v ? String(v) : undefined })} />
            </Form.Item>
            <Form.Item label="优先级">
              <InputNumber value={editing.priority ?? 100} onChange={(v) => setEditing({ ...editing, priority: v ?? 100 })} />
            </Form.Item>
            <Form.Item label="适用条件 (JSON)">
              <Input.TextArea
                rows={2}
                value={JSON.stringify(editing.conditions ?? {}, null, 2)}
                onChange={(e) => {
                  try { setEditing({ ...editing, conditions: JSON.parse(e.target.value) }); } catch { /* ignore */ }
                }}
              />
            </Form.Item>
            <Form.Item label="启用">
              <Switch checked={editing.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}