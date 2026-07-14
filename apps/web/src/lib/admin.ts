import { apiClient } from './api';

export const TENANT_IDS = {
  ALL: '__all__',
} as const;

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminInquiry {
  id: string;
  business_number: string;
  customer_code: string;
  trade_type: string;
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
  status: string;
  notes: string | null;
  source: string;
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  created_by_name: string;
  clearance_agent_id: string | null;
  clearance_agent_code: string | null;
  clearance_agent_name: string | null;
  item_count: number;
  attachment_count: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  quote: unknown | null;
}

export interface AdminQuote {
  id: string;
  business_number: string;
  inquiryOrderId: string;
  tenant_code: string;
  tenant_name: string;
  lineItems: Array<{ name: string; description?: string; quantity?: number; unit_price: number; amount: number }>;
  totalAmount: string;
  currency: string;
  costAmount: string;
  marginPercent: string | null;
  status: string;
  validUntil: string | null;
  internalNotes: string | null;
  customerNotes: string | null;
  created_at: string;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;
  withdrawnAt: string | null;
  withdrawnById: string | null;
  inquiry_order?: {
    id: string;
    businessNumber: string;
    incoterm: string;
    originPort: string;
    destinationPort: string;
  };
}

export const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  submitted: { text: '已提交', color: 'blue' },
  quoting: { text: '报价中', color: 'gold' },
  quoted: { text: '已报价', color: 'cyan' },
  confirmed: { text: '已确认', color: 'green' },
  in_progress: { text: '处理中', color: 'geekblue' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'red' },
  pending_approval: { text: '待审批', color: 'gold' },
  approved: { text: '已审批', color: 'cyan' },
  sent: { text: '已发送', color: 'blue' },
  accepted: { text: '已接受', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  withdrawn: { text: '已撤回', color: 'red' },
  expired: { text: '已过期', color: 'default' },
};

