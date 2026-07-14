import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  App as AntdApp,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  CLIENT_STATUS_LABELS,
  ClientQuote,
  acceptClientQuote,
  getClientQuote,
  rejectClientQuote,
} from '../../lib/quote';

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();
  const [quote, setQuote] = useState<ClientQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getClientQuote(id);
      setQuote(data);
    } catch (err) {
      message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const runTransition = (kind: 'accept' | 'reject') => {
    const isAccept = kind === 'accept';
    modal.confirm({
      title: isAccept ? '确认接受报价' : '确认拒绝报价',
      content: isAccept
        ? '接受后将无法再拒绝，请确认。'
        : '拒绝后此报价不再有效，请联系客服重新提交询价。',
      okType: isAccept ? 'primary' : 'danger',
      onOk: async () => {
        setActing(true);
        try {
          if (isAccept) await acceptClientQuote(id!);
          else await rejectClientQuote(id!);
          message.success('已提交');
          void load();
        } catch (err) {
          message.error(`失败: ${(err as { message?: string }).message ?? '未知错误'}`);
        } finally {
          setActing(false);
        }
      },
    });
  };

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (!quote) return <Empty description="未找到报价" />;

  const statusCfg = CLIENT_STATUS_LABELS[quote.status] ?? { text: quote.status, color: 'default' };

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', display: 'flex' }}>
        <Space>
          <Button onClick={() => navigate('/client/quotes')}>返回列表</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>{quote.business_number}</Typography.Title>
          <Tag color={statusCfg.color}>{statusCfg.text}</Tag>
        </Space>
        {quote.status === 'sent' && (
          <Space>
            <Button danger onClick={() => runTransition('reject')} loading={acting}>拒绝</Button>
            <Button type="primary" onClick={() => runTransition('accept')} loading={acting}>接受</Button>
          </Space>
        )}
      </Space>

      {quote.status === 'withdrawn' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="此报价状态异常，需要重新处理"
          description="请联系客服说明情况，我们会安排重新提交询价并出具新报价。"
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="报价单号">{quote.business_number}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={statusCfg.color}>{statusCfg.text}</Tag></Descriptions.Item>
          <Descriptions.Item label="关联询价">
            <Button type="link" onClick={() => navigate(`/client/inquiries/${quote.inquiry_order_id}`)}>
              {quote.inquiry_business_number ?? quote.inquiry_order_id.slice(0, 8)}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="有效期">
            {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="总金额" span={2}>
            <b style={{ fontSize: 20, color: '#1890ff' }}>{quote.currency} {Number(quote.total_amount).toFixed(2)}</b>
          </Descriptions.Item>
          {quote.sent_at && (
            <Descriptions.Item label="收到时间">
              {new Date(quote.sent_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          )}
          {quote.accepted_at && (
            <Descriptions.Item label="接受时间">
              {new Date(quote.accepted_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          )}
          {quote.rejected_at && (
            <Descriptions.Item label="拒绝时间">
              {new Date(quote.rejected_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="费用明细" style={{ marginBottom: 16 }}>
        <Table
          size="small"
          rowKey={(_, idx) => String(idx)}
          dataSource={quote.line_items ?? []}
          pagination={false}
          columns={[
            { title: '费用项', dataIndex: 'name' },
            { title: '说明', dataIndex: 'description' },
            { title: '数量', dataIndex: 'quantity', width: 80 },
            { title: '单价', dataIndex: 'unit_price', width: 120, render: (v: number) => v.toFixed(2) },
            { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => v.toFixed(2) },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><b>{quote.currency} {Number(quote.total_amount).toFixed(2)}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {quote.customer_notes && (
        <Card title="备注">
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{quote.customer_notes}</pre>
        </Card>
      )}
    </>
  );
}
