import { Button, Card, Descriptions, Skeleton, Space, Table, Tag, Typography, App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  AdminQuote,
  STATUS_LABELS,
  generateQuotePdf,
  getAdminQuote,
  updateQuoteStatus,
  withdrawQuote,
} from '../../../lib/admin';

type ActionHandler = 'set_status' | 'generate_pdf' | 'withdraw';

interface QuoteAction {
  handler: ActionHandler;
  status?: string;
  label: string;
  danger?: boolean;
  primary?: boolean;
}

/**
 * 状态机 → 可执行操作
 *  - draft: 提交审批 / 直接发送
 *  - pending_approval: 审批通过
 *  - approved: 生成 PDF / 发送给客户
 *  - sent: 撤回（客户接受/拒绝由客户端调用，不再在管理端暴露按钮）
 *  - accepted/rejected/withdrawn/expired: 无（仅展示）
 */
const ACTION_BUTTONS: Record<string, QuoteAction[]> = {
  draft: [
    { handler: 'set_status', status: 'pending_approval', label: '提交审批', primary: true },
    { handler: 'set_status', status: 'sent', label: '直接发送' },
  ],
  pending_approval: [
    { handler: 'set_status', status: 'approved', label: '审批通过', primary: true },
  ],
  approved: [
    { handler: 'generate_pdf', label: '生成 PDF' },
    { handler: 'set_status', status: 'sent', label: '发送给客户', primary: true },
  ],
  sent: [
    { handler: 'withdraw', label: '撤回报价', danger: true },
  ],
};

export function AdminQuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAdminQuote(id);
      setQuote(data);
    } catch (err) {
      message.error(`加载失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const handleAction = (action: QuoteAction) => {
    if (action.handler === 'generate_pdf') {
      void runGeneratePdf();
      return;
    }
    if (action.handler === 'withdraw') {
      runWithdraw();
      return;
    }
    if (action.handler === 'set_status' && action.status) {
      runSetStatus(action.status, action.label);
    }
  };

  const runSetStatus = (status: string, label: string) => {
    modal.confirm({
      title: '确认操作',
      content: `${label}？状态将变为 "${STATUS_LABELS[status]?.text ?? status}"`,
      onOk: async () => {
        setActing(true);
        try {
          await updateQuoteStatus(id!, status);
          message.success('已更新');
          void load();
        } catch (err) {
          message.error(`失败: ${(err as { message?: string }).message ?? '未知错误'}`);
        } finally {
          setActing(false);
        }
      },
    });
  };

  const runGeneratePdf = async () => {
    setActing(true);
    try {
      await generateQuotePdf(id!);
      message.success('PDF 已生成（占位，真实引擎待接入）');
      void load();
    } catch (err) {
      message.error(`生成失败: ${(err as { message?: string }).message ?? '未知错误'}`);
    } finally {
      setActing(false);
    }
  };

  const runWithdraw = () => {
    modal.confirm({
      title: '确认撤回报价',
      content: '撤回后客户会看到「异常」提示，需重新提交询价。撤回后的报价保留在历史中，不会被删除。',
      okType: 'danger',
      onOk: async () => {
        setActing(true);
        try {
          await withdrawQuote(id!);
          message.success('已撤回');
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
  if (!quote) return null;

  const statusCfg = STATUS_LABELS[quote.status] ?? { text: quote.status, color: 'default' };
  const actions = ACTION_BUTTONS[quote.status] ?? [];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', display: 'flex' }}>
        <Space>
          <Button onClick={() => navigate('/admin/clearance/quotes')}>返回</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>{quote.business_number}</Typography.Title>
          <Tag color={statusCfg.color}>{statusCfg.text}</Tag>
        </Space>
        <Space>
          {actions.map((a) => (
            <Button
              key={`${a.handler}-${a.status ?? ''}`}
              type={a.primary ? 'primary' : 'default'}
              danger={a.danger}
              onClick={() => handleAction(a)}
              loading={acting}
            >
              {a.label}
            </Button>
          ))}
        </Space>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="报价单号">{quote.business_number}</Descriptions.Item>
          <Descriptions.Item label="客户">{quote.tenant_name} ({quote.tenant_code})</Descriptions.Item>
          <Descriptions.Item label="关联询价单">
            <Button type="link" onClick={() => navigate(`/admin/clearance/inquiries/${quote.inquiryOrderId}`)}>
              {quote.inquiry_order?.businessNumber ?? quote.inquiryOrderId.slice(0, 8)}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={statusCfg.color}>{statusCfg.text}</Tag></Descriptions.Item>
          <Descriptions.Item label="总金额"><b style={{ color: '#1890ff' }}>{quote.currency} {quote.totalAmount}</b></Descriptions.Item>
          <Descriptions.Item label="成本">{quote.currency} {quote.costAmount}</Descriptions.Item>
          <Descriptions.Item label="利润率">{quote.marginPercent ? `${quote.marginPercent}%` : '-'}</Descriptions.Item>
          <Descriptions.Item label="有效期">{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(quote.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
          <Descriptions.Item label="发送时间">{quote.sentAt ? new Date(quote.sentAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="接受时间">{quote.acceptedAt ? new Date(quote.acceptedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="拒绝时间">{quote.rejectedAt ? new Date(quote.rejectedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="撤回时间">{quote.withdrawnAt ? new Date(quote.withdrawnAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="PDF" span={2}>
            {quote.pdfUrl ? (
              <a href={quote.pdfUrl} target="_blank" rel="noreferrer">查看/下载 PDF</a>
            ) : (
              <span style={{ color: '#999' }}>未生成</span>
            )}
            {quote.pdfGeneratedAt && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                ({new Date(quote.pdfGeneratedAt).toLocaleString('zh-CN')})
              </span>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="费用明细" style={{ marginBottom: 16 }}>
        <Table
          size="small"
          rowKey={(_, idx) => String(idx)}
          dataSource={quote.lineItems}
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
              <Table.Summary.Cell index={1}><b>{quote.currency} {quote.totalAmount}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {(quote.internalNotes || quote.customerNotes) && (
        <Card title="备注">
          {quote.internalNotes && (
            <div style={{ marginBottom: 8 }}>
              <b>内部备注:</b>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0', color: '#666' }}>{quote.internalNotes}</pre>
            </div>
          )}
          {quote.customerNotes && (
            <div>
              <b>客户备注:</b>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{quote.customerNotes}</pre>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
