/**
 * Seed 脚本：创建演示租户、管理员账户、清关行、字典等
 *
 * 用法：
 *   pnpm --filter @haycargo/api exec ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 演示租户
  const tenant1 = await prisma.tenant.upsert({
    where: { code: 'DEMO001' },
    update: {},
    create: {
      code: 'DEMO001',
      name: '演示货主公司 A',
      status: 'active',
      contact: { phone: '+86-21-12345678', email: 'contact@demo-a.com' },
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { code: 'DEMO002' },
    update: {},
    create: {
      code: 'DEMO002',
      name: '演示货主公司 B',
      status: 'active',
    },
  });

  // 客户端用户
  const clientHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'user-a@demo.com' },
    update: {},
    create: {
      tenantId: tenant1.id,
      email: 'user-a@demo.com',
      passwordHash: clientHash,
      fullName: '客户 A 用户',
      role: 'client_user',
      status: 'active',
    },
  });

  await prisma.user.upsert({
    where: { email: 'user-b@demo.com' },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'user-b@demo.com',
      passwordHash: clientHash,
      fullName: '客户 B 用户',
      role: 'client_user',
      status: 'active',
    },
  });

  // 管理员（超管）
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@haycargo.com' },
    update: {},
    create: {
      tenantId: null,
      email: 'admin@haycargo.com',
      passwordHash: adminHash,
      fullName: '系统管理员',
      role: 'super_admin',
      status: 'active',
    },
  });

  // 其他管理端角色
  await prisma.user.upsert({
    where: { email: 'operator@haycargo.com' },
    update: {},
    create: {
      tenantId: null,
      email: 'operator@haycargo.com',
      passwordHash: adminHash,
      fullName: '操作员',
      role: 'operator',
      status: 'active',
    },
  });

  await prisma.user.upsert({
    where: { email: 'finance@haycargo.com' },
    update: {},
    create: {
      tenantId: null,
      email: 'finance@haycargo.com',
      passwordHash: adminHash,
      fullName: '财务',
      role: 'finance',
      status: 'active',
    },
  });

  // 清关行
  await prisma.clearanceAgent.upsert({
    where: { code: 'HAICARGO-EU' },
    update: {},
    create: {
      code: 'HAICARGO-EU',
      name: 'HAICARGO GMBH（欧洲本土）',
      contactPhone: '+49-40-123456',
      contactEmail: 'ops@haicargo.de',
      contactAddress: 'Uferstrasse 3, Hamburg, Germany',
      specialPorts: 'HAM, ROT, BRE, ANT',
      status: 'active',
      performanceRating: 4.5,
      notes: '欧洲本土清关主力，价格优势明显',
    },
  });

  await prisma.clearanceAgent.upsert({
    where: { code: 'EURO-CUSTOMS-001' },
    update: {},
    create: {
      code: 'EURO-CUSTOMS-001',
      name: '欧洲清关行 001',
      contactPhone: '+31-20-987654',
      contactEmail: 'info@euro-customs.nl',
      specialPorts: 'RTM, AMS',
      status: 'active',
      performanceRating: 4.2,
    },
  });

  // 卡车服务
  await prisma.truckService.upsert({
    where: { code: 'LTL-CN-EU' },
    update: {},
    create: {
      serviceType: 'ltl',
      code: 'LTL-CN-EU',
      name: '中欧 LTL 零担',
      originRegion: '中国主要港口',
      destinationRegion: '欧洲主要城市',
      pricingModel: 'per_kg',
      basePrice: 800,
      unitPrice: 12.5,
      enabled: true,
    },
  });

  await prisma.truckService.upsert({
    where: { code: 'FTL-EU-20GP' },
    update: {},
    create: {
      serviceType: 'ftl',
      code: 'FTL-EU-20GP',
      name: '欧洲 FTL 20GP 整车',
      pricingModel: 'flat',
      basePrice: 2500,
      vehicleType: '20GP',
      enabled: true,
    },
  });

  await prisma.truckService.upsert({
    where: { code: 'P2D-HAM' },
    update: {},
    create: {
      serviceType: 'port_to_door',
      code: 'P2D-HAM',
      name: '汉堡港到门拖车',
      originRegion: 'HAM',
      pricingModel: 'flat',
      basePrice: 450,
      containerType: '20GP',
      enabled: true,
    },
  });

  // 基础字典：港口
  const ports = [
    { code: 'SHA', nameZh: '上海港', nameEn: 'Shanghai' },
    { code: 'SZX', nameZh: '深圳港', nameEn: 'Shenzhen' },
    { code: 'NGB', nameZh: '宁波港', nameEn: 'Ningbo' },
    { code: 'HAM', nameZh: '汉堡港', nameEn: 'Hamburg' },
    { code: 'ROT', nameZh: '鹿特丹港', nameEn: 'Rotterdam' },
    { code: 'ANT', nameZh: '安特卫普港', nameEn: 'Antwerp' },
    { code: 'BRE', nameZh: '不来梅港', nameEn: 'Bremen' },
  ];
  for (const p of ports) {
    await prisma.dictionaryEntry.upsert({
      where: { category_code: { category: 'port', code: p.code } },
      update: {},
      create: { category: 'port', code: p.code, nameZh: p.nameZh, nameEn: p.nameEn },
    });
  }

  // 币种
  const currencies = [
    { code: 'CNY', nameZh: '人民币' },
    { code: 'USD', nameZh: '美元' },
    { code: 'EUR', nameZh: '欧元' },
    { code: 'GBP', nameZh: '英镑' },
    { code: 'JPY', nameZh: '日元' },
  ];
  for (const c of currencies) {
    await prisma.dictionaryEntry.upsert({
      where: { category_code: { category: 'currency', code: c.code } },
      update: {},
      create: { category: 'currency', code: c.code, nameZh: c.nameZh, nameEn: c.code },
    });
  }

  // 国家
  const countries = [
    { code: 'CHN', nameZh: '中国', nameEn: 'China' },
    { code: 'DEU', nameZh: '德国', nameEn: 'Germany' },
    { code: 'NLD', nameZh: '荷兰', nameEn: 'Netherlands' },
    { code: 'USA', nameZh: '美国', nameEn: 'United States' },
    { code: 'GBR', nameZh: '英国', nameEn: 'United Kingdom' },
  ];
  for (const c of countries) {
    await prisma.dictionaryEntry.upsert({
      where: { category_code: { category: 'country', code: c.code } },
      update: {},
      create: { category: 'country', code: c.code, nameZh: c.nameZh, nameEn: c.nameEn },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed 完成：');
  // eslint-disable-next-line no-console
  console.log('  租户:');
  // eslint-disable-next-line no-console
  console.log(`    ${tenant1.code} (${tenant1.name})`);
  // eslint-disable-next-line no-console
  console.log(`    ${tenant2.code} (${tenant2.name})`);
  // eslint-disable-next-line no-console
  console.log('  客户端账号:');
  // eslint-disable-next-line no-console
  console.log('    user-a@demo.com / password123 (DEMO001)');
  // eslint-disable-next-line no-console
  console.log('    user-b@demo.com / password123 (DEMO002)');
  // eslint-disable-next-line no-console
  console.log('  管理端账号 (密码都是 admin123):');
  // eslint-disable-next-line no-console
  console.log('    admin@haycargo.com (超级管理员)');
  // eslint-disable-next-line no-console
  console.log('    operator@haycargo.com (操作员)');
  // eslint-disable-next-line no-console
  console.log('    finance@haycargo.com (财务)');
  // eslint-disable-next-line no-console
  console.log('  清关行: 2 个');
  // eslint-disable-next-line no-console
  console.log('  卡车服务: 3 个');
  // eslint-disable-next-line no-console
  console.log('  字典: 7 港口 + 5 币种 + 5 国家');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });