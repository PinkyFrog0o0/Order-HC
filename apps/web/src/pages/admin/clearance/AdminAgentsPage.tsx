import { Button, Card, Form, Input, InputNumber, Select, Space, Table, Tag, App as AntdApp, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { ClearanceAgent, createAgent, deleteAgent, listAgents, updateAgent } from '../../../lib/admin';

const STATUS_OPTIONS = [
  { value: 'active', label: '合作中' },
  { value: 'suspended', label: '暂停' },
  { value: 'terminated', label: '终止' },
];

export function AdminAgentsPage() {
  const { message, modal } = AntdApp.useApp();
  const [items, setItems] = useState<ClearanceAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<ClearanceAgent> | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listAgents({ page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); }, []);

  const openModal = (agent?: ClearanceAgent) => {
    setEditing(agent ?? { status: 'active' });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.code || !editing.name) {
      message.error('代码和名称必填');
      return;
    }
    try {
      if (editing.id) {
        await updateAgent(editing.id, editing);
        message.success('已更新');
      } else {
        await createAgent(editing as { code: string; name: string });
        message.success('已创建');
      }
      setEditing(null);
      void load();
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    }
  };

  const remove = (id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '确定删除此清关行？',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteAgent(id);
          message.success('已删除');
          void load();
        } catch (err) {
          message.error(`失败: ${(err as { message?: string }).message ?? '未知错误'}`);
        }
      },
    });
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h2 style={{ margin: 0 }}>清关行配置</h2>
          <Button type="primary" onClick={() => openModal()}>+ 新建清关行</Button>
        </Space>
      </Card>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: '代码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name' },
          { title: '电话', dataIndex: 'contactPhone', width: 150 },
          { title: '邮箱', dataIndex: 'contactEmail', width: 200 },
          { title: '专长口岸', dataIndex: 'specialPorts', ellipsis: true },
          { title: '绩效', dataIndex: 'performanceRating', width: 100, render: (v: string | null) => v ?? '-' },
          {
            title: '状态', dataIndex: 'status', width: 100,
            render: (s: string) => {
              const map: Record<string, { text: string; color: string }> = {
                active: { text: '合作中', color: 'green' },
                suspended: { text: '暂停', color: 'orange' },
                terminated: { text: '终止', color: 'red' },
              };
              const cfg = map[s] ?? { text: s, color: 'default' };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          {
            title: '操作', width: 150, fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => openModal(r)}>编辑</Button>
                <Button type="link" size="small" danger onClick={() => remove(r.id)}>删除</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing?.id ? '编辑清关行' : '新建清关行'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="代码" required>
              <Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} disabled={!!editing.id} />
            </Form.Item>
            <Form.Item label="名称" required>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Form.Item>
            <Form.Item label="电话">
              <Input value={editing.contactPhone ?? ''} onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })} />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input value={editing.contactEmail ?? ''} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} />
            </Form.Item>
            <Form.Item label="地址">
              <Input.TextArea rows={2} value={editing.contactAddress ?? ''} onChange={(e) => setEditing({ ...editing, contactAddress: e.target.value })} />
            </Form.Item>
            <Form.Item label="专长口岸 (逗号分隔港口代码)">
              <Input value={editing.specialPorts ?? ''} onChange={(e) => setEditing({ ...editing, specialPorts: e.target.value })} placeholder="如: SHA, HAM, RTM" />
            </Form.Item>
            <Form.Item label="绩效评分 (0-5)">
              <InputNumber min={0} max={5} step={0.1} value={editing.performanceRating ? Number(editing.performanceRating) : null} onChange={(v) => setEditing({ ...editing, performanceRating: v != null ? String(v) : null })} />
            </Form.Item>
            <Form.Item label="状态">
              <Select value={editing.status ?? 'active'} onChange={(v) => setEditing({ ...editing, status: v })} options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="备注">
              <Input.TextArea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}