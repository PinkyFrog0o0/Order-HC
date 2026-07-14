import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  App as AntdApp,
  Modal,
} from 'antd';
import { useEffect, useState } from 'react';

import {
  CostConfig,
  CostConfigItem,
  ServiceItem,
  addCostConfigItem,
  createCostConfig,
  deleteCostConfig,
  deleteCostConfigItem,
  getCostConfig,
  listAgents,
  listAllServiceItems,
  listCostConfigs,
  updateCostConfig,
  updateCostConfigItem,
} from '../../../lib/admin';

const PROFIT_TYPE_OPTIONS = [
  { value: 'percent', label: '按百分比' },
  { value: 'fixed', label: '固定金额' },
];

export function AdminCostConfigsPage() {
  const { message, modal } = AntdApp.useApp();
  const [items, setItems] = useState<CostConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [editing, setEditing] = useState<Partial<CostConfig> | null>(null);
  const [filters, setFilters] = useState<{ q?: string; agentId?: string; enabled?: boolean }>({});

  // Detail drawer state
  const [detail, setDetail] = useState<CostConfig | null>(null);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [itemEditing, setItemEditing] = useState<Partial<CostConfigItem> | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listCostConfigs({ q: filters.q, agentId: filters.agentId, enabled: filters.enabled, page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listAgents({ pageSize: 100 }).then((d) => setAgents(d.items)).catch(() => undefined);
    listAllServiceItems().then(setServiceItems).catch(() => undefined);
  }, []);

  useEffect(() => { void load(1); setPage(1); }, [filters]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name) { message.error('名称必填'); return; }
    try {
      if (editing.id) {
        await updateCostConfig(editing.id, {
          name: editing.name,
          conditions: editing.conditions,
          priority: editing.priority,
          enabled: editing.enabled,
        });
        message.success('已更新');
      } else {
        await createCostConfig({
          agentId: editing.agentId ?? undefined,
          name: editing.name,
          conditions: editing.conditions ?? {},
          priority: editing.priority ?? 100,
          enabled: editing.enabled ?? true,
        });
        message.success('已创建');
      }
      setEditing(null);
      void load();
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    }
  };

  const remove = (id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '删除成本配置会同时级联删除所有明细行。确定?',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteCostConfig(id);
          message.success('已删');
          void load();
        } catch (err) {
          message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
        }
      },
    });
  };

  const openDetail = async (cfg: CostConfig) => {
    try {
      const full = await getCostConfig(cfg.id);
      setDetail(full);
    } catch (err) {
      message.error(`加载详情失败: ${(err as { message?: string }).message ?? '未知'}`);
    }
  };

  const saveDetailHeader = async () => {
    if (!detail) return;
    try {
      await updateCostConfig(detail.id, {
        name: detail.name,
        priority: detail.priority,
        enabled: detail.enabled,
      });
      message.success('已保存');
      void load();
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    }
  };

  const openItemEdit = (item?: CostConfigItem) => {
    setItemEditing(item ?? { costAmount: '0', profitType: 'percent', profitValue: '0', sortOrder: 0 });
  };

  const saveItem = async () => {
    if (!detail || !itemEditing) return;
    if (!itemEditing.serviceItemId) { message.error('请选择服务项'); return; }
    try {
      if (itemEditing.id) {
        await updateCostConfigItem(itemEditing.id, {
          serviceItemId: itemEditing.serviceItemId,
          costAmount: Number(itemEditing.costAmount),
          profitType: itemEditing.profitType as 'percent' | 'fixed',
          profitValue: Number(itemEditing.profitValue),
          sortOrder: itemEditing.sortOrder,
        });
        message.success('已更新');
      } else {
        await addCostConfigItem(detail.id, {
          serviceItemId: itemEditing.serviceItemId,
          costAmount: Number(itemEditing.costAmount),
          profitType: itemEditing.profitType as 'percent' | 'fixed',
          profitValue: Number(itemEditing.profitValue),
          sortOrder: itemEditing.sortOrder ?? 0,
        });
        message.success('已添加');
      }
      setItemEditing(null);
      const full = await getCostConfig(detail.id);
      setDetail(full);
      void load();
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    }
  };

  const removeItem = (itemId: string) => {
    modal.confirm({
      title: '确认删除明细',
      okType: 'danger',
      onOk: async () => {
        if (!detail) return;
        try {
          await deleteCostConfigItem(itemId);
          message.success('已删除');
          const full = await getCostConfig(detail.id);
          setDetail(full);
          void load();
        } catch (err) {
          message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
        }
      },
    });
  };

  const itemsList = detail?.items ?? [];
  const totalCost = itemsList.reduce((s, it) => s + Number(it.costAmount), 0);

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h2 style={{ margin: 0 }}>成本&利润配置</h2>
          <Button type="primary" onClick={() => setEditing({ enabled: true, priority: 100, conditions: {} })}>+ 新建配置</Button>
        </Space>
      </Card>
      <Card style={{ marginBottom: 16 }} size="small">
        <Form layout="inline" onFinish={() => load(1)}>
          <Form.Item label="名称">
            <Input allowClear placeholder="模糊搜索" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item label="清关行">
            <Select
              allowClear placeholder="全部" style={{ width: 160 }}
              value={filters.agentId}
              onChange={(v) => setFilters((f) => ({ ...f, agentId: v }))}
              options={[{ value: '', label: '通用' }, ...agents.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))]}
            />
          </Form.Item>
          <Form.Item label="启用">
            <Select
              allowClear placeholder="全部" style={{ width: 100 }}
              value={filters.enabled}
              onChange={(v) => setFilters((f) => ({ ...f, enabled: v }))}
              options={[{ value: true, label: '启用' }, { value: false, label: '禁用' }]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => setFilters({})}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        onRow={(r) => ({ onClick: () => openDetail(r), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: '报价模板', dataIndex: 'name' },
          { title: '清关行', dataIndex: 'agent_name', width: 150, render: (v: string | undefined) => v ?? <Tag>通用</Tag> },
          { title: '明细数', dataIndex: 'item_count', width: 90, render: (v: number | undefined) => v ?? 0 },
          { title: '优先级', dataIndex: 'priority', width: 80 },
          { title: '启用', dataIndex: 'enabled', width: 80, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
          {
            title: '操作', width: 150,
            render: (_, r) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button type="link" size="small" onClick={() => setEditing(r)}>编辑</Button>
                <Button type="link" size="small" danger onClick={() => remove(r.id)}>删除</Button>
              </Space>
            ),
          },
        ]}
      />
      {/* 新建/编辑 弹窗 */}
      <Modal
        title={editing?.id ? '编辑成本配置' : '新建成本配置'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
        width={520}
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="名称" required>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Form.Item>
            <Form.Item label="清关行（不选=通用）">
              <select
                value={editing.agentId ?? ''}
                onChange={(e) => setEditing({ ...editing, agentId: e.target.value || undefined })}
                style={{ width: '100%', height: 32, padding: '0 8px' }}
              >
                <option value="">通用</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </Form.Item>
            <Form.Item label="优先级（数字越小越优先）">
              <InputNumber value={editing.priority ?? 100} onChange={(v) => setEditing({ ...editing, priority: v ?? 100 })} />
            </Form.Item>
            <Form.Item label="启用">
              <Switch checked={editing.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 详情 Drawer */}
      <Drawer
        title={detail ? `成本配置：${detail.name}` : ''}
        open={detail !== null}
        onClose={() => setDetail(null)}
        width={840}
        extra={
          <Space>
            <Button type="primary" onClick={saveDetailHeader}>保存表头</Button>
          </Space>
        }
      >
        {detail && (
          <>
            <Card title="表头信息" size="small" style={{ marginBottom: 16 }}>
              <Form layout="vertical">
                <Form.Item label="名称">
                  <Input value={detail.name} onChange={(e) => setDetail({ ...detail, name: e.target.value })} />
                </Form.Item>
                <Space>
                  <Form.Item label="优先级">
                    <InputNumber value={detail.priority} onChange={(v) => setDetail({ ...detail, priority: v ?? 100 })} />
                  </Form.Item>
                  <Form.Item label="启用">
                    <Switch checked={detail.enabled} onChange={(v) => setDetail({ ...detail, enabled: v })} />
                  </Form.Item>
                </Space>
              </Form>
            </Card>
            <Card
              title="明细行"
              size="small"
              extra={<Button type="primary" size="small" onClick={() => openItemEdit()}>+ 添加明细</Button>}
            >
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={itemsList}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><b>合计</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} colSpan={2} />
                    <Table.Summary.Cell index={3}><b>{totalCost.toFixed(2)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={4} colSpan={4} />
                  </Table.Summary.Row>
                )}
                columns={[
                  {
                    title: '服务项', dataIndex: 'serviceItemId', width: 200,
                    render: (_: string, r: CostConfigItem) => (
                      <span>{r.service_item_code} {r.service_item_name}</span>
                    ),
                  },
                  {
                    title: '单位', width: 80,
                    render: (_: unknown, r: CostConfigItem) => {
                      const si = serviceItems.find((s) => s.id === r.serviceItemId);
                      return si?.unit ?? '-';
                    },
                  },
                  { title: '成本', dataIndex: 'costAmount', width: 100, render: (v: string) => Number(v).toFixed(2) },
                  {
                    title: '利润类型', dataIndex: 'profitType', width: 100,
                    render: (v: string) => v === 'percent' ? <Tag>百分比</Tag> : <Tag color="blue">固定</Tag>,
                  },
                  { title: '利润值', dataIndex: 'profitValue', width: 100, render: (v: string, r: CostConfigItem) => r.profitType === 'percent' ? `${v}%` : `+${Number(v).toFixed(2)}` },
                  {
                    title: '操作', width: 140, fixed: 'right',
                    render: (_, r) => (
                      <Space>
                        <Button type="link" size="small" onClick={() => openItemEdit(r)}>编辑</Button>
                        <Button type="link" size="small" danger onClick={() => removeItem(r.id)}>删除</Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Drawer>

      {/* 明细行 编辑弹窗 */}
      <Modal
        title={itemEditing?.id ? '编辑明细' : '添加明细'}
        open={itemEditing !== null}
        onCancel={() => setItemEditing(null)}
        onOk={saveItem}
        width={480}
      >
        {itemEditing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="服务项" required>
              <Select
                showSearch
                optionFilterProp="label"
                value={itemEditing.serviceItemId}
                onChange={(v) => setItemEditing({ ...itemEditing, serviceItemId: v })}
                options={serviceItems.map((s) => ({
                  value: s.id,
                  label: `${s.code} ${s.name}（${s.unit}）`,
                }))}
                placeholder="选择服务项"
              />
            </Form.Item>
            <Form.Item label="成本">
              <InputNumber
                value={Number(itemEditing.costAmount ?? 0)}
                onChange={(v) => setItemEditing({ ...itemEditing, costAmount: String(v ?? 0) })}
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="利润类型">
              <Select
                value={itemEditing.profitType ?? 'percent'}
                onChange={(v) => setItemEditing({ ...itemEditing, profitType: v })}
                options={PROFIT_TYPE_OPTIONS}
              />
            </Form.Item>
            <Form.Item label="利润值">
              <InputNumber
                value={Number(itemEditing.profitValue ?? 0)}
                onChange={(v) => setItemEditing({ ...itemEditing, profitValue: String(v ?? 0) })}
                min={0}
                style={{ width: '100%' }}
                addonAfter={itemEditing.profitType === 'percent' ? '%' : '元'}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}