import { Button, Card, Descriptions, Empty, Input, Select, Skeleton, Space, Tabs, Tag, Typography, App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  AdminInquiry,
  getAdminInquiry,
  getAdminQuote,
  getInquiryFilterOptions,
  STATUS_LABELS,
  updateAdminInquiryAgent,
  updateAdminInquiryNote,
  updateAdminInquiryStatus,
} from '../../../lib/admin';

const NEXT_STATUS: Record<string, string[]> = {
  submitted: ['quoting', 'cancelled'],
  quoting: ['quoted', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

export function AdminInquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();
  const [order, setOrder] = useState<AdminInquiry | null>(null);
  const [quote, setQuote] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [savingAgent, setSavingAgent] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAdminInquiry(id);
      setOrder(data);
      if (data.quote && typeof data.quote === 'object' && 'id' in data.quote) {
        const q = await getAdminQuote((data.quote as { id: string }).id);
        setQuote(q);
      } else {
        setQuote(null);
      }
    } catch (err) {
      message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    getInquiryFilterOptions()
      .then((opts) => setAgents(opts.agents))
      .catch(() => undefined);
  }, []);

  const handleStatusChange = (newStatus: string) => {
    modal.confirm({
      title: '确认变更状态',
      content: `将状态改为 "${STATUS_LABELS[newStatus]?.text ?? newStatus}"？`,
      onOk: async () => {
        try {
          await updateAdminInquiryStatus(id!, newStatus);
          message.success('状态已更新');
          void load();
        } catch (err) {
          message.error(`更新失败: ${(err as { message?: string }).message ?? '未知错误'}`);
        }
      },
    });
  };

  const handleAddNote = () => {
    let value = '';
    modal.confirm({
      title: '添加内部备注',
      content: (
        <Input.TextArea rows={4} onChange={(e) => (value = e.target.value)} placeholder="只对管理端可见" />
      ),
      onOk: async () => {
        if (!value.trim()) return;
        try {
          await updateAdminInquiryNote(id!, value);
          message.success('备注已保存');
          void load();
        } catch (err) {
          message.error(`保存失败: ${(err as { message?: string }).message ?? '未知错误'}`);
        }
      },
    });
  };

  const handleAssignAgent = async (agentId: string | null) => {
    setSavingAgent(true);
    try {
      await updateAdminInquiryAgent(id!, agentId);
      message.success(agentId ? '已指派清关行' : '已取消指派');
      void load();
    } catch (err) {
      message.error(`指派失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setSavingAgent(false);
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (!order) return <Empty />;

  const statusCfg = STATUS_LABELS[order.status] ?? { text: order.status, color: 'default' };
  const nextStatuses = NEXT_STATUS[order.status] ?? [];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', display: 'flex' }}>
        <Space>
          <Button onClick={() => navigate('/admin/clearance/inquiries')}>返回</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>{order.business_number}</Typography.Title>
          <Tag color={statusCfg.color}>{statusCfg.text}</Tag>
        </Space>
        <Space>
          <Button onClick={handleAddNote}>添加备注</Button>
          {nextStatuses.map((s) => (
            <Button
              key={s}
              type={s === 'cancelled' ? 'default' : 'primary'}
              danger={s === 'cancelled'}
              onClick={() => handleStatusChange(s)}
            >
              {s === 'cancelled' ? '取消' : `改为: ${STATUS_LABELS[s]?.text ?? s}`}
            </Button>
          ))}
          {order.status === 'submitted' && !quote && (
            <Button type="primary" onClick={() => navigate(`/admin/clearance/quotes/new?inquiry=${order.id}`)}>
              创建报价
            </Button>
          )}
        </Space>
      </Space>

      <Tabs
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card title="清关行指派" size="small">
                  <Space>
                    <Select
                      allowClear
                      placeholder="选择清关行"
                      style={{ width: 280 }}
                      value={order.clearance_agent_id ?? undefined}
                      loading={savingAgent}
                      onChange={(v) => handleAssignAgent(v ?? null)}
                      options={agents.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    {order.clearance_agent_id && (
                      <Button onClick={() => handleAssignAgent(null)} loading={savingAgent}>取消指派</Button>
                    )}
                  </Space>
                </Card>
                <Card>
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="客户">{order.tenant_name} ({order.tenant_code})</Descriptions.Item>
                    <Descriptions.Item label="客户代码">{order.customer_code}</Descriptions.Item>
                    <Descriptions.Item label="贸易">{order.trade_type === 'import' ? '进口' : '出口'}</Descriptions.Item>
                    <Descriptions.Item label="Incoterm">{order.incoterm}</Descriptions.Item>
                    <Descriptions.Item label="原产国">{order.origin_country}</Descriptions.Item>
                    <Descriptions.Item label="目的国">{order.destination_country}</Descriptions.Item>
                    <Descriptions.Item label="起运港">{order.origin_port}</Descriptions.Item>
                    <Descriptions.Item label="目的港">{order.destination_port}</Descriptions.Item>
                    <Descriptions.Item label="总毛重(kg)">{order.total_gross_weight_kg}</Descriptions.Item>
                    <Descriptions.Item label="总净重(kg)">{order.total_net_weight_kg}</Descriptions.Item>
                    <Descriptions.Item label="件数">{order.total_packages}</Descriptions.Item>
                    <Descriptions.Item label="货值">{order.currency} {order.total_value}</Descriptions.Item>
                    <Descriptions.Item label="创建人">{order.created_by_name}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{new Date(order.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
                    <Descriptions.Item label="提交时间" span={2}>{order.submitted_at ? new Date(order.submitted_at).toLocaleString('zh-CN') : '未提交'}</Descriptions.Item>
                    {order.notes && (
                      <Descriptions.Item label="备注" span={2}>
                        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{order.notes}</pre>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Space>
            ),
          },
          {
            key: 'quote',
            label: '关联报价',
            children: quote ? (
              <Card>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="报价单号">{(quote as { business_number: string }).business_number}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={STATUS_LABELS[(quote as { status: string }).status]?.color}>
                      {STATUS_LABELS[(quote as { status: string }).status]?.text}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="总金额">{(quote as { currency: string; totalAmount: string }).currency} {(quote as { totalAmount: string }).totalAmount}</Descriptions.Item>
                  <Descriptions.Item label="成本">{(quote as { costAmount: string }).costAmount}</Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 16 }}>
                  <Button onClick={() => navigate(`/admin/clearance/quotes/${(quote as { id: string }).id}`)}>查看报价详情</Button>
                </div>
              </Card>
            ) : (
              <Empty description="尚未创建报价">
                <Button type="primary" onClick={() => navigate(`/admin/clearance/quotes/new?inquiry=${order.id}`)}>立即创建</Button>
              </Empty>
            ),
          },
        ]}
      />
    </>
  );
}