/**
 * 模板下载生成器
 *
 * 从 TemplateConfig.field_mapping 用 exceljs 现生成 .xlsx 文件。
 * 这样下载的模板与解析时依赖的模板配置是同一份代码，
 * 不会出现"下载的格式"和"识别的格式"对不上的问题。
 *
 * 生成的模板结构（与 parser 对齐）：
 *   第 1 行：A:B 合并，写模板名（标题）
 *   第 2 行：A 列写 "项目（*黄色为必填项）"（header，parser 跳过）
 *   第 3+ 行：A 列 label（必填项黄底），B 列值/说明
 *   image 行 row height 120，附带 note 提示插入图片
 *   select 行附 dataValidation 下拉
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { TemplateRegistryService } from './template-registry.service';

const HEADER_LABEL = '项目（*黄色为必填项）';
const REQUIRED_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF00' },
} as const;
const LABEL_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 14;
const IMAGE_ROW_HEIGHT = 120;
const COL_A_WIDTH = 32;
const COL_B_WIDTH = 48;

@Injectable()
export class TemplateGeneratorService {
  constructor(private readonly registry: TemplateRegistryService) {}

  async generate(templateId: string): Promise<{ filename: string; buffer: Buffer }> {
    const tpl = this.registry.findById(templateId);
    if (!tpl) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: `Template not found: ${templateId}`,
      });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Haycargo';
    wb.created = new Date();

    const ws = wb.addWorksheet(tpl.sheet_name);

    // 第 1 行：标题（A:B 合并，按模板配置可选底色）
    ws.mergeCells('A1:B1');
    const titleCell = ws.getCell('A1');
    titleCell.value = tpl.name;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { bold: true, size: TITLE_FONT_SIZE };
    if (tpl.title_fill) {
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: tpl.title_fill },
      };
      titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } };
    }
    ws.getRow(1).height = 28;

    // 第 2 行：表头（A 列写说明文字，B 列留空）
    const headerCell = ws.getCell('A2');
    headerCell.value = HEADER_LABEL;
    headerCell.font = { italic: true, size: LABEL_FONT_SIZE, color: { argb: 'FF888888' } };

    // 第 3+ 行：按 field_mapping 输出
    let r = 3;
    for (const [, cfg] of Object.entries(tpl.field_mapping)) {
      const aCell = ws.getCell(`A${r}`);
      aCell.value = cfg.label;

      if (cfg.required) {
        aCell.font = { bold: true, size: LABEL_FONT_SIZE };
      } else {
        aCell.font = { size: LABEL_FONT_SIZE };
      }

      if (cfg.required) {
        aCell.fill = REQUIRED_FILL;
      }

      const bCell = ws.getCell(`B${r}`);
      bCell.alignment = { vertical: 'middle', wrapText: true };

      if (cfg.type === 'image') {
        ws.getRow(r).height = IMAGE_ROW_HEIGHT;
        bCell.note = '请将产品图片插入此单元格';
      } else if (cfg.type === 'select' && cfg.options && cfg.options.length > 0) {
        bCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${cfg.options.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: '无效选项',
          error: '请从下拉列表中选择',
        };
      }

      r++;
    }

    ws.getColumn(1).width = COL_A_WIDTH;
    ws.getColumn(2).width = COL_B_WIDTH;

    const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
    return {
      filename: `${tpl.id}.xlsx`,
      buffer: buf,
    };
  }
}