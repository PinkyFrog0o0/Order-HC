import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Table, App as AntdApp } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  CostConfig,
  createQuote,
  getAdminInquiry,
  getCostConfig,
  listCostConfigs,
  listAllServiceItems,
  ServiceItem,
  AdminInquiry,
} from '../../../lib/admin';

interface LineItem {
  name: string;
  description?: string;
  quantity?: number;
  unit_price: number;
  amount: number;
}

const QUICK_TEMPLATES = [
  { name: '清关费', unit_price: 200 },
  { name: '查验费', unit_price: 300 },
  { name: '仓储费', unit_price: 100 },
  { name: '单证费', unit_price: 50 },
  { name: '拖车费', unit_price: 800 },
  { name: '报关费', unit_price: 150 },
];

export function AdminQuoteCreatePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const inquiryId = params.get('inquiry');
  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { name: '清关费', unit_price: 200, amount: 200 },
  ]);
  const [margin, setMargin] = useState<number>(20);
  const [currency, setCurrency] = useState<string>('EUR');
  const [internalNotes, setInternalNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<CostConfig[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  useEffect(() => {
    if (inquiryId) {
      getAdminInquiry(inquiryId).then(setInquiry).catch(() => undefined);
    }
  }, [inquiryId]);

  useEffect(() => {
    listCostConfigs({ enabled: true, pageSize: 100 })
      .then((d) => setTemplates(d.items))
      .catch(() => undefined);
    listAllServiceItems().then(setServiceItems).catch(() => undefined);
  }, []);

  const serviceItemById = useMemo(() => {
    const m = new Map<string, ServiceItem>();
    for (const s of serviceItems) m.set(s.id, s);
    return m;
  }, [serviceItems]);

  const applyTemplate = async (id: string) => {
    setSelectedTemplateId(id);
    if (!id) return;
    setApplyingTemplate(true);
    try {
      const cfg = await getCostConfig(id);
      if (!cfg.items || cfg.items.length === 0) {
        message.warning('此模板没有明细行');
        return;
      }
      const items: LineItem[] = cfg.items.map((it) => {
        const si = serviceItemById.get(it.serviceItemId);
        const unitPrice = Number(it.costAmount);
        return {
          name: si ? `${si.code} ${si.name}` : (it.service_item_name ?? it.service_item_code ?? ''),
          description: si?.description ?? '',
          quantity: 1,
          unit_price: unitPrice,
          amount: unitPrice,
        };
      });
      setLineItems(items);
      message.success(`已从模板「${cfg.name}」填充 ${items.length} 行`);
    } catch (err) {
      message.error(`加载模板失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const cost = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const total = cost * (1 + (margin || 0) / 100);

  const updateLineItem = (idx: number, patch: Partial<LineItem>) => {
    setLineItems((items) =>
      items.map((li, i) => {
        if (i !== idx) return li;
        const merged = { ...li, ...patch };
        merged.amount = (Number(merged.quantity) || 1) * (Number(merged.unit_price) || 0);
        return merged;
      }),
    );
  };

  const addLineItem = (template?: { name: string; unit_price: number }) => {
    setLineItems((items) => [
      ...items,
      {
        name: template?.name ?? '',
        unit_price: template?.unit_price ?? 0,
        quantity: 1,
        amount: template?.unit_price ?? 0,
      },
    ]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems((items) => items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!inquiryId) {
      message.error('缺少询价单 ID');
      return;
    }
    if (lineItems.length === 0) {
      message.error('至少添加一条费用项');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createQuote({
        inquiryOrderId: inquiryId,
        lineItems,
        currency,
        marginPercent: margin,
        internalNotes: internalNotes || undefined,
        customerNotes: customerNotes || undefined,
      });
      message.success('报价已创建');
      navigate(`/admin/clearance/quotes/${result.id}`);
    } catch (err) {
      message.error(`创建失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button onClick={() => navigate(-1)}>返回</Button>
          <h2 style={{ margin: 0 }}>创建报价</h2>
        </Space>
      </Card>

      {inquiry && (
        <Card title="关联询价单" style={{ marginBottom: 16 }} size="small">
          <p>业务编号: <b>{inquiry.business_number}</b></p>
          <p>客户: {inquiry.tenant_name} ({inquiry.tenant_code})</p>
          <p>贸易: {inquiry.trade_type === 'import' ? '进口' : '出口'} · {inquiry.incoterm} · {inquiry.origin_port} → {inquiry.destination_port}</p>
          <p>货值: {inquiry.currency} {inquiry.total_value} · 件数: {inquiry.total_packages}</p>
        </Card>
      )}

      <Card title="选择报价模板" style={{ marginBottom: 16 }} size="small">
        <Space wrap>
          <Select
            allowClear
            placeholder="从【成本&利润配置】选一份模板自动填充"
            style={{ width: 360 }}
            value={selectedTemplateId}
            onChange={(v) => applyTemplate(v ?? '')}
            loading={applyingTemplate}
            options={templates.map((t) => ({
              value: t.id,
              label: `${t.name}${t.agent_name ? ` · ${t.agent_name}` : ' · 通用'}`,
            }))}
          />
          {selectedTemplateId && (
            <Button size="small" onClick={() => applyTemplate(selectedTemplateId)} loading={applyingTemplate}>
              重新填充
            </Button>
          )}
        </Space>
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12 }}
          message="选中模板后下方费用明细会被覆盖。继续手动增删改不影响模板本身。"
        />
      </Card>

      <Card title="费用明细" style={{ marginBottom: 16 }} size="small">
        <Table
          size="small"
          rowKey={(_, idx) => String(idx)}
          dataSource={lineItems}
          pagination={false}
          columns={[
            { title: '费用项', width: 200, render: (_, _r, idx) => <Input value={lineItems[idx]!.name} onChange={(e) => updateLineItem(idx, { name: e.target.value })} /> },
            { title: '说明', render: (_, _r, idx) => <Input value={lineItems[idx]!.description ?? ''} onChange={(e) => updateLineItem(idx, { description: e.target.value })} /> },
            { title: '数量', width: 100, render: (_, _r, idx) => <InputNumber value={lineItems[idx]!.quantity ?? 1} onChange={(v) => updateLineItem(idx, { quantity: v ?? 1 })} style={{ width: '100%' }} /> },
            { title: '单价', width: 120, render: (_, _r, idx) => <InputNumber value={lineItems[idx]!.unit_price} onChange={(v) => updateLineItem(idx, { unit_price: v ?? 0 })} style={{ width: '100%' }} /> },
            { title: '金额', width: 120, render: (_, r) => r.amount.toFixed(2) },
            { title: '操作', width: 60, render: (_, _r, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLineItem(idx)} /> },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}><b>成本合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><b>{cost.toFixed(2)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
          )}
        />
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={() => addLineItem()}>添加空行</Button>
            {QUICK_TEMPLATES.map((t) => (
              <Button key={t.name} size="small" onClick={() => addLineItem(t)}>+ {t.name}</Button>
            ))}
          </Space>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }} size="small">
        <Space size="large" wrap>
          <Form.Item label="利润率 (%)">
            <InputNumber value={margin} onChange={(v) => setMargin(v ?? 0)} min={0} max={500} />
          </Form.Item>
          <Form.Item label="币种">
            <Select value={currency} onChange={setCurrency} options={['CNY', 'USD', 'EUR', 'GBP'].map((v) => ({ value: v, label: v }))} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="总价">
            <span style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>{currency} {total.toFixed(2)}</span>
          </Form.Item>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }} size="small" title="备注">
        <Form.Item label="内部备注（管理端可见）">
          <Input.TextArea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
        </Form.Item>
        <Form.Item label="客户备注（发给客户时显示）">
          <Input.TextArea rows={2} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
        </Form.Item>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={() => navigate(-1)}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={submitting}>保存报价</Button>
        </Space>
      </div>
    </>
  );
}
