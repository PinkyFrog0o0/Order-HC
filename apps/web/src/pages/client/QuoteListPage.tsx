import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  CLIENT_STATUS_LABELS,
  ClientQuoteListItem,
  listClientQuotes,
} from '../../lib/quote';

export function QuoteListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ClientQuoteListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await listClientQuotes({ page: p, pageSize: 20 });
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); setPage(1); }, []);

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ justifyContent: 'space-between', display: 'flex' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>我的报价</Typography.Title>
          <Button onClick={() => load()}>刷新</Button>
        </Space>
      </Card>
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
          onRow={(r) => ({ onClick: () => navigate(`/client/quotes/${r.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: '报价单号', dataIndex: 'business_number' },
            {
              title: '关联询价',
              dataIndex: 'inquiry_business_number',
              render: (v?: string) => v ?? '-',
            },
            {
              title: '总额',
              width: 160,
              render: (_, r) => (
                <b>{r.currency} {Number(r.total_amount).toFixed(2)}</b>
              ),
            },
            {
              title: '状态',
              width: 200,
              render: (_, r) => {
                const cfg = CLIENT_STATUS_LABELS[r.status] ?? { text: r.status, color: 'default' };
                return <Tag color={cfg.color}>{cfg.text}</Tag>;
              },
            },
            {
              title: '收到时间',
              dataIndex: 'sent_at',
              width: 180,
              render: (v: string | null, r: ClientQuoteListItem) =>
                v ? new Date(v).toLocaleString('zh-CN') : new Date(r.created_at).toLocaleString('zh-CN'),
            },
          ]}
        />
      </Card>
    </>
  );
}
