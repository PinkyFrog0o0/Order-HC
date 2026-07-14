import { Card, Col, Row, Statistic, Typography } from 'antd';

export function HomePage() {
  return (
    <>
      <Typography.Title level={3}>首页</Typography.Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="今日询价" value={0} suffix="单" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待报价" value={0} suffix="单" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="在途订单" value={0} suffix="单" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月营收" value={0} prefix="¥" />
          </Card>
        </Col>
      </Row>
    </>
  );
}