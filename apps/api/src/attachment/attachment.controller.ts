import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import type { UserContext } from '@haycargo/shared';

import { TemplateGeneratorService } from '../excel/template-generator.service';
import { TemplateRegistryService } from '../excel/template-registry.service';

import { AttachmentService } from './attachment.service';

const UPLOAD_MAX_FILE_SIZE = 25 * 1024 * 1024;

@Controller('attachments')
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly templateRegistry: TemplateRegistryService,
    private readonly templateGenerator: TemplateGeneratorService,
  ) {}

  /**
   * 上传附件
   * POST /v1/attachments/upload
   * Content-Type: multipart/form-data
   * field: file, attachment_type
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_FILE_SIZE } }))
  async upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('attachment_type') attachmentType: string,
  ) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    const type = (attachmentType ?? 'other') as
      | 'packing_list'
      | 'commercial_invoice'
      | 'invoice_packing'
      | 'excel_template'
      | 'other';
    return this.attachmentService.upload(user.tenant_id, user.user_id, file, type);
  }

  /**
   * 关联到询价单
   * POST /v1/attachments/:id/attach/:inquiryId
   */
  @Post(':id/attach/:inquiryId')
  async attachToInquiry(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('inquiryId') inquiryId: string,
  ) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    await this.attachmentService.attachToInquiry(user.tenant_id, user.user_id, id, inquiryId);
    return { success: true };
  }

  /**
   * 列出所有支持的模板
   * GET /v1/attachments/templates
   *
   * 注意：必须在 @Get(':id') 之前声明，否则 /templates 会被当作 id="templates" 匹配到 findOne
   */
  @Get('templates')
  listTemplates() {
    return this.templateRegistry.list();
  }

  /**
   * 下载模板文件（现生成 .xlsx）
   * GET /v1/attachments/templates/:id/download
   *
   * 注意：必须在 @Get(':id') 之前声明（更具体的路由优先匹配）
   */
  @Get('templates/:id/download')
  async downloadTemplate(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.templateGenerator.generate(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.send(buffer);
  }

  /**
   * 查询附件（含解析结果）
   * GET /v1/attachments/:id
   */
  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserContext;
    if (!user.tenant_id) {
      throw new Error('Tenant required');
    }
    return this.attachmentService.findById(user.tenant_id, id);
  }
}