// ============ 询价 ============
export async function listAdminInquiries(params: {
  tenantId?: string;
  status?: string;
  businessNumber?: string;
  originCountry?: string;
  destinationCountry?: string;
  originPort?: string;
  destinationPort?: string;
  createdById?: string;
  clearanceAgentId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedResult<AdminInquiry>> {
  const res = await apiClient.get('/admin/clearance/inquiries', {
    params: {
      tenant_id: params.tenantId && params.tenantId !== TENANT_IDS.ALL ? params.tenantId : undefined,
      status: params.status,
      business_number: params.businessNumber,
      origin_country: params.originCountry,
      destination_country: params.destinationCountry,
      origin_port: params.originPort,
      destination_port: params.destinationPort,
      created_by_id: params.createdById,
      clearance_agent_id: params.clearanceAgentId,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function getAdminInquiry(id: string): Promise<AdminInquiry> {
  const res = await apiClient.get<AdminInquiry>(`/admin/clearance/inquiries/${id}`);
  return res.data;
}

export async function updateAdminInquiryStatus(id: string, status: string, note?: string) {
  const res = await apiClient.post(`/admin/clearance/inquiries/${id}/status`, { status, note });
  return res.data;
}

export async function updateAdminInquiryNote(id: string, note: string) {
  const res = await apiClient.post(`/admin/clearance/inquiries/${id}/note`, { note });
  return res.data;
}

export async function updateAdminInquiryAgent(id: string, agentId: string | null) {
  const res = await apiClient.put(`/admin/clearance/inquiries/${id}`, { clearance_agent_id: agentId });
  return res.data;
}

export interface InquiryFilterOptions {
  tenants: Array<{ id: string; code: string; name: string }>;
  agents: Array<{ id: string; code: string; name: string }>;
  creators: Array<{ id: string; full_name: string }>;
  countries: Array<{ code: string; nameZh: string }>;
  ports: Array<{ code: string; nameZh: string }>;
}

export async function getInquiryFilterOptions(): Promise<InquiryFilterOptions> {
  const res = await apiClient.get<InquiryFilterOptions>('/admin/clearance/inquiries/filter-options');
  return res.data;
}

// ============ 报价 ============
export async function listAdminQuotes(params: {
  tenantId?: string;
  status?: string;
  businessNumber?: string;
  originCountry?: string;
  destinationCountry?: string;
  originPort?: string;
  destinationPort?: string;
  createdById?: string;
  clearanceAgentId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedResult<AdminQuote>> {
  const res = await apiClient.get('/admin/clearance/quotes', {
    params: {
      tenant_id: params.tenantId && params.tenantId !== TENANT_IDS.ALL ? params.tenantId : undefined,
      status: params.status,
      business_number: params.businessNumber,
      origin_country: params.originCountry,
      destination_country: params.destinationCountry,
      origin_port: params.originPort,
      destination_port: params.destinationPort,
      created_by_id: params.createdById,
      clearance_agent_id: params.clearanceAgentId,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function getAdminQuote(id: string): Promise<AdminQuote> {
  const res = await apiClient.get<AdminQuote>(`/admin/clearance/quotes/${id}`);
  return res.data;
}

export async function createQuote(input: {
  inquiryOrderId: string;
  lineItems: Array<{ name: string; description?: string; quantity?: number; unit_price: number; amount: number }>;
  currency: string;
  marginPercent?: number;
  internalNotes?: string;
  customerNotes?: string;
  validUntil?: string;
}) {
  const res = await apiClient.post('/admin/clearance/quotes', input);
  return res.data;
}

export async function updateQuoteStatus(id: string, status: string) {
  const res = await apiClient.post(`/admin/clearance/quotes/${id}/status`, { status });
  return res.data;
}

export async function withdrawQuote(id: string) {
  const res = await apiClient.post(`/admin/clearance/quotes/${id}/withdraw`);
  return res.data;
}

export async function generateQuotePdf(id: string) {
  const res = await apiClient.post(`/admin/clearance/quotes/${id}/pdf-generate`);
  return res.data;
}

export async function deleteQuote(id: string) {
  const res = await apiClient.delete(`/admin/clearance/quotes/${id}`);
  return res.data;
}

// ============ 清关行 ============
export interface ClearanceAgent {
  id: string;
  code: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  specialPorts: string | null;
  status: string;
  performanceRating: string | null;
  notes: string | null;
}

export async function listAgents(params: { status?: string; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/clearance/agents', { params });
  return res.data;
}

export async function createAgent(input: Partial<ClearanceAgent> & { code: string; name: string }) {
  const res = await apiClient.post('/admin/clearance/agents', input);
  return res.data;
}

export async function updateAgent(id: string, input: Partial<ClearanceAgent>) {
  const res = await apiClient.put(`/admin/clearance/agents/${id}`, input);
  return res.data;
}

export async function deleteAgent(id: string) {
  const res = await apiClient.delete(`/admin/clearance/agents/${id}`);
  return res.data;
}

// ============ 成本/报价配置 ============
export interface CostConfig {
  id: string;
  agentId: string | null;
  name: string;
  conditions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
  agent_code?: string;
  agent_name?: string;
  item_count?: number;
  items?: CostConfigItem[];
}

export interface CostConfigItem {
  id: string;
  costConfigId: string;
  serviceItemId: string;
  costAmount: string;
  profitType: 'percent' | 'fixed';
  profitValue: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  service_item_code?: string;
  service_item_name?: string;
}

export async function listCostConfigs(params: { agentId?: string; enabled?: boolean; q?: string; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/clearance/cost-configs', {
    params: {
      agent_id: params.agentId,
      enabled: params.enabled === undefined ? undefined : String(params.enabled),
      q: params.q,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function getCostConfig(id: string) {
  const res = await apiClient.get<CostConfig>(`/admin/clearance/cost-configs/${id}`);
  return res.data;
}

export async function createCostConfig(input: {
  agentId?: string;
  name: string;
  conditions?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
}) {
  const res = await apiClient.post('/admin/clearance/cost-configs', input);
  return res.data;
}

export async function updateCostConfig(id: string, input: Partial<{
  name: string;
  conditions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}>) {
  const res = await apiClient.put(`/admin/clearance/cost-configs/${id}`, input);
  return res.data;
}

export async function deleteCostConfig(id: string) {
  const res = await apiClient.delete(`/admin/clearance/cost-configs/${id}`);
  return res.data;
}

export async function addCostConfigItem(costConfigId: string, input: {
  serviceItemId: string;
  costAmount: number;
  profitType: 'percent' | 'fixed';
  profitValue: number;
  sortOrder?: number;
}) {
  const res = await apiClient.post(`/admin/clearance/cost-configs/${costConfigId}/items`, input);
  return res.data;
}

export async function updateCostConfigItem(itemId: string, input: Partial<{
  serviceItemId: string;
  costAmount: number;
  profitType: 'percent' | 'fixed';
  profitValue: number;
  sortOrder: number;
}>) {
  const res = await apiClient.put(`/admin/clearance/cost-config-items/${itemId}`, input);
  return res.data;
}

export async function deleteCostConfigItem(itemId: string) {
  const res = await apiClient.delete(`/admin/clearance/cost-config-items/${itemId}`);
  return res.data;
}

export async function listQuoteConfigs(params: { q?: string; enabled?: boolean; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/clearance/quote-configs', {
    params: {
      q: params.q,
      enabled: params.enabled === undefined ? undefined : String(params.enabled),
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function createQuoteConfig(input: {
  name: string;
  conditions: Record<string, unknown>;
  marginPercent: number;
  minimumCharge?: number;
  enabled?: boolean;
  priority?: number;
}) {
  const res = await apiClient.post('/admin/clearance/quote-configs', input);
  return res.data;
}

export async function updateQuoteConfig(id: string, input: Partial<{
  name: string;
  conditions: Record<string, unknown>;
  marginPercent: number;
  minimumCharge: number;
  enabled: boolean;
  priority: number;
}>) {
  const res = await apiClient.put(`/admin/clearance/quote-configs/${id}`, input);
  return res.data;
}

export async function deleteQuoteConfig(id: string) {
  const res = await apiClient.delete(`/admin/clearance/quote-configs/${id}`);
  return res.data;
}

// ============ 卡车 ============
export interface TruckService {
  id: string;
  serviceType: string;
  code: string;
  name: string;
  originRegion: string | null;
  destinationRegion: string | null;
  pricingModel: string;
  basePrice: string;
  unitPrice: string | null;
  vehicleType: string | null;
  containerType: string | null;
  enabled: boolean;
  notes: string | null;
}

export async function listTruckServices(params: { serviceType?: string; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/truck/services', { params });
  return res.data;
}

export async function createTruckService(input: Partial<TruckService> & { serviceType: string; code: string; name: string; pricingModel: string; basePrice: number }) {
  const res = await apiClient.post('/admin/truck/services', input);
  return res.data;
}

export async function updateTruckService(id: string, input: Partial<TruckService>) {
  const res = await apiClient.put(`/admin/truck/services/${id}`, input);
  return res.data;
}

export async function deleteTruckService(id: string) {
  const res = await apiClient.delete(`/admin/truck/services/${id}`);
  return res.data;
}

// ============ 服务项 ============
export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  category: string;
  unit: string;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export async function listServiceItems(params: { category?: string; enabled?: boolean; q?: string; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/clearance/service-items', {
    params: {
      category: params.category,
      enabled: params.enabled === undefined ? undefined : String(params.enabled),
      q: params.q,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function listAllServiceItems() {
  const res = await apiClient.get<ServiceItem[]>('/admin/clearance/service-items/all');
  return res.data;
}

export async function getServiceItem(id: string) {
  const res = await apiClient.get<ServiceItem>(`/admin/clearance/service-items/${id}`);
  return res.data;
}

export async function createServiceItem(input: {
  code: string;
  name: string;
  nameEn?: string;
  category: 'fee' | 'tax' | 'service' | 'surcharge';
  unit: string;
  description?: string;
  enabled?: boolean;
}) {
  const res = await apiClient.post('/admin/clearance/service-items', input);
  return res.data;
}

export async function updateServiceItem(id: string, input: Partial<{
  code: string; name: string; nameEn: string; category: string; unit: string; description: string; enabled: boolean;
}>) {
  const res = await apiClient.put(`/admin/clearance/service-items/${id}`, input);
  return res.data;
}

export async function deleteServiceItem(id: string) {
  const res = await apiClient.delete(`/admin/clearance/service-items/${id}`);
  return res.data;
}

// ============ 字典 ============
export async function listDictionary(category?: string) {
  const url = category ? `/admin/dictionary/category/${category}` : '/admin/dictionary';
  const res = await apiClient.get(url);
  return res.data;
}

export async function createDictEntry(input: {
  category: string;
  code: string;
  nameZh: string;
  nameEn?: string;
  parentCode?: string;
  extra?: Record<string, unknown>;
}) {
  const res = await apiClient.post('/admin/dictionary', input);
  return res.data;
}

export async function updateDictEntry(id: string, input: Partial<{ nameZh: string; nameEn: string; parentCode: string; enabled: boolean }>) {
  const res = await apiClient.put(`/admin/dictionary/${id}`, input);
  return res.data;
}

export async function deleteDictEntry(id: string) {
  const res = await apiClient.delete(`/admin/dictionary/${id}`);
  return res.data;
}

// ============ 报表 ============
export async function getDashboard() {
  const res = await apiClient.get('/admin/reports/dashboard');
  return res.data;
}

export async function getInquiryStatusDistribution() {
  const res = await apiClient.get('/admin/reports/inquiry-status');
  return res.data;
}

export async function getInquiryByTenant() {
  const res = await apiClient.get('/admin/reports/inquiry-by-tenant');
  return res.data;
}

export async function getInquiryDaily(days = 30) {
  const res = await apiClient.get('/admin/reports/inquiry-daily', { params: { days } });
  return res.data;
}

// ============ 用户/租户管理 ============
export interface AdminUser {
  id: string;
  tenantId: string | null;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: string;
  status: string;
  tenant_code: string | null;
  tenant_name: string | null;
  created_at: string;
  lastLoginAt: string | null;
}

export interface AdminTenant {
  id: string;
  code: string;
  name: string;
  status: string;
  user_count: number;
  inquiry_count: number;
  created_at: string;
}

export async function listAdminUsers(params: { tenantId?: string; role?: string; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/system/users', { params });
  return res.data;
}

export async function createAdminUser(input: {
  tenantId?: string;
  email?: string;
  phone?: string;
  password: string;
  fullName: string;
  role: string;
}) {
  const res = await apiClient.post('/admin/system/users', input);
  return res.data;
}

export async function updateAdminUser(id: string, input: Partial<{ fullName: string; role: string; status: string; password: string }>) {
  const res = await apiClient.put(`/admin/system/users/${id}`, input);
  return res.data;
}

export async function deleteAdminUser(id: string) {
  const res = await apiClient.delete(`/admin/system/users/${id}`);
  return res.data;
}

export async function listAdminTenants(params: { status?: string; page?: number; pageSize?: number } = {}) {
  const res = await apiClient.get('/admin/system/tenants', { params });
  return res.data;
}

export async function createAdminTenant(input: { code: string; name: string }) {
  const res = await apiClient.post('/admin/system/tenants', input);
  return res.data;
}

export async function updateAdminTenant(id: string, input: Partial<{ name: string; status: string }>) {
  const res = await apiClient.put(`/admin/system/tenants/${id}`, input);
  return res.data;
}