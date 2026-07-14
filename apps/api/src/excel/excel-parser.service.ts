/**
 * Excel 解析器
 *
 * 支持格式：.xls (OLE2) 和 .xlsx (OOXML)
 * - .xls：用 SheetJS xlsx 解析（不支持图片，老模板兼容）
 * - .xlsx：用 exceljs 解析（支持内嵌图片提取）
 *
 * 解析策略：基于"模板配置"
 * - 每种客户模板对应一个 TemplateConfig
 * - 配置里指定 sheet 名 + 字段位置 + 字段映射
 * - 解析时按配置提取字段值，返回结构化数据
 * - 对于 type: 'image' 的字段，从 .xlsx 内嵌图片中提取并上传到 OSS，
 *   把 { storage_key, url, mime_type, sha256 } 列表写入 fields[key].value
 *
 * 模板 1：HC 询价模板（自税）— Sheet "海客欧洲清关-自税信息表"
 * 模板 2：HC 询价模板（包税专线）— Sheet "海客欧洲清关-专线（包税）信息表"
 *
 * 未来扩展：模板配置存数据库（excel_templates 表），用户可自定义。
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

import { StorageService } from '../storage/storage.service';
import { TemplateRegistryService } from './template-registry.service';

export interface ParsedAttachment {
  /** 模板标识，未识别则 null */
  template_id: string | null;
  template_name: string | null;
  /** Sheet 名 */
  sheet_name: string;
  /** 提取的业务字段（K-V） */
  fields: Record<string, { label: string; value: unknown }>;
  /** 未匹配的原始数据（兜底） */
  raw_fields: Array<{ label: string; value: unknown }>;
  /** 图片归档（PR2 商品管理去重使用） */
  images: Array<{
    storage_key: string;
    url: string;
    mime_type: string;
    sha256: string;
    field_key: string;
    width?: number;
    height?: number;
  }>;
}

/**
 * 图片字段的值类型（落到 parsed_data.fields.<key>.value）
 */
export interface ParsedImageRef {
  storage_key: string;
  url: string;
  mime_type: string;
  sha256: string;
  width?: number;
  height?: number;
}

@Injectable()
export class ExcelParserService {
  private readonly logger = new Logger(ExcelParserService.name);

  constructor(
    private readonly templateRegistry: TemplateRegistryService,
    private readonly storage: StorageService,
  ) {}

  async parse(
    buffer: Buffer,
    mimetype: string,
    tenantId: string,
  ): Promise<ParsedAttachment> {
    const isLegacyXls = this.isLegacyXls(buffer, mimetype);

    if (isLegacyXls) {
      return this.parseWithXlsx(buffer);
    }
    return this.parseWithExceljs(buffer, tenantId);
  }

  /**
   * 判断是否 legacy .xls（OLE2 格式）
   */
  private isLegacyXls(buffer: Buffer, mimetype: string): boolean {
    if (mimetype.includes('vnd.ms-excel')) return true;
    // OLE2 文件头：D0 CF 11 E0 A1 B1 1A E1
    if (
      buffer.length >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      return true;
    }
    return false;
  }

  // ============================================================
  // .xls 路径（无图片，老模板兼容）
  // ============================================================
  private parseWithXlsx(buffer: Buffer): ParsedAttachment {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }
    const sheet = workbook.Sheets[sheetName];

    const template = this.templateRegistry.findBySheetName(sheetName);
    const rawRows = this.extractKvRows(sheet);

    if (!template) {
      this.logger.warn(`Unknown template sheet: "${sheetName}"`);
      return {
        template_id: null,
        template_name: null,
        sheet_name: sheetName,
        fields: {},
        raw_fields: rawRows,
        images: [],
      };
    }

    const fields: Record<string, { label: string; value: unknown }> = {};
    const matchedLabels = new Set<string>();

    for (const [fieldKey, fieldConfig] of Object.entries(template.field_mapping)) {
      const label = fieldConfig.label;
      const row = rawRows.find((r) => r.label === label);
      if (row) {
        fields[fieldKey] = { label: row.label, value: row.value };
        matchedLabels.add(label);
      } else {
        fields[fieldKey] = { label, value: null };
      }
    }

