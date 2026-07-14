import { apiClient } from './api';

export type InquiryStatus =
  | 'draft'
  | 'submitted'
  | 'quoting'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface InquiryOrder {
  id: string;
  business_number: string;
  customer_code: string;
  trade_type: 'import' | 'export';
  incoterm: string;
  origin_country: string;
  destination_country: string;
  origin_port: string;
  destination_port: string;
  total_gross_weight_kg: string;
  total_net_weight_kg: string;
  total_packages: number;
  total_value: string;
  currency: string;
  status: InquiryStatus;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  item_count?: number;
  attachment_count?: number;
  items?: InquiryItem[];
  attachments?: InquiryAttachment[];
}

export interface InquiryItem {
  id: string;
  line_number: number;
  hs_code: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  gross_weight_kg: string;
  net_weight_kg: string;
  packages: number;
  origin_country: string | null;
}

export interface InquiryAttachment {
  id: string;
  original_filename: string;
  attachment_type: string;
  size_bytes: string;
  parse_status: string;
  parsed_data: unknown;
  created_at: string;
}

export interface CreateInquiryInput {
  customer_code: string;
  trade_type: 'import' | 'export';
  incoterm: string;
  origin_country: string;
  destination_country: string;
  origin_port: string;
  destination_port: string;
  total_gross_weight_kg: number;
  total_net_weight_kg: number;
  total_packages: number;
  total_value: number;
  currency: string;
  notes?: string;
  items?: Array<{
    hs_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    gross_weight_kg: number;
    net_weight_kg: number;
    packages: number;
  }>;
  attachment_ids?: string[];
}

export async function createInquiry(input: CreateInquiryInput): Promise<InquiryOrder> {
  const res = await apiClient.post<InquiryOrder>('/inquiries', input);
  return res.data;
}

export async function listInquiries(params?: {
  status?: InquiryStatus;
  page?: number;
  page_size?: number;
}): Promise<{
  items: InquiryOrder[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}> {
  const res = await apiClient.get('/inquiries', { params });
  return res.data;
}

export async function getInquiry(id: string): Promise<InquiryOrder> {
  const res = await apiClient.get<InquiryOrder>(`/inquiries/${id}`);
  return res.data;
}

export async function submitInquiry(id: string): Promise<InquiryOrder> {
  const res = await apiClient.post<InquiryOrder>(`/inquiries/${id}/submit`);
  return res.data;
}