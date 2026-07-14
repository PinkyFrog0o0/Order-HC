import { Button, Card, Form, Input, Select, Space, Table, Tag, Typography, App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AdminInquiry,
  getInquiryFilterOptions,
  InquiryFilterOptions,
  listAdminInquiries,
  STATUS_LABELS,
} from '../../../lib/admin';

const STATUS_OPTIONS = Object.entries(STATUS_LABELS)
  .filter(([v]) => ['draft', 'submitted', 'quoting', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(v))
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

export function AdminInquiriesPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<AdminInquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<InquiryFilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listAdminInquiries({ ...filters, page: p });
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
      <Typography.Title level={3}>清关询价</Typography.Title>
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
          <Form.Item label="业务编号">
            <Input
              allowClear
              placeholder="模糊搜索"
              value={filters.businessNumber}
              onChange={(e) => setFilters((f) => ({ ...f, businessNumber: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="创建人">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              value={filters.createdById}
              onChange={(v) => setFilters((f) => ({ ...f, createdById: v }))}
              options={opts?.creators.map((c) => ({ value: c.id, label: c.full_name || c.id.slice(0, 8) })) ?? []}
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
          <Form.Item label="原产国">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              value={filters.originCountry}
              onChange={(v) => setFilters((f) => ({ ...f, originCountry: v }))}
              options={opts?.countries.map((c) => ({ value: c.code, label: `${c.code} ${c.nameZh}` })) ?? []}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="目的国">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              value={filters.destinationCountry}
              onChange={(v) => setFilters((f) => ({ ...f, destinationCountry: v }))}
              options={opts?.countries.map((c) => ({ value: c.code, label: `${c.code} ${c.nameZh}` })) ?? []}
              showSearch
              optionFilterProp="label"
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
        onRow={(r) => ({ onClick: () => navigate(`/admin/clearance/inquiries/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: '业务编号', dataIndex: 'business_number', width: 180 },
          { title: '客户', dataIndex: 'tenant_name', width: 130 },
          { title: '客户代码', dataIndex: 'customer_code', width: 90 },
          { title: '贸易', dataIndex: 'trade_type', width: 60, render: (v: string) => v === 'import' ? '进口' : '出口' },
          { title: '起运港', dataIndex: 'origin_port', width: 80 },
          { title: '目的港', dataIndex: 'destination_port', width: 80 },
          { title: '件数', dataIndex: 'total_packages', width: 60 },
          { title: '货值', width: 110, render: (_, r) => `${r.currency} ${r.total_value}` },
          { title: '附件', dataIndex: 'attachment_count', width: 55 },
          {
            title: '状态', dataIndex: 'status', width: 80,
            render: (s: string) => {
              const cfg = STATUS_LABELS[s] ?? { text: s, color: 'default' };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          { title: '清关行', width: 120, render: (_, r) => r.clearance_agent_name ? `${r.clearance_agent_code} ${r.clearance_agent_name}` : <span style={{ color: '#bbb' }}>未指派</span> },
          { title: '创建人', dataIndex: 'created_by_name', width: 90 },
          { title: '创建时间', dataIndex: 'created_at', width: 150, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
        ]}
      />
    </>
  );
}
