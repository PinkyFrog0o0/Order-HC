/**
 * 模板配置
 *
 * 每种客户模板对应一个 TemplateConfig。
 * 阶段 1：硬编码常量
 * 阶段 2：存数据库（excel_templates 表），用户可自定义
 */

export interface TemplateFieldConfig {
  /** 模板里的原始 label（A 列文字） */
  label: string;
  /** 是否必填（按模板说明里"黄色为必填项"标记） */
  required: boolean;
  /** 字段类型（用于前端校验和展示） */
  type: 'text' | 'number' | 'select' | 'image';
  /** select 类型的可选值 */
  options?: string[];
}

export interface TemplateConfig {
  id: string;
  name: string;
  version: string;
  /** 匹配的 sheet 名 */
  sheet_name: string;
  /** 业务字段 key → 模板字段配置 */
  field_mapping: Record<string, TemplateFieldConfig>;
  /** 标题行填充色（ARGB，如 'FF0070C0'）。不填则无填充 */
  title_fill?: string;
}