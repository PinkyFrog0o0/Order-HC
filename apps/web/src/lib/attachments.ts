import { apiClient } from './api';

export interface ParsedImageRef {
  storage_key: string;
  url: string;
  mime_type: string;
  sha256: string;
  width?: number;
  height?: number;
}

export interface ParsedAttachment {
  template_id: string | null;
  template_name: string | null;
  sheet_name: string;
  fields: Record<string, { label: string; value: unknown }>;
  raw_fields: Array<{ label: string; value: unknown }>;
  images?: ParsedImageRef[];
}

export interface TemplateConfig {
  id: string;
  name: string;
  version: string;
  sheet_name: string;
  field_mapping: Record<
    string,
    { label: string; required: boolean; type: string; options?: string[] }
  >;
}

export interface Attachment {
  id: string;
  original_filename: string;
  attachment_type: string;
  size_bytes: string;
  content_type: string;
  parse_status: 'pending' | 'success' | 'failed' | 'skipped';
  parsed_data: ParsedAttachment | null;
  parse_error: string | null;
  created_at: string;
}

export async function uploadAttachment(
  file: File,
  attachmentType:
    | 'packing_list'
    | 'commercial_invoice'
    | 'invoice_packing'
    | 'excel_template'
    | 'other' = 'excel_template',
): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('attachment_type', attachmentType);

  const response = await apiClient.post<Attachment>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getAttachment(id: string): Promise<Attachment> {
  const response = await apiClient.get<Attachment>(`/attachments/${id}`);
  return response.data;
}

export async function listTemplates(): Promise<TemplateConfig[]> {
  const response = await apiClient.get<TemplateConfig[]>('/attachments/templates');
  return response.data;
}

/**
 * 下载模板（浏览器侧触发 .xlsx 保存）
 */
export async function downloadTemplate(id: string, name?: string): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/attachments/templates/${id}/download`,
    { responseType: 'blob' },
  );
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name ?? id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function attachToInquiry(attachmentId: string, inquiryId: string): Promise<void> {
  await apiClient.post(`/attachments/${attachmentId}/attach/${inquiryId}`);
}