import { Button, Card, Form, Input, Select, Space, Table, Tag, App as AntdApp, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { AdminTenant, createAdminTenant, listAdminTenants, updateAdminTenant } from '../../../lib/admin';

export function AdminTenantsPage() {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<AdminTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<AdminTenant> | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listAdminTenants({ page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(1); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.id && (!editing.code || !editing.name)) { message.error('代码和名称必填'); return; }
    try {
      if (editing.id) {
        await updateAdminTenant(editing.id, { name: editing.name, status: editing.status });
        message.success('已更新');
      } else {
        await createAdminTenant({ code: editing.code!, name: editing.name! });
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
          <h2 style={{ margin: 0 }}>客户管理</h2>
          <Button type="primary" onClick={() => setEditing({ status: 'active' })}>+ 新建客户</Button>
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
          { title: '用户数', dataIndex: 'user_count', width: 100 },
          { title: '询价单数', dataIndex: 'inquiry_count', width: 120 },
          {
            title: '状态', dataIndex: 'status', width: 100,
            render: (s: string) => {
              const map: Record<string, { text: string; color: string }> = {
                active: { text: '正常', color: 'green' },
                suspended: { text: '暂停', color: 'orange' },
                deleted: { text: '已删除', color: 'red' },
              };
              const cfg = map[s] ?? { text: s, color: 'default' };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          { title: '创建时间', dataIndex: 'created_at', width: 180, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
          {
            title: '操作', width: 150, fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => setEditing(r)}>编辑</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing?.id ? '编辑客户' : '新建客户'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="代码" required>
              <Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} disabled={!!editing.id} />
            </Form.Item>
            <Form.Item label="名称" required>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Form.Item>
            {editing.id && (
              <Form.Item label="状态">
                <Select value={editing.status ?? 'active'} onChange={(v) => setEditing({ ...editing, status: v })} options={[{ value: 'active', label: '正常' }, { value: 'suspended', label: '暂停' }]} />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </>
  );
}