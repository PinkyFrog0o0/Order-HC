/**
 * 管理端 MainLayout
 *
 * 区别于客户端 layout：
 * - 菜单按管理端模块组织（清关/卡车/报表/系统）
 * - 顶部显示"管理端"标识
 * - 不显示客户端的"询价单"菜单
 */

import { Layout, Menu, theme } from 'antd';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { hasToken } from '../lib/auth';
import { VersionFooter } from '../components/VersionFooter';

const { Header, Sider, Content } = Layout;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  if (!hasToken()) {
    return <Navigate to="/login" replace />;
  }

  const userStr = localStorage.getItem('haycargo:user');
  const user = userStr ? (JSON.parse(userStr) as { full_name: string }) : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={240}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#fff',
              padding: '20px 24px',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            Haycargo
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.7, marginTop: 4 }}>
              管理端
            </div>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            style={{ flex: 1, overflowY: 'auto' }}
            selectedKeys={[location.pathname]}
            onClick={({ key }) => navigate(key)}
            items={[
              { key: '/admin/dashboard', label: '仪表盘' },
              {
                key: 'clearance',
                label: '清关',
                children: [
                  { key: '/admin/clearance/inquiries', label: '清关询价' },
                  { key: '/admin/clearance/quotes', label: '清关报价' },
                  { key: '/admin/clearance/agents', label: '清关行配置' },
                  { key: '/admin/clearance/service-items', label: '服务项' },
                  { key: '/admin/clearance/cost-configs', label: '成本&利润配置' },
                  { key: '/admin/clearance/quote-configs', label: '报价配置' },
                ],
              },
              {
                key: 'truck',
                label: '卡车',
                children: [
                  { key: '/admin/truck/services', label: '服务管理' },
                ],
              },
              { key: '/admin/reports', label: '报表管理' },
              { key: '/admin/dictionary', label: '基础设置' },
              {
                key: 'system',
                label: '系统',
                children: [
                  { key: '/admin/system/users', label: '用户管理' },
                  { key: '/admin/system/tenants', label: '客户管理' },
                ],
              },
            ]}
          />
          <VersionFooter />
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            paddingLeft: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}>清关系统 · 管理后台</span>
          <span style={{ fontSize: 14, color: '#666' }}>
            {user?.full_name ?? '管理员'}
          </span>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}