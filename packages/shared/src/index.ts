/**
 * @haycargo/shared
 *
 * 前后端共享的 TS 类型 + Zod schema + 常量。
 *
 * 原则：
 * - 所有跨网络传输的数据结构必须在这里定义 Zod schema
 * - TS 类型从 Zod schema 推导，不要单独写 interface
 * - 业务枚举值（状态、角色等）集中在 constants.ts
 */

export * from './constants';
export * from './schemas';
export * from './types';