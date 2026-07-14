import { Button, Card, Form, Input, Select, Space, Table, Tag, App as AntdApp, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { AdminTenant, AdminUser, createAdminUser, deleteAdminUser, listAdminTenants, listAdminUsers, updateAdminUser } from '../../../lib/admin';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: '超级管理员' },
  { value: 'admin', label: '管理员' },
  { value: 'operator', label: '操作员' },
  { value: 'finance', label: '财务' },
  { value: 'ops', label: '运营' },
  { value: 'client_admin', label: '客户管理员' },
  { value: 'client_user', label: '客户用户' },
  { value: 'client_finance', label: '客户财务' },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'red',
  admin: 'volcano',
  operator: 'blue',
  finance: 'gold',
  ops: 'green',
  client_admin: 'purple',
  client_user: 'default',
  client_finance: 'cyan',
};

export function AdminUsersPage() {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<AdminUser> & { password?: string } | null>(null);
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const [filterTenant, setFilterTenant] = useState<string | undefined>();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listAdminUsers({ tenantId: filterTenant, role: filterRole, page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    listAdminTenants({ pageSize: 100 }).then((d) => setTenants(d.items)).catch(() => undefined);
  }, []);

  useEffect(() => { void load(1); setPage(1); }, [filterRole, filterTenant]);

  const save = async () => {
    if (!editing) return;
    if (!editing.email && !editing.phone) { message.error('邮箱或手机至少填一个'); return; }
    if (!editing.id && !editing.password) { message.error('新用户必须设置密码'); return; }
    if (!editing.fullName || !editing.role) { message.error('姓名和角色必填'); return; }
    try {
      if (editing.id) {
        const payload: { fullName: string; role: string; status?: string; password?: string } = {
          fullName: editing.fullName,
          role: editing.role,
        };
        if (editing.status) payload.status = editing.status;
        if (editing.password) payload.password = editing.password;
        await updateAdminUser(editing.id, payload);
        message.success('已更新');
      } else {
        await createAdminUser({
          tenantId: editing.tenantId ?? undefined,
          email: editing.email ?? undefined,
          phone: editing.phone ?? undefined,
          password: editing.password!,
          fullName: editing.fullName,
          role: editing.role,
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
          <h2 style={{ margin: 0 }}>用户管理</h2>
          <Space>
            <Select
              allowClear
              placeholder="按客户筛选"
              style={{ width: 180 }}
              value={filterTenant}
              onChange={setFilterTenant}
              options={tenants.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` }))}
              showSearch
              optionFilterProp="label"
            />
            <Select
              allowClear
              placeholder="按角色筛选"
              style={{ width: 160 }}
              value={filterRole}
              onChange={setFilterRole}
              options={ROLE_OPTIONS}
            />
            <Button type="primary" onClick={() => setEditing({ role: 'client_user', status: 'active' })}>+ 新建用户</Button>
          </Space>
        </Space>
      </Card>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: '姓名', dataIndex: 'fullName', width: 120 },
          { title: '邮箱', dataIndex: 'email', width: 200, render: (v: string | null) => v ?? '-' },
          { title: '手机', dataIndex: 'phone', width: 150, render: (v: string | null) => v ?? '-' },
          { title: '客户', dataIndex: 'tenant_name', width: 150, render: (v: string | null) => v ?? <Tag color="purple">平台用户</Tag> },
          { title: '角色', dataIndex: 'role', width: 100, render: (v: string) => <Tag color={ROLE_COLORS[v] ?? 'default'}>{ROLE_OPTIONS.find((r) => r.value === v)?.label ?? v}</Tag> },
          { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => v === 'active' ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag> },
          { title: '最后登录', dataIndex: 'lastLoginAt', width: 160, render: (v: string | null) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
          {
            title: '操作', width: 150, fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => setEditing(r)}>编辑</Button>
                <Button type="link" size="small" danger onClick={async () => { await deleteAdminUser(r.id); message.success('已删'); void load(); }}>删除</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing?.id ? '编辑用户' : '新建用户'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
        width={500}
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="客户（不选=平台管理员）">
              <Select
                allowClear
                value={editing.tenantId ?? undefined}
                onChange={(v) => setEditing({ ...editing, tenantId: v ?? null })}
                options={tenants.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` }))}
              />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} disabled={!!editing.id} />
            </Form.Item>
            <Form.Item label="手机">
              <Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </Form.Item>
            <Form.Item label="姓名" required>
              <Input value={editing.fullName ?? ''} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
            </Form.Item>
            <Form.Item label="角色" required>
              <Select value={editing.role} onChange={(v) => setEditing({ ...editing, role: v })} options={ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item label={editing.id ? '新密码（留空不修改）' : '密码'} required={!editing.id}>
              <Input.Password value={editing.password ?? ''} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
            </Form.Item>
            {editing.id && (
              <Form.Item label="状态">
                <Select value={editing.status ?? 'active'} onChange={(v) => setEditing({ ...editing, status: v })} options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]} />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </>
  );
}