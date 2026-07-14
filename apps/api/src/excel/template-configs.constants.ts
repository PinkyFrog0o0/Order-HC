/**
 * 硬编码的模板配置常量
 *
 * 来源：Docs/HC欧洲清关询价模板.xls
 *
 * 字段命名规范：
 * - 业务字段 key 用 snake_case（如 customs_subject_type）
 * - label 严格匹配模板 A 列原文
 */

import { TemplateConfig } from './template-config';

/**
 * 模板 1：HC 欧洲清关询价（自税）
 */
export const HC_SELF_TAXED_TEMPLATE: TemplateConfig = {
  id: 'hc-self-taxed-v1',
  name: 'HC 欧洲清关询价 - 自税',
  version: 'v1',
  sheet_name: '海客欧洲清关-自税信息表',
  title_fill: 'FF0070C0',
  field_mapping: {
    customs_subject_type: {
      label: '清关主体类型',
      required: true,
      type: 'select',
      options: ['本土公司', '个人', '其他'],
    },
    importer_name: { label: '进口商抬头', required: false, type: 'text' },
    vat_eori: { label: 'VAT/EORI', required: false, type: 'text' },
    product_name: { label: '产品名称/品名', required: true, type: 'text' },
    product_image: { label: '产品图片', required: true, type: 'image' },
    hs_code: { label: 'HSCODE', required: false, type: 'text' },
    total_packages: { label: '总件数', required: false, type: 'number' },
    container_type: {
      label: '柜型',
      required: true,
      type: 'select',
      options: ['20GP', '40GP', '40HQ', '40RF', '散货'],
    },
    cargo_type: {
      label: '货物类型',
      required: true,
      type: 'select',
      options: ['普通货', '敏感货', '危险品'],
    },
    total_gross_weight_kg: { label: '总毛重(kg)', required: false, type: 'number' },
    total_net_weight_kg: { label: '总净重(kg)', required: false, type: 'number' },
    total_volume_cbm: { label: '总体积(cbm)', required: false, type: 'number' },
    dimensions: { label: '长×宽×高（m）', required: false, type: 'text' },
    cargo_value: { label: '货值', required: false, type: 'number' },
    etd_port: { label: 'ETD 起运港口', required: false, type: 'text' },
    eta_port: { label: 'ETA 目的港口', required: true, type: 'text' },
    shipping_company: { label: '船公司 Shipping Company', required: false, type: 'text' },
    bl_number: { label: '提单号 B/L NO', required: false, type: 'text' },
    container_number: { label: '集装箱号 Container No', required: false, type: 'text' },
    delivery_address: { label: '派送地址 Delivery address', required: true, type: 'text' },
    return_container_offsite: {
      label: '还柜地址（是否异地）',
      required: false,
      type: 'select',
      options: ['是', '否'],
    },
    is_transit: {
      label: '是否中转（是否有等候费用）',
      required: false,
      type: 'select',
      options: ['是', '否'],
    },
    has_commercial_invoice: {
      label: '商业发票',
      required: false,
      type: 'select',
      options: ['已提供', '未提供'],
    },
    has_packing_list: {
      label: '装箱单',
      required: false,
      type: 'select',
      options: ['已提供', '未提供'],
    },
    other_clearance_docs: { label: '其他清关资料', required: false, type: 'text' },
    special_notes: { label: '其他特殊备注', required: false, type: 'text' },
  },
};

/**
 * 模板 2：HC 欧洲清关询价（专线包税）
 */
export const HC_DEDICATED_LINE_TEMPLATE: TemplateConfig = {
  id: 'hc-dedicated-line-v1',
  name: 'HC 欧洲清关询价 - 专线（包税）',
  version: 'v1',
  sheet_name: '海客欧洲清关-专线（包税）信息表',
  field_mapping: {
    product_name: { label: '产品名称/品名', required: true, type: 'text' },
    product_image: { label: '产品图片', required: true, type: 'image' },
    hs_code: { label: 'HSCODE', required: false, type: 'text' },
    total_packages: { label: '总箱数', required: false, type: 'number' },
    cargo_type: {
      label: '货物类型',
      required: true,
      type: 'select',
      options: ['普通货', '敏感货', '危险品'],
    },
    container_type: {
      label: '柜型',
      required: true,
      type: 'select',
      options: ['20GP', '40GP', '40HQ', '40RF', '散货'],
    },
    total_gross_weight_kg: { label: '总毛重(kg)', required: false, type: 'number' },
    total_net_weight_kg: { label: '总净重(kg)', required: false, type: 'number' },
    total_volume_cbm: { label: '总体积(CBM)', required: false, type: 'number' },
    dimensions: { label: '长×宽×高（m）', required: false, type: 'text' },
    cif_value: { label: 'CIF货值', required: true, type: 'number' },
    etd_port: { label: 'ETD 起运港口', required: false, type: 'text' },
    eta_port: { label: 'ETA 目的港口', required: true, type: 'text' },
    delivery_address: { label: '派送地址 Delivery address', required: true, type: 'text' },
    bl_number: { label: '提单号 B/L NO', required: false, type: 'text' },
    container_number: { label: '集装箱号 Container NO', required: false, type: 'text' },
    shipping_company: { label: '船公司 Shipping Company', required: false, type: 'text' },
    return_container_offsite: {
      label: '还柜地址（是否异地）',
      required: false,
      type: 'select',
      options: ['是', '否'],
    },
    is_transit: {
      label: '是否中转（是否有等候费用）',
      required: false,
      type: 'select',
      options: ['是', '否'],
    },
    has_commercial_invoice: {
      label: '商业发票',
      required: false,
      type: 'select',
      options: ['已提供', '未提供'],
    },
    has_packing_list: {
      label: '装箱单',
      required: false,
      type: 'select',
      options: ['已提供', '未提供'],
    },
    other_clearance_docs: { label: '其他清关资料', required: false, type: 'text' },
    compensation_standard: { label: '赔付标准（可商量）', required: false, type: 'text' },
    special_notes: { label: '其他特殊备注', required: false, type: 'text' },
  },
};