import { apiClient } from './api';

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ClientQuoteListItem {
  id: string;
  business_number: string;
  inquiry_order_id: string;
  inquiry_business_number?: string;
  total_amount: string;
  currency: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  pdf_url: string | null;
}

export interface ClientQuoteLineItem {
  name: string;
  description?: string;
  quantity?: number;
  unit_price: number;
  amount: number;
}

export interface ClientQuote {
  id: string;
  business_number: string;
  tenant_id: string;
  inquiry_order_id: string;
  inquiry_business_number?: string;
  inquiry_origin_port?: string;
  inquiry_destination_port?: string;
  line_items: ClientQuoteLineItem[];
  total_amount: string;
  currency: string;
  cost_amount: string;
  status: string;
  valid_until: string | null;
  customer_notes: string | null;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
}

/**
 * 服务端状态 → 客户端展示标签（用户要求：withdrawn 不显示「已撤回」，
 * 而是显示「异常」，避免暴露撤回动作）
 */
export const CLIENT_STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '处理中', color: 'default' },
  pending_approval: { text: '处理中', color: 'gold' },
  approved: { text: '处理中', color: 'cyan' },
  sent: { text: '待接受', color: 'blue' },
  accepted: { text: '已接受', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  withdrawn: { text: '异常 - 需要重新处理', color: 'red' },
  expired: { text: '已过期', color: 'default' },
};

export async function listClientQuotes(params: { page?: number; pageSize?: number } = {}): Promise<PagedResult<ClientQuoteListItem>> {
  const res = await apiClient.get('/quotes', {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function getClientQuote(id: string): Promise<ClientQuote> {
  const res = await apiClient.get<ClientQuote>(`/quotes/${id}`);
  return res.data;
}

export async function acceptClientQuote(id: string) {
  const res = await apiClient.post(`/quotes/${id}/accept`);
  return res.data;
}

export async function rejectClientQuote(id: string) {
  const res = await apiClient.post(`/quotes/${id}/reject`);
  return res.data;
}
