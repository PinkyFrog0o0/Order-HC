import { Card, Col, Row, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { STATUS_LABELS, getInquiryByTenant, getInquiryStatusDistribution } from '../../lib/admin';

export function AdminReportsPage() {
  const [byStatus, setByStatus] = useState<Array<{ status: string; count: number }>>([]);
  const [byTenant, setByTenant] = useState<Array<{ tenant_id: string; tenant_code?: string; tenant_name?: string; count: number }>>([]);

  useEffect(() => {
    getInquiryStatusDistribution().then(setByStatus).catch(() => undefined);
    getInquiryByTenant().then(setByTenant).catch(() => undefined);
  }, []);

  const total = byStatus.reduce((s, x) => s + x.count, 0);

  return (
    <>
      <Typography.Title level={3}>报表管理</Typography.Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="询价按状态分布" size="small">
            <Table
              size="small"
              rowKey="status"
              dataSource={byStatus}
              pagination={false}
              columns={[
                {
                  title: '状态', dataIndex: 'status', width: 120,
                  render: (s: string) => {
                    const cfg = STATUS_LABELS[s] ?? { text: s, color: 'default' };
                    return <Tag color={cfg.color}>{cfg.text}</Tag>;
                  },
                },
                { title: '数量', dataIndex: 'count', width: 100 },
                {
                  title: '占比', width: 100,
                  render: (_, r) => total > 0 ? `${((r.count / total) * 100).toFixed(1)}%` : '-',
                },
                {
                  title: '可视化',
                  render: (_, r) => (
                    <div style={{ background: '#1890ff', height: 16, width: `${(r.count / Math.max(...byStatus.map((x) => x.count), 1)) * 100}%`, minWidth: 4, borderRadius: 2 }} />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="询价按客户分布" size="small">
            <Table
              size="small"
              rowKey="tenant_id"
              dataSource={byTenant}
              pagination={false}
              columns={[
                { title: '客户', dataIndex: 'tenant_name', render: (v: string | undefined, r) => v ? `${v} (${r.tenant_code})` : r.tenant_code },
                { title: '询价数', dataIndex: 'count', width: 100 },
                {
                  title: '可视化',
                  render: (_, r) => (
                    <div style={{ background: '#52c41a', height: 16, width: `${(r.count / Math.max(...byTenant.map((x) => x.count), 1)) * 100}%`, minWidth: 4, borderRadius: 2 }} />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}