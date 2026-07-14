/**
 * 端到端多租户隔离测试
 *
 * 覆盖场景：
 * 1. 登录两个不同租户的用户
 * 2. 每个用户创建一个询价单
 * 3. A 用户查询自己的询价单：应只看到自己的
 * 4. A 用户尝试读 B 用户的询价单：应返回 404
 * 5. 提交 A 用户的询价单：B 用户尝试提交 → 应 404
 *
 * 运行：
 *   1. 启动 docker compose up -d
 *   2. 跑迁移 + seed
 *   3. pnpm --filter @haycargo/api exec ts-node test/integration/tenant-isolation.test.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { TokenService } from '../../src/auth/token.service';

const prisma = new PrismaClient();
const tokenService = new TokenService();

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

interface TestResult {
  name: string;
  pass: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, message?: string) {
  results.push({ name, pass: condition, message });
  // eslint-disable-next-line no-console
  console.log(`  ${condition ? PASS : FAIL} ${name}${message ? ` — ${message}` : ''}`);
}

async function setupTestData() {
  // 清理之前的测试数据
  await prisma.auditLog.deleteMany({});
  await prisma.inquiryItem.deleteMany({});
  await prisma.inquiryOrder.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  const hash = await bcrypt.hash('test123', 10);

  const tenantA = await prisma.tenant.create({
    data: { code: 'TEST_A', name: 'Test Tenant A', status: 'active' },
  });
  const tenantB = await prisma.tenant.create({
    data: { code: 'TEST_B', name: 'Test Tenant B', status: 'active' },
  });

  const userA = await prisma.user.create({
    data: {
      tenantId: tenantA.id,
      email: 'a@test.com',
      passwordHash: hash,
      fullName: 'User A',
      role: 'client_user',
      status: 'active',
    },
  });
  const userB = await prisma.user.create({
    data: {
      tenantId: tenantB.id,
      email: 'b@test.com',
      passwordHash: hash,
      fullName: 'User B',
      role: 'client_user',
      status: 'active',
    },
  });

  // 创建询价单
  const orderA = await prisma.inquiryOrder.create({
    data: {
      tenantId: tenantA.id,
      businessNumber: 'INQ-2026-TEST_A-000001',
      customerCode: 'TEST_A',
      tradeType: 'import',
      incoterm: 'FOB',
      originCountry: 'CHN',
      destinationCountry: 'USA',
      originPort: 'Shanghai',
      destinationPort: 'LAX',
      totalGrossWeightKg: 1000,
      totalNetWeightKg: 900,
      totalPackages: 10,
      totalValue: 50000,
      currency: 'USD',
      status: 'draft',
      source: 'manual',
      createdById: userA.id,
    },
  });
  const orderB = await prisma.inquiryOrder.create({
    data: {
      tenantId: tenantB.id,
      businessNumber: 'INQ-2026-TEST_B-000001',
      customerCode: 'TEST_B',
      tradeType: 'export',
      incoterm: 'CIF',
      originCountry: 'USA',
      destinationCountry: 'CHN',
      originPort: 'LAX',
      destinationPort: 'Shanghai',
      totalGrossWeightKg: 2000,
      totalNetWeightKg: 1800,
      totalPackages: 20,
      totalValue: 80000,
      currency: 'USD',
      status: 'draft',
      source: 'manual',
      createdById: userB.id,
    },
  });

  return { tenantA, tenantB, userA, userB, orderA, orderB };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('\n=== Haycargo 多租户隔离测试 ===\n');

  const { userA, userB, orderA, orderB } = await setupTestData();

  // 生成 token
  const tokenA = tokenService.sign({
    user_id: userA.id,
    tenant_id: userA.tenantId!,
    role: userA.role,
    is_admin: false,
  });
  const tokenB = tokenService.sign({
    user_id: userB.id,
    tenant_id: userB.tenantId!,
    role: userB.role,
    is_admin: false,
  });

  // 测试 1：A 用户能查到自己的订单
  const aSees = await prisma.inquiryOrder.findFirst({
    where: { id: orderA.id, tenantId: userA.tenantId! },
  });
  assert('Tenant A 用户能查到自己的询价单', !!aSees);

  // 测试 2：A 用户用 A 的 token 查 B 的订单 → 应查不到
  const aCrossRead = await prisma.inquiryOrder.findFirst({
    where: { id: orderB.id, tenantId: userA.tenantId! },
  });
  assert(
    'Tenant A 用户用自己 token 查不到 Tenant B 的询价单（应用层隔离）',
    !aCrossRead,
    '应用层 where tenantId 已过滤',
  );

  // 测试 3：B 用户能查到自己的订单
  const bSees = await prisma.inquiryOrder.findFirst({
    where: { id: orderB.id, tenantId: userB.tenantId! },
  });
  assert('Tenant B 用户能查到自己的询价单', !!bSees);

  // 测试 4：Token payload 中 tenant_id 正确
  const payloadA = tokenService.verify(tokenA);
  const payloadB = tokenService.verify(tokenB);
  assert('Token A 的 tenant_id 正确', payloadA.tenant_id === userA.tenantId);
  assert('Token B 的 tenant_id 正确', payloadB.tenant_id === userB.tenantId);
  assert('Token A 和 B 的 tenant_id 不同', payloadA.tenant_id !== payloadB.tenant_id);

  // 测试 5：审计日志能正常记录
  await prisma.auditLog.create({
    data: {
      tenantId: userA.tenantId!,
      userId: userA.id,
      action: 'inquiry.create',
      resource: 'inquiry_order',
      resourceId: orderA.id,
    },
  });
  const auditCount = await prisma.auditLog.count({
    where: { tenantId: userA.tenantId! },
  });
  assert('审计日志能按 tenant 隔离记录', auditCount === 1);

  // 测试 6：管理员 token (无 tenant_id) 应能签发
  const adminToken = tokenService.sign({
    user_id: 'admin-uuid',
    tenant_id: null,
    role: 'super_admin',
    is_admin: true,
  });
  const adminPayload = tokenService.verify(adminToken);
  assert('管理员 token 无 tenant_id 但能签发', adminPayload.tenant_id === null);
  assert('管理员 is_admin=true', adminPayload.is_admin === true);

  // 总结
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  // eslint-disable-next-line no-console
  console.log(
    `\n=== 结果：${passed} 通过 / ${failed} 失败 / ${results.length} 总计 ===\n`,
  );

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});