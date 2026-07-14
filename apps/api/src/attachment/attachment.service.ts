import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ExcelParserService } from '../excel/excel-parser.service';

export type AttachmentType =
  | 'packing_list'
  | 'commercial_invoice'
  | 'invoice_packing'
  | 'excel_template'
  | 'other';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB（Excel 含图易超 10MB）

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly excelParser: ExcelParserService,
  ) {}

  /**
   * 上传并解析附件
   */
  async upload(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    attachmentType: AttachmentType,
  ) {
    if (!file) {
      throw new BadRequestException({ code: 'NO_FILE', message: 'No file uploaded' });
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      });
    }
    if (!this.isAllowedContentType(file.mimetype, file.originalname)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `Unsupported file type: ${file.mimetype}`,
      });
    }

    // multer 默认按 latin1 解码 multipart 文件名，非 ASCII（中文）会变乱码；还原为 UTF-8
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 上传到 MinIO
    const key = this.storage.buildKey(tenantId, originalName);
    await this.storage.put(key, file.buffer, file.mimetype);

    // SHA256（防篡改 + 后续商品图片去重）
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    // 创建附件记录（解析状态 pending）
    const attachment = await this.prisma.inquiryAttachment.create({
      data: {
        tenantId,
        attachmentType,
        originalFilename: originalName,
        storageKey: key,
        storageBucket: process.env.OSS_BUCKET ?? 'haycargo-files',
        sizeBytes: BigInt(file.size),
        contentType: file.mimetype,
        sha256,
        parseStatus: 'pending',
        uploadedById: userId,
      },
    });

    // 解析
    await this.parseAttachment(attachment.id, file.buffer, file.mimetype, tenantId);

    // 写审计日志
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'attachment.upload',
        resource: 'inquiry_attachment',
        resourceId: attachment.id,
        after: {
          filename: originalName,
          size: file.size,
          type: attachmentType,
        },
      },
    });

    return this.findById(tenantId, attachment.id);
  }

  /**
   * 解析附件
   *
   * 阶段 1：同步解析所有 Excel 格式（.xls + .xlsx）
   * 阶段 2：PDF/图片 OCR
   */
  private async parseAttachment(
    id: string,
    buffer: Buffer,
    mimetype: string,
    tenantId: string,
  ): Promise<void> {
    const isExcel =
      mimetype.includes('spreadsheet') ||
      mimetype.includes('excel') ||
      /\.(xls|xlsx)$/i.test(mimetype) ||
      this.looksLikeExcel(buffer);

    if (!isExcel) {
      await this.prisma.inquiryAttachment.update({
        where: { id },
        data: {
          parseStatus: 'skipped',
          parsedData: { reason: 'Non-Excel file, OCR pending Phase 2' },
        },
      });
      return;
    }

    try {
      const parsed = await this.excelParser.parse(buffer, mimetype, tenantId);
      await this.prisma.inquiryAttachment.update({
        where: { id },
        data: {
          parseStatus: 'success',
          parsedData: parsed as object,
        },
      });
    } catch (err) {
      await this.prisma.inquiryAttachment.update({
        where: { id },
        data: {
          parseStatus: 'failed',
          parseError: (err as Error).message,
        },
      });
    }
  }

  /**
   * 通过文件头判断 Excel 类型
   */
  private looksLikeExcel(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;
    // xlsx 是 zip：PK\x03\x04
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) return true;
    // xls 是 OLE2：D0 CF 11 E0 A1 B1 1A E1
    if (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    )
      return true;
    return false;
  }

  /**
   * 查询附件（含解析结果）
   */
  async findById(tenantId: string, id: string) {
    const attachment = await this.prisma.inquiryAttachment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!attachment) {
      throw new NotFoundException({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Attachment not found or access denied',
      });
    }
    // 按前端 Attachment 接口返回 snake_case（Prisma 属性名是 camelCase，
    // 无全局转换层，必须在此显式映射，否则前端读 parsed_data/parse_status 得 undefined）
    return {
      id: attachment.id,
      attachment_type: attachment.attachmentType,
      original_filename: attachment.originalFilename,
      content_type: attachment.contentType,
      size_bytes: attachment.sizeBytes.toString(),
      parse_status: attachment.parseStatus,
      parsed_data: attachment.parsedData,
      parse_error: attachment.parseError,
      created_at: attachment.createdAt,
    };
  }

  /**
   * 关联附件到询价单
   */
  async attachToInquiry(tenantId: string, userId: string, attachmentId: string, inquiryId: string) {
    const attachment = await this.prisma.inquiryAttachment.findFirst({
      where: { id: attachmentId, tenantId, deletedAt: null },
    });
    if (!attachment) {
      throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' });
    }
    const inquiry = await this.prisma.inquiryOrder.findFirst({
      where: { id: inquiryId, tenantId, deletedAt: null },
    });
    if (!inquiry) {
      throw new NotFoundException({ code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' });
    }

    await this.prisma.inquiryAttachment.update({
      where: { id: attachmentId },
      data: { inquiryOrderId: inquiryId },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'attachment.link',
        resource: 'inquiry_attachment',
        resourceId: attachmentId,
        after: { inquiry_id: inquiryId },
      },
    });
  }

  private isAllowedContentType(mimetype: string, filename: string): boolean {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/tiff',
    ];
    if (allowed.includes(mimetype)) return true;
    // 兜底：检查扩展名
    const ext = filename.toLowerCase().split('.').pop();
    return ['xlsx', 'xls', 'pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(ext ?? '');
  }
}