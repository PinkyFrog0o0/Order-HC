import { Button, Empty, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { InquiryOrder, InquiryStatus, listInquiries } from '../../lib/inquiries';

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

export function InquiryListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InquiryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listInquiries({ page: p, page_size: pageSize });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      const e = err as { message?: string };
      // eslint-disable-next-line no-console
      console.error('加载询价单失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', display: 'flex' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          询价单
        </Typography.Title>
        <Space>
          <Button onClick={() => load(page)}>刷新</Button>
          <Button type="primary" onClick={() => navigate('/client/inquiries/new')}>
            创建询价单
          </Button>
        </Space>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        loading={loading}
        locale={{ emptyText: <Empty description="暂无询价单" /> }}
        onRow={(record) => ({
          onClick: () => navigate(`/client/inquiries/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: '业务编号', dataIndex: 'business_number', width: 200 },
          { title: '客户', dataIndex: 'customer_code', width: 120 },
          {
            title: '贸易',
            dataIndex: 'trade_type',
            width: 80,
            render: (v: string) => (v === 'import' ? '进口' : '出口'),
          },
          { title: '起运港', dataIndex: 'origin_port', width: 120 },
          { title: '目的港', dataIndex: 'destination_port', width: 120 },
          { title: '件数', dataIndex: 'total_packages', width: 80 },
          {
            title: '货值',
            width: 120,
            render: (_, r) => `${r.currency} ${r.total_value}`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: InquiryStatus) => {
              const cfg = STATUS_LABELS[s] ?? { text: s, color: 'default' };
              return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
          },
          {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (v: string) => new Date(v).toLocaleString('zh-CN'),
          },
        ]}
      />
    </>
  );
}