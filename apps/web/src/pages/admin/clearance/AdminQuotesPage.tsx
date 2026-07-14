import { Button, Card, Form, Input, Select, Space, Table, Tag, Typography, App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AdminQuote,
  getInquiryFilterOptions,
  InquiryFilterOptions,
  listAdminQuotes,
  STATUS_LABELS,
} from '../../../lib/admin';

const STATUS_OPTIONS = Object.entries(STATUS_LABELS)
  .filter(([v]) => ['pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'].includes(v))
  .map(([value, cfg]) => ({ value, label: cfg.text }));

interface Filters {
  tenantId?: string;
  status?: string;
  businessNumber?: string;
  originCountry?: string;
  destinationCountry?: string;
  originPort?: string;
  destinationPort?: string;
  createdById?: string;
  clearanceAgentId?: string;
}

export function AdminQuotesPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<AdminQuote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<InquiryFilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listAdminQuotes({ ...filters, page: p });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInquiryFilterOptions().then(setOpts).catch(() => undefined);
  }, []);

  useEffect(() => {
    void load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <>
      <Typography.Title level={3}>清关报价</Typography.Title>
      <Card style={{ marginBottom: 16 }} size="small">
        <Form layout="inline" onFinish={() => load(1)}>
          <Form.Item label="客户">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 160 }}
              value={filters.tenantId}
              onChange={(v) => setFilters((f) => ({ ...f, tenantId: v }))}
              options={opts?.tenants.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` })) ?? []}
            />
          </Form.Item>
          <Form.Item label="状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 110 }}
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              options={STATUS_OPTIONS}
            />
          </Form.Item>
          <Form.Item label="询价编号">
            <Input
              allowClear
              placeholder="模糊搜索"
              value={filters.businessNumber}
              onChange={(e) => setFilters((f) => ({ ...f, businessNumber: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="清关行">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 140 }}
              value={filters.clearanceAgentId}
              onChange={(v) => setFilters((f) => ({ ...f, clearanceAgentId: v }))}
              options={opts?.agents.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` })) ?? []}
            />
          </Form.Item>
          <Form.Item label="起运港">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              value={filters.originPort}
              onChange={(v) => setFilters((f) => ({ ...f, originPort: v }))}
              options={opts?.ports.map((p) => ({ value: p.code, label: `${p.code} ${p.nameZh}` })) ?? []}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="目的港">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              value={filters.destinationPort}
              onChange={(v) => setFilters((f) => ({ ...f, destinationPort: v }))}
              options={opts?.ports.map((p) => ({ value: p.code, label: `${p.code} ${p.nameZh}` })) ?? []}
              showSearch
              optionFilterProp="label"
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
        onRow={(r) => ({ onClick: () => navigate(`/admin/clearance/quotes/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: '报价单号', dataIndex: 'business_number', width: 180 },
          { title: '关联询价', dataIndex: 'inquiryOrderId', width: 180, render: (v: string, r) => (r as { inquiry_order?: { businessNumber: string } }).inquiry_order?.businessNumber ?? v.slice(0, 8) },
          { title: '客户', dataIndex: 'tenant_name', width: 130 },
          { title: '总金额', width: 120, render: (_, r) => `${r.currency} ${r.totalAmount}` },
          { title: '成本', dataIndex: 'costAmount', width: 100 },
          { title: '利润率', dataIndex: 'marginPercent', width: 80, render: (v: string | null) => v ? `${v}%` : '-' },
          {
            title: '状态', dataIndex: 'status', width: 100,
            render: (s: string) => {
              const cfg = STATUS_LABELS[s] ?? { text: s, color: 'default' };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          { title: '创建时间', dataIndex: 'created_at', width: 150, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
        ]}
      />
    </>
  );
}