    return {
      template_id: template.id,
      template_name: template.name,
      sheet_name: sheetName,
      fields,
      raw_fields: rawRows.filter((r) => !matchedLabels.has(r.label)),
      images: [],
    };
  }

  // ============================================================
  // .xlsx 路径（exceljs，支持图片）
  // ============================================================
  private async parseWithExceljs(
    buffer: Buffer,
    tenantId: string,
  ): Promise<ParsedAttachment> {
    const wb = new ExcelJS.Workbook();
    // exceljs 类型声明里 getImage 接受 number 但 getImages 返回 string ID；
    // @types/node 新版 Buffer 严格化也导致 load() 类型不匹配。运行时 OK。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);

    const sheetName = wb.worksheets[0]?.name;
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }
    const ws = wb.getWorksheet(sheetName);
    if (!ws) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const template = this.templateRegistry.findBySheetName(sheetName);

    if (!template) {
      this.logger.warn(`Unknown template sheet: "${sheetName}"`);
      return {
        template_id: null,
        template_name: null,
        sheet_name: sheetName,
        fields: {},
        raw_fields: this.extractKvRowsExceljs(ws),
        images: [],
      };
    }

    // 计算每个 image 字段的行号（与 TemplateGeneratorService 的输出对齐：
    //   row 1 = 标题合并行，row 2 = header "项目（*黄色为必填项）"，
    //   row 3+ 按 field_mapping 顺序）
    const imageFieldRows: Array<{ key: string; row: number }> = [];
    let currentRow = 3;
    for (const [key, cfg] of Object.entries(template.field_mapping)) {
      if (cfg.type === 'image') {
        imageFieldRows.push({ key, row: currentRow });
      }
      currentRow++;
    }

    // 提取并上传图片
    const imageMeta = ws.getImages?.() ?? [];
    const images: ParsedAttachment['images'] = [];
    const fieldImages: Record<string, ParsedImageRef[]> = {};

    for (const { key, row } of imageFieldRows) {
      for (const img of imageMeta) {
        const topRow = Math.floor(img.range.tl.row) + 1;
        if (topRow !== row) continue;

        const media = wb.getImage(img.imageId as unknown as number);
        if (!media || !media.buffer) continue;

        const ext = (media.extension || 'png').toLowerCase();
        const mimeType = mimeFromExt(ext);
        const imgBuffer: Buffer = media.buffer as unknown as Buffer;
        const sha256 = createHash('sha256').update(imgBuffer).digest('hex');
        const filename = `${key}_${sha256.slice(0, 8)}.${ext}`;
        const storageKey = this.storage.buildKey(tenantId, filename);

        try {
          await this.storage.put(storageKey, imgBuffer, mimeType);
        } catch (err) {
          this.logger.error(
            `Failed to upload image for field ${key}: ${(err as Error).message}`,
          );
          continue;
        }

        const ref: ParsedImageRef = {
          storage_key: storageKey,
          url: this.storage.getPublicUrl(storageKey),
          mime_type: mimeType,
          sha256,
        };
        fieldImages[key] = fieldImages[key] ?? [];
        fieldImages[key].push(ref);
        images.push({ ...ref, field_key: key });
      }
    }

    // 文本/数字字段：复用 K-V 提取逻辑
    const fields: Record<string, { label: string; value: unknown }> = {};
    const matchedLabels = new Set<string>();
    const rawRows = this.extractKvRowsExceljs(ws);

    for (const [fieldKey, fieldConfig] of Object.entries(template.field_mapping)) {
      const label = fieldConfig.label;
      if (fieldConfig.type === 'image') {
        // 图片字段从上面提取的 images 拿
        const refs = fieldImages[fieldKey] ?? [];
        fields[fieldKey] = {
          label,
          value: refs.length > 0 ? refs : null,
        };
        matchedLabels.add(label);
        continue;
      }
      const row = rawRows.find((r) => r.label === label);
      if (row) {
        fields[fieldKey] = { label: row.label, value: row.value };
        matchedLabels.add(label);
      } else {
        fields[fieldKey] = { label, value: null };
      }
    }

    return {
      template_id: template.id,
      template_name: template.name,
      sheet_name: sheetName,
      fields,
      raw_fields: rawRows.filter((r) => !matchedLabels.has(r.label)),
      images,
    };
  }

  /**
   * 用 exceljs 提取 A-B 列 K-V（与 xlsx 版本逻辑对齐）
   */
  private extractKvRowsExceljs(
    ws: ExcelJS.Worksheet,
  ): Array<{ label: string; value: unknown }> {
    const rows: Array<{ label: string; value: unknown }> = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 200) return; // 兜底，避免异常文件无限循环
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(2);

      const label =
        labelCell.value !== null && labelCell.value !== undefined
          ? String(stripCellValue(labelCell.value)).trim()
          : '';
      const value =
        valueCell.value !== null && valueCell.value !== undefined
          ? stripCellValue(valueCell.value)
          : null;

      if (!label && (value === null || value === '')) return;
      if (label === '项目（*黄色为必填项）' || label === '项目') return;
      if (label.startsWith('说明')) return;
      // 跳过合并标题行（A:B 合并 + label 为空）
      const isMergedTitle =
        row.getCell(1).isMerged &&
        row.getCell(1).master?.address === row.getCell(1).address &&
        row.getCell(2).isMerged;
      if (isMergedTitle && !label) return;

      rows.push({ label, value });
    });
    return rows;
  }

  /**
   * xlsx 版本的 K-V 提取（保留 .xls 兼容）
   */
  private extractKvRows(sheet: XLSX.WorkSheet): Array<{ label: string; value: unknown }> {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rows: Array<{ label: string; value: unknown }> = [];

    for (let r = 0; r <= range.e.r; r++) {
      const labelAddr = XLSX.utils.encode_cell({ r, c: 0 });
      const valueAddr = XLSX.utils.encode_cell({ r, c: 1 });
      const labelCell = sheet[labelAddr];
      const valueCell = sheet[valueAddr];

      const label = labelCell?.v !== undefined ? String(labelCell.v).trim() : '';
      const value = valueCell?.v !== undefined ? valueCell.v : null;

      if (!label && (value === null || value === '')) continue;
      if (label === '项目（*黄色为必填项）' || label === '项目') continue;
      if (label.startsWith('说明')) continue;

      const merged = (sheet['!merges'] || []).find(
        (m) => m.s.r === r && m.s.c === 0 && m.e.c >= 1,
      );
      if (merged && !label) continue;

      rows.push({ label, value });
    }
    return rows;
  }
}

function stripCellValue(v: unknown): unknown {
  // exceljs 文本/数字单元格：value 直接是原始值
  // 富文本：{ richText: [{ text }] }
  // 公式：{ formula, result }
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>)
        .map((p) => p.text ?? '')
        .join('');
    }
    if ('result' in obj && obj.result !== undefined) return obj.result;
    if ('text' in obj && typeof obj.text === 'string') return obj.text;
  }
  return v;
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    webp: 'image/webp',
  };
  return map[ext] ?? 'application/octet-stream';
}