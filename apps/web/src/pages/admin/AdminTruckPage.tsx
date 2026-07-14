import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Table, Tag, App as AntdApp, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { TruckService, createTruckService, deleteTruckService, listTruckServices, updateTruckService } from '../../lib/admin';

const SERVICE_TYPES = [
  { value: 'ltl', label: 'LTL 零担', color: 'blue' },
  { value: 'ftl', label: 'FTL 整车', color: 'green' },
  { value: 'port_to_door', label: '港到门拖车', color: 'purple' },
];

const PRICING_MODELS = [
  { value: 'flat', label: '包干价' },
  { value: 'per_km', label: '按公里' },
  { value: 'per_kg', label: '按重量' },
  { value: 'per_cbm', label: '按体积' },
];

export function AdminTruckPage() {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<TruckService[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<TruckService> | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listTruckServices({ page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(1); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.code || !editing.name || !editing.serviceType || !editing.pricingModel) {
      message.error('代码/名称/类型/计费方式必填');
      return;
    }
    try {
      const data: Partial<TruckService> = {
        ...editing,
        basePrice: String(Number(editing.basePrice) || 0),
        unitPrice: editing.unitPrice ? String(Number(editing.unitPrice)) : null,
      };
      if (editing.id) {
        await updateTruckService(editing.id, data);
        message.success('已更新');
      } else {
        await createTruckService({ ...data, basePrice: Number(data.basePrice) } as Parameters<typeof createTruckService>[0]);
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
          <h2 style={{ margin: 0 }}>卡车服务（LTL / FTL / 港到门）</h2>
          <Button type="primary" onClick={() => setEditing({ enabled: true })}>+ 新建服务</Button>
        </Space>
      </Card>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          {
            title: '类型', dataIndex: 'serviceType', width: 120,
            render: (v: string) => {
              const t = SERVICE_TYPES.find((s) => s.value === v);
              return t ? <Tag color={t.color}>{t.label}</Tag> : v;
            },
          },
          { title: '代码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name' },
          { title: '起运地', dataIndex: 'originRegion', width: 120 },
          { title: '目的地', dataIndex: 'destinationRegion', width: 120 },
          {
            title: '计费', width: 140,
            render: (_, r) => {
              const m = PRICING_MODELS.find((p) => p.value === r.pricingModel);
              return `${m?.label ?? r.pricingModel} · ${r.basePrice}${r.unitPrice ? ` + ${r.unitPrice}/单位` : ''}`;
            },
          },
          { title: '车型/柜型', width: 100, render: (_, r) => r.vehicleType || r.containerType || '-' },
          { title: '启用', dataIndex: 'enabled', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
          {
            title: '操作', width: 150, fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => setEditing(r)}>编辑</Button>
                <Button type="link" size="small" danger onClick={async () => { await deleteTruckService(r.id); message.success('已删'); void load(); }}>删除</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing?.id ? '编辑卡车服务' : '新建卡车服务'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
        width={600}
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="服务类型" required>
              <Select value={editing.serviceType} onChange={(v) => setEditing({ ...editing, serviceType: v })} options={SERVICE_TYPES} />
            </Form.Item>
            <Form.Item label="代码" required>
              <Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} disabled={!!editing.id} />
            </Form.Item>
            <Form.Item label="名称" required>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Form.Item>
            <Form.Item label="起运地区">
              <Input value={editing.originRegion ?? ''} onChange={(e) => setEditing({ ...editing, originRegion: e.target.value })} />
            </Form.Item>
            <Form.Item label="目的地区">
              <Input value={editing.destinationRegion ?? ''} onChange={(e) => setEditing({ ...editing, destinationRegion: e.target.value })} />
            </Form.Item>
            <Form.Item label="计费方式" required>
              <Select value={editing.pricingModel} onChange={(v) => setEditing({ ...editing, pricingModel: v })} options={PRICING_MODELS} />
            </Form.Item>
            <Form.Item label="基础价" required>
              <InputNumber value={editing.basePrice ? Number(editing.basePrice) : 0} onChange={(v) => setEditing({ ...editing, basePrice: String(v ?? 0) })} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="单价 (按计费方式的单位)">
              <InputNumber value={editing.unitPrice ? Number(editing.unitPrice) : null} onChange={(v) => setEditing({ ...editing, unitPrice: v ? String(v) : undefined })} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="车型 (FTL 专用)">
              <Input value={editing.vehicleType ?? ''} onChange={(e) => setEditing({ ...editing, vehicleType: e.target.value })} />
            </Form.Item>
            <Form.Item label="柜型 (港到门专用)">
              <Input value={editing.containerType ?? ''} onChange={(e) => setEditing({ ...editing, containerType: e.target.value })} />
            </Form.Item>
            <Form.Item label="备注">
              <Input.TextArea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
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