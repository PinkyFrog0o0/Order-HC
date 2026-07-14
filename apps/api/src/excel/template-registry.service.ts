/**
 * 模板注册中心
 *
 * 阶段 1：硬编码常量
 * 阶段 2：从数据库 excel_templates 表读取
 */

import { Injectable } from '@nestjs/common';

import { TemplateConfig } from './template-config';
import { HC_DEDICATED_LINE_TEMPLATE, HC_SELF_TAXED_TEMPLATE } from './template-configs.constants';

@Injectable()
export class TemplateRegistryService {
  private readonly templates: TemplateConfig[] = [
    HC_SELF_TAXED_TEMPLATE,
    HC_DEDICATED_LINE_TEMPLATE,
  ];

  /**
   * 按 sheet 名查找模板
   */
  findBySheetName(sheetName: string): TemplateConfig | null {
    return this.templates.find((t) => t.sheet_name === sheetName) ?? null;
  }

  /**
   * 按 ID 查找
   */
  findById(id: string): TemplateConfig | null {
    return this.templates.find((t) => t.id === id) ?? null;
  }

  /**
   * 列出所有模板（管理端用）
   */
  list(): TemplateConfig[] {
    return [...this.templates];
  }
}