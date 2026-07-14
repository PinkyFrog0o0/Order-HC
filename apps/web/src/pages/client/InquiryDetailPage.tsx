import {
  Button,
  Card,
  Descriptions,
  Empty,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  App as AntdApp,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { InquiryOrder, InquiryStatus, getInquiry, submitInquiry } from '../../lib/inquiries';

const STATUS_LABELS: Record<InquiryStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  submitted: { text: '已提交', color: 'blue' },
  quoting: { text: '报价中', color: 'gold' },
  quoted: { text: '已报价', color: 'cyan' },
  confirmed: { text: '已确认', color: 'green' },
  in_progress: { text: '处理中', color: 'geekblue' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'red' },
};

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  excel_template: '询价表',
  packing_list: '装箱单',
  commercial_invoice: '商业发票',
  invoice_packing: '商业发票&装箱单',
  other: '其他',
};

export function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [order, setOrder] = useState<InquiryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getInquiry(id)
      .then(setOrder)
      .catch((err) => {
        message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await submitInquiry(order.id);
      setOrder(updated);
      message.success('已提交询价单，等待管理端报价');
    } catch (err) {
      message.error(`提交失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  if (!order) {
    return <Empty description="未找到询价单" />;
  }

  const statusCfg = STATUS_LABELS[order.status] ?? { text: order.status, color: 'default' };

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', display: 'flex' }}>
        <Space>
          <Button onClick={() => navigate('/client/inquiries')}>返回列表</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {order.business_number}
          </Typography.Title>
          <Tag color={statusCfg.color}>{statusCfg.text}</Tag>
        </Space>
        {order.status === 'draft' && (
          <Button type="primary" onClick={handleSubmit} loading={acting}>
            提交询价
          </Button>
        )}
      </Space>

      <Tabs
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Card>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="业务编号">{order.business_number}</Descriptions.Item>
                  <Descriptions.Item label="客户代码">{order.customer_code}</Descriptions.Item>
                  <Descriptions.Item label="贸易类型">
                    {order.trade_type === 'import' ? '进口' : '出口'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Incoterm">{order.incoterm}</Descriptions.Item>
                  <Descriptions.Item label="原产国">{order.origin_country}</Descriptions.Item>
                  <Descriptions.Item label="目的国">{order.destination_country}</Descriptions.Item>
                  <Descriptions.Item label="起运港">{order.origin_port}</Descriptions.Item>
                  <Descriptions.Item label="目的港">{order.destination_port}</Descriptions.Item>
                  <Descriptions.Item label="总毛重 (kg)">{order.total_gross_weight_kg}</Descriptions.Item>
                  <Descriptions.Item label="总净重 (kg)">{order.total_net_weight_kg}</Descriptions.Item>
                  <Descriptions.Item label="件数">{order.total_packages}</Descriptions.Item>
                  <Descriptions.Item label="货值">
                    {order.currency} {order.total_value}
                  </Descriptions.Item>
                  <Descriptions.Item label="来源">{order.source}</Descriptions.Item>
                  <Descriptions.Item label="状态">{statusCfg.text}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {new Date(order.created_at).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                  <Descriptions.Item label="提交时间">
                    {order.submitted_at
                      ? new Date(order.submitted_at).toLocaleString('zh-CN')
                      : '未提交'}
                  </Descriptions.Item>
                  {order.notes && (
                    <Descriptions.Item label="备注" span={2}>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{order.notes}</pre>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'items',
            label: `商品明细 (${order.items?.length ?? 0})`,
            children: (
              <Card>
                {order.items && order.items.length > 0 ? (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={order.items}
                    pagination={false}
                    columns={[
                      { title: '行号', dataIndex: 'line_number', width: 60 },
                      { title: 'HS Code', dataIndex: 'hs_code' },
                      { title: '描述', dataIndex: 'description', ellipsis: true },
                      { title: '数量', dataIndex: 'quantity', width: 100 },
                      { title: '单位', dataIndex: 'unit', width: 80 },
                      { title: '单价', dataIndex: 'unit_price', width: 100 },
                      { title: '毛重', dataIndex: 'gross_weight_kg', width: 100 },
                      { title: '净重', dataIndex: 'net_weight_kg', width: 100 },
                      { title: '件数', dataIndex: 'packages', width: 80 },
                    ]}
                  />
                ) : (
                  <Empty description="无商品明细（HC 询价模板只有汇总数据）" />
                )}
              </Card>
            ),
          },
          {
            key: 'attachments',
            label: `附件 (${order.attachments?.length ?? 0})`,
            children: (
              <Card>
                {order.attachments && order.attachments.length > 0 ? (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={order.attachments}
                    pagination={false}
                    columns={[
                      {
                        title: '类型',
                        dataIndex: 'attachment_type',
                        width: 120,
                        render: (v: string) => ATTACHMENT_TYPE_LABELS[v] ?? v,
                      },
                      { title: '文件名', dataIndex: 'original_filename' },
                      {
                        title: '大小',
                        dataIndex: 'size_bytes',
                        width: 100,
                        render: (v: string) => `${(parseInt(v) / 1024).toFixed(1)} KB`,
                      },
                      {
                        title: '解析状态',
                        dataIndex: 'parse_status',
                        width: 100,
                        render: (s: string) => {
                          const map: Record<string, { color: string; text: string }> = {
                            pending: { color: 'blue', text: '解析中' },
                            success: { color: 'green', text: '成功' },
                            failed: { color: 'red', text: '失败' },
                            skipped: { color: 'default', text: '跳过' },
                          };
                          const cfg = map[s];
                          return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : s;
                        },
                      },
                      {
                        title: '上传时间',
                        dataIndex: 'created_at',
                        width: 180,
                        render: (v: string) => new Date(v).toLocaleString('zh-CN'),
                      },
                    ]}
                  />
                ) : (
                  <Empty description="暂无附件" />
                )}
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}