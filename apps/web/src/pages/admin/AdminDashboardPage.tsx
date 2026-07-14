import { Card, Col, List, Row, Statistic, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { getDashboard, getInquiryDaily, STATUS_LABELS } from '../../lib/admin';

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [daily, setDaily] = useState<Array<{ date: string; count: number }>>([]);

  useEffect(() => {
    getDashboard().then(setDashboard).catch(() => undefined);
    getInquiryDaily(14).then(setDaily).catch(() => undefined);
  }, []);

  if (!dashboard) return <Typography.Text>加载中...</Typography.Text>;

  return (
    <>
      <Typography.Title level={3}>仪表盘</Typography.Title>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="今日询价" value={dashboard.today_inquiries} suffix="单" /></Card></Col>
        <Col span={6}><Card><Statistic title="待报价" value={dashboard.pending_quotes} suffix="单" valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="在途订单" value={dashboard.in_progress_orders} suffix="单" /></Card></Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月营收"
              value={(Object.values(dashboard.month_revenue ?? {}) as number[])[0] ?? 0}
              prefix={Object.keys(dashboard.month_revenue ?? {})[0] ?? '¥'}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}><Card><Statistic title="总询价数" value={dashboard.total_inquiries} /></Card></Col>
        <Col span={6}><Card><Statistic title="总报价数" value={dashboard.total_quotes} /></Card></Col>
        <Col span={6}><Card><Statistic title="活跃客户" value={dashboard.total_tenants} /></Card></Col>
        <Col span={6}><Card><Statistic title="清关行数" value={dashboard.total_agents} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="近期询价" size="small">
            <List
              size="small"
              dataSource={dashboard.recent_inquiries}
              renderItem={(item: { id: string; business_number: string; tenant_code: string; tenant_name: string; status: string; created_at: string }) => {
                const cfg = STATUS_LABELS[item.status] ?? { text: item.status, color: 'default' };
                return (
                  <List.Item>
                    <span style={{ flex: 1 }}>{item.business_number}</span>
                    <span style={{ flex: 1, color: '#666' }}>{item.tenant_name}</span>
                    <Tag color={cfg.color}>{cfg.text}</Tag>
                    <span style={{ width: 140, textAlign: 'right', color: '#999', fontSize: 12 }}>
                      {new Date(item.created_at).toLocaleString('zh-CN')}
                    </span>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="近 14 天询价趋势" size="small">
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 4 }}>
              {daily.map((d) => {
                const max = Math.max(...daily.map((x) => x.count), 1);
                const h = (d.count / max) * 180;
                return (
                  <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      style={{
                        height: h,
                        background: '#1890ff',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: 4,
                        position: 'relative',
                      }}
                      title={`${d.date}: ${d.count} 单`}
                    >
                      {d.count > 0 && (
                        <span style={{ position: 'absolute', top: -18, left: 0, right: 0, fontSize: 11, color: '#666' }}>
                          {d.count}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#999' }}>{d.date.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}