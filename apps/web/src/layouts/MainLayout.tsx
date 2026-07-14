import { Dropdown, Layout, Menu, Space, theme } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { hasToken } from '../lib/auth';
import { VersionFooter } from '../components/VersionFooter';

const { Header, Sider, Content } = Layout;

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  if (!hasToken()) {
    return <Navigate to="/login" replace />;
  }

  const userStr = localStorage.getItem('haycargo:user');
  const user = userStr ? (JSON.parse(userStr) as { full_name: string; email?: string }) : null;

  const handleLogout = () => {
    localStorage.removeItem('haycargo:token');
    localStorage.removeItem('haycargo:user');
    localStorage.removeItem('haycargo:tenant_id');
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
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
          </div>
          <Menu
            theme="dark"
            mode="inline"
            style={{ flex: 1, overflowY: 'auto' }}
            selectedKeys={[location.pathname]}
            onClick={({ key }) => navigate(key)}
            items={[
              { key: '/home', label: '首页' },
              { key: '/client/inquiries', label: '询价单' },
              { key: '/client/inquiries/new', label: '创建询价单' },
              { key: '/client/quotes', label: '我的报价' },
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
            paddingRight: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}>清关系统 · 客户端</span>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <UserOutlined />
              <span>{user?.full_name ?? '未登录'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}