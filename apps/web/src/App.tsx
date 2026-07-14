import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { MainLayout } from './layouts/MainLayout';
import { hasToken } from './lib/auth';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { InquiryListPage } from './pages/client/InquiryListPage';
import { InquiryCreatePage } from './pages/client/InquiryCreatePage';
import { InquiryDetailPage } from './pages/client/InquiryDetailPage';
import { QuoteListPage } from './pages/client/QuoteListPage';
import { QuoteDetailPage } from './pages/client/QuoteDetailPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminInquiriesPage } from './pages/admin/clearance/AdminInquiriesPage';
import { AdminInquiryDetailPage } from './pages/admin/clearance/AdminInquiryDetailPage';
import { AdminQuotesPage } from './pages/admin/clearance/AdminQuotesPage';
import { AdminQuoteCreatePage } from './pages/admin/clearance/AdminQuoteCreatePage';
import { AdminQuoteDetailPage } from './pages/admin/clearance/AdminQuoteDetailPage';
import { AdminAgentsPage } from './pages/admin/clearance/AdminAgentsPage';
import { AdminCostConfigsPage } from './pages/admin/clearance/AdminCostConfigsPage';
import { AdminQuoteConfigsPage } from './pages/admin/clearance/AdminQuoteConfigsPage';
import { AdminServiceItemsPage } from './pages/admin/clearance/AdminServiceItemsPage';
import { AdminTruckPage } from './pages/admin/AdminTruckPage';
import { AdminDictionaryPage } from './pages/admin/AdminDictionaryPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminUsersPage } from './pages/admin/system/AdminUsersPage';
import { AdminTenantsPage } from './pages/admin/system/AdminTenantsPage';

function RootRedirect() {
  return <Navigate to={hasToken() ? '/client/inquiries' : '/login'} replace />;
}

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* 客户端路由 */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/client/inquiries" element={<InquiryListPage />} />
              <Route path="/client/inquiries/new" element={<InquiryCreatePage />} />
              <Route path="/client/inquiries/:id" element={<InquiryDetailPage />} />
              <Route path="/client/quotes" element={<QuoteListPage />} />
              <Route path="/client/quotes/:id" element={<QuoteDetailPage />} />
            </Route>

            {/* 管理端路由 */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="clearance/inquiries" element={<AdminInquiriesPage />} />
              <Route path="clearance/inquiries/:id" element={<AdminInquiryDetailPage />} />
              <Route path="clearance/quotes" element={<AdminQuotesPage />} />
              <Route path="clearance/quotes/new" element={<AdminQuoteCreatePage />} />
              <Route path="clearance/quotes/:id" element={<AdminQuoteDetailPage />} />
              <Route path="clearance/agents" element={<AdminAgentsPage />} />
              <Route path="clearance/service-items" element={<AdminServiceItemsPage />} />
              <Route path="clearance/cost-configs" element={<AdminCostConfigsPage />} />
              <Route path="clearance/quote-configs" element={<AdminQuoteConfigsPage />} />
              <Route path="truck/services" element={<AdminTruckPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="dictionary" element={<AdminDictionaryPage />} />
              <Route path="system/users" element={<AdminUsersPage />} />
              <Route path="system/tenants" element={<AdminTenantsPage />} />
            </Route>

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
