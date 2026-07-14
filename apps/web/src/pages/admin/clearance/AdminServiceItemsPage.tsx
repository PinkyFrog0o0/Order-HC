import { Button, Card, Form, Input, Select, Space, Switch, Table, Tag, App as AntdApp, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { ServiceItem, createServiceItem, deleteServiceItem, listServiceItems, updateServiceItem } from '../../../lib/admin';

const CATEGORY_OPTIONS = [
  { value: 'fee', label: '费用' },
  { value: 'tax', label: '税费' },
  { value: 'service', label: '服务' },
  { value: 'surcharge', label: '附加费' },
];

const CATEGORY_COLORS: Record<string, string> = {
  fee: 'blue',
  tax: 'gold',
  service: 'green',
  surcharge: 'volcano',
};

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

export function AdminServiceItemsPage() {
  const { message, modal } = AntdApp.useApp();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<ServiceItem> | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(true);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listServiceItems({ category: filterCategory, enabled: filterEnabled, page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); setPage(1); }, [filterCategory, filterEnabled]);

  const openModal = (item?: ServiceItem) => {
    setEditing(item ?? { enabled: true, category: 'service' });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.code || !editing.name || !editing.category || !editing.unit) {
      message.error('代码 / 名称 / 类别 / 单位 必填');
      return;
    }
    try {
      if (editing.id) {
        await updateServiceItem(editing.id, {
          code: editing.code,
          name: editing.name,
          nameEn: editing.nameEn ?? undefined,
          category: editing.category,
          unit: editing.unit,
          description: editing.description ?? undefined,
          enabled: editing.enabled,
        });
        message.success('已更新');
      } else {
        await createServiceItem({
          code: editing.code,
          name: editing.name,
          nameEn: editing.nameEn ?? undefined,
          category: editing.category as 'fee' | 'tax' | 'service' | 'surcharge',
          unit: editing.unit,
          description: editing.description ?? undefined,
          enabled: editing.enabled ?? true,
        });
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
      content: '删除该服务项？已被成本明细引用的服务项无法删除。',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteServiceItem(id);
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
          <h2 style={{ margin: 0 }}>服务项</h2>
          <Space>
            <Select
              allowClear
              placeholder="类别"
              style={{ width: 140 }}
              value={filterCategory}
              onChange={setFilterCategory}
              options={CATEGORY_OPTIONS}
            />
            <Select
              placeholder="启用状态"
              style={{ width: 140 }}
              value={filterEnabled}
              onChange={setFilterEnabled}
              options={[
                { value: true, label: '启用' },
                { value: false, label: '禁用' },
              ]}
            />
            <Button type="primary" onClick={() => openModal()}>+ 新建服务项</Button>
          </Space>
        </Space>
      </Card>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: '代码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name', width: 180 },
          {
            title: '类别', dataIndex: 'category', width: 100,
            render: (v: string) => <Tag color={CATEGORY_COLORS[v] ?? 'default'}>{CATEGORY_LABELS[v] ?? v}</Tag>,
          },
          { title: '单位', dataIndex: 'unit', width: 80 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          {
            title: '启用', dataIndex: 'enabled', width: 80,
            render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
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
        title={editing?.id ? '编辑服务项' : '新建服务项'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
        width={520}
        okText="保存"
        cancelText="取消"
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="代码" required>
              <Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} disabled={!!editing.id} placeholder="如 CUS-DEC" />
            </Form.Item>
            <Form.Item label="名称" required>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="如 报关" />
            </Form.Item>
            <Form.Item label="英文名">
              <Input value={editing.nameEn ?? ''} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
            </Form.Item>
            <Form.Item label="类别" required>
              <Select
                value={editing.category ?? 'service'}
                onChange={(v) => setEditing({ ...editing, category: v })}
                options={CATEGORY_OPTIONS}
              />
            </Form.Item>
            <Form.Item label="单位" required>
              <Input value={editing.unit ?? ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="如 票 / 件 / 立方米" />
            </Form.Item>
            <Form.Item label="描述">
              <Input.TextArea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
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