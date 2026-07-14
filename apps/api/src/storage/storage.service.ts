/**
 * 对象存储抽象
 *
 * 阶段 1：MinIO（S3 兼容）
 * 阶段 2：可切换到阿里云 OSS / AWS S3（同一接口）
 *
 * 路径约定：{tenant_id}/{year}/{month}/{uuid}/{filename}
 * 例：a1b2c3d4.../2026/07/8f9e0d1c.../packing_list.xlsx
 *
 * 这样：① 按租户隔离 ② 按时间分片 ③ 防单目录过大
 */

import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { loadEnv } from '../config/env';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: S3Client;
  private bucket!: string;
  private publicBaseUrl: string | null = null;

  onModuleInit(): void {
    const env = loadEnv();
    this.bucket = env.OSS_BUCKET;
    this.publicBaseUrl = env.OSS_PUBLIC_BASE_URL ?? null;
    this.client = new S3Client({
      endpoint: env.OSS_ENDPOINT,
      region: env.OSS_REGION,
      credentials: {
        accessKeyId: env.OSS_ACCESS_KEY,
        secretAccessKey: env.OSS_SECRET_KEY,
      },
      forcePathStyle: env.OSS_FORCE_PATH_STYLE,
    });
    void this.ensureBucket();
  }

  /**
   * 启动时确保 bucket 存在（幂等）
   */
  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} ready`);
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} created`);
      } catch (err) {
        this.logger.warn(`Failed to ensure bucket: ${(err as Error).message}`);
      }
    }
  }

  /**
   * 上传文件
   */
  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; bucket: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, bucket: this.bucket };
  }

  /**
   * 下载文件
   */
  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = result.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * 生成对象 key
   *
   * 格式：{tenant_id}/{year}/{month}/{uuid}/{filename}
   */
  buildKey(tenantId: string, filename: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();
    return `${tenantId}/${year}/${month}/${uuid}/${filename}`;
  }

  /**
   * 拼接对外可访问的 URL
   *
   * - 优先用 OSS_PUBLIC_BASE_URL（生产 CDN）
   * - 未配置则回落：{OSS_ENDPOINT}/{bucket}/{key}（开发 MinIO）
   */
  getPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      const base = this.publicBaseUrl.replace(/\/+$/, '');
      return `${base}/${key}`;
    }
    const env = loadEnv();
    const endpoint = env.OSS_ENDPOINT.replace(/\/+$/, '');
    return `${endpoint}/${this.bucket}/${key}`;
  }
}