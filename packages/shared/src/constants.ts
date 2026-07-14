/**
 * 业务常量定义
 *
 * 这里只放"全系统唯一真相源"的常量。状态码、角色名、费用类型等。
 * 业务参数（费率、口岸等）放在数据库配置表里，不要写死在代码里。
 */

/**
 * 产品版本号 —— 前端展示用来源。
 * 发布新版时：改这里，同时改 apps/api/src/version/version.service.ts 的 APP_VERSION
 * （后端不能运行时引入本包，需各存一份），并在仓库打上对应的 GitHub Release tag（如 v2.1.2）。
 */
export const APP_VERSION = '2.1.1';

/**
 * 询价单状态
 */
export const INQUIRY_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  QUOTING: 'quoting',
  QUOTED: 'quoted',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type InquiryStatus = (typeof INQUIRY_STATUS)[keyof typeof INQUIRY_STATUS];

/**
 * 报价单状态
 */
export const QUOTE_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type QuoteStatus = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS];

/**
 * 管理端角色
 */
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  FINANCE: 'finance',
  OPS: 'ops',
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

/**
 * 客户端角色
 */
export const CLIENT_ROLES = {
  CLIENT_ADMIN: 'client_admin',
  CLIENT_USER: 'client_user',
  CLIENT_FINANCE: 'client_finance',
} as const;

export type ClientRole = (typeof CLIENT_ROLES)[keyof typeof CLIENT_ROLES];

/**
 * 卡车业务类型
 */
export const TRUCK_SERVICE_TYPE = {
  LTL: 'ltl', // 零担
  FTL: 'ftl', // 整车
  PORT_TO_DOOR: 'port_to_door', // 港到门拖车
} as const;

export type TruckServiceType =
  (typeof TRUCK_SERVICE_TYPE)[keyof typeof TRUCK_SERVICE_TYPE];

/**
 * 集装箱类型
 */
export const CONTAINER_TYPE = {
  GP20: '20gp',
  GP40: '40gp',
  HQ40: '40hq',
  RF40: '40rf', // 冷藏
} as const;

export type ContainerType = (typeof CONTAINER_TYPE)[keyof typeof CONTAINER_TYPE];

/**
 * 业务编号前缀
 */
export const BUSINESS_NUMBER_PREFIX = {
  INQUIRY: 'INQ',
  QUOTE: 'QT',
  BUSINESS: 'BG',
} as const;