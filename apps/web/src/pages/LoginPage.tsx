import { Button, Card, Form, Input, Typography, App as AntdApp } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    tenant_code?: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const result = await login({
        email: values.email,
        password: values.password,
        ...(values.tenant_code ? { tenant_code: values.tenant_code } : {}),
      });
      localStorage.setItem('haycargo:token', result.access_token);
      localStorage.setItem('haycargo:user', JSON.stringify(result.user));
      if (result.user.tenant_id) {
        localStorage.setItem('haycargo:tenant_id', result.user.tenant_id);
      }
      message.success(`欢迎回来, ${result.user.full_name}`);
      // 按角色跳转
      navigate(result.user.tenant_id ? '/client/inquiries' : '/admin/dashboard');
    } catch (err) {
      const e = err as { message?: string };
      message.error(e.message ?? '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 400 }} bordered={false}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          Haycargo 清关系统
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item label="客户代码" name="tenant_code" tooltip="管理员可留空">
            <Input placeholder="客户端必填，如 DEMO001" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
          演示账号：DEMO001 / user-a@demo.com / password123
        </Typography.Paragraph>
      </Card>
    </div>
  );
}