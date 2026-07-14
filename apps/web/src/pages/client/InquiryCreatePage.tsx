import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  App as AntdApp,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Attachment,
  ParsedImageRef,
  TemplateConfig,
  downloadTemplate,
  getAttachment,
  listTemplates,
  uploadAttachment,
} from '../../lib/attachments';
import { CreateInquiryInput, createInquiry, submitInquiry } from '../../lib/inquiries';

const { Step } = Steps;

const TYPE_LABELS: Record<string, string> = {
  text: '文本',
  number: '数字',
  select: '选择',
  image: '图片',
};

interface FormState {
  // 客户输入的原始字段（来自 Excel 解析）
  parsed: Record<string, unknown>;
  // 业务必填字段（手动补全）
  trade_type: 'import' | 'export';
  incoterm: string;
  origin_country: string;
  destination_country: string;
  currency: string;
  notes?: string;
  // 附件
  excelAttachmentId: string | null;
  docBundleId: string | null;
}

const DEFAULT_FORM: FormState = {
  parsed: {},
  trade_type: 'import',
  incoterm: 'FOB',
  origin_country: 'CHN',
  destination_country: 'DEU',
  currency: 'EUR',
  excelAttachmentId: null,
  docBundleId: null,
};

export function InquiryCreatePage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [current, setCurrent] = useState(0);
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [excelAttachment, setExcelAttachment] = useState<Attachment | null>(null);
  const [docBundle, setDocBundle] = useState<Attachment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => {
        // 显式暴露：模板拉不到通常是后端 /api/attachments/templates 报错或鉴权失败
        // eslint-disable-next-line no-console
        console.error('[InquiryCreate] listTemplates failed:', err);
        message.error(`模板列表加载失败: ${err?.message ?? '未知错误'}`);
      });
  }, []);

  const updateField = (key: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const result = await uploadAttachment(file, 'excel_template');
      setExcelAttachment(result);
      let final = result;
      if (result.parse_status === 'pending') {
        final = await pollUntilParsed(result.id);
        setExcelAttachment(final);
      }
      if (final.parse_status === 'success' && final.parsed_data) {
        // 把解析的字段灌进 form.parsed
        const parsed: Record<string, unknown> = {};
        for (const [key, f] of Object.entries(final.parsed_data.fields ?? {})) {
          parsed[key] = f.value;
        }
        // 智能推断 trade_type / incoterm / currency
        const etd = String(parsed.etd_port ?? '').toUpperCase();
        const eta = String(parsed.eta_port ?? '').toUpperCase();
        const inferred = { ...DEFAULT_FORM, parsed };
        if (etd && eta) {
          // 简单规则：中国港口 → 出口
          if (etd.includes('SHANGHAI') || etd.includes('NINGBO') || etd.includes('SHENZHEN')) {
            inferred.trade_type = 'export';
          } else if (eta.includes('SHANGHAI') || eta.includes('NINGBO')) {
            inferred.trade_type = 'import';
          }
        }
        setForm(inferred);
        message.success(`已识别模板: ${final.parsed_data.template_name ?? '未知'}`);
      }
    } catch (err) {
      const e = err as { message?: string };
      message.error(`上传失败: ${e.message ?? '未知错误'}`);
    }
  };

  const handleDocUpload = async (file: File) => {
    try {
      const result = await uploadAttachment(file, 'invoice_packing');
      let final = result;
      if (result.parse_status === 'pending') {
        final = await pollUntilParsed(result.id);
      }
      setDocBundle(final);
      updateField('docBundleId', final.id);
      message.success('商业发票&装箱单 上传成功');
    } catch (err) {
      const e = err as { message?: string };
      message.error(`上传失败: ${e.message ?? '未知错误'}`);
    }
  };

  const buildPayload = (): CreateInquiryInput | null => {
    const parsedStr = (key: string, fallback = ''): string => {
      const v = form.parsed[key];
      return v !== null && v !== undefined && v !== '' ? String(v) : fallback;
    };
    const parsedNum = (key: string, fallback = 0): number => {
      const v = form.parsed[key];
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
      return Number.isFinite(n) ? n : fallback;
    };

    const etdPort = parsedStr('etd_port');
    const etaPort = parsedStr('eta_port');
    if (!etaPort) {
      message.error('缺少目的港');
      return null;
    }

    const customerCode = localStorage.getItem('haycargo:user')
      ? JSON.parse(localStorage.getItem('haycargo:user')!).tenant_code ?? 'UNKNOWN'
      : 'UNKNOWN';

    const attachmentIds: string[] = [];
    if (form.excelAttachmentId) attachmentIds.push(form.excelAttachmentId);
    if (form.docBundleId) attachmentIds.push(form.docBundleId);

    return {
      customer_code: customerCode,
      trade_type: form.trade_type,
      incoterm: form.incoterm as CreateInquiryInput['incoterm'],
      origin_country: form.origin_country,
      destination_country: form.destination_country,
      origin_port: etdPort,
      destination_port: etaPort,
      total_gross_weight_kg: parsedNum('total_gross_weight_kg'),
      total_net_weight_kg: parsedNum('total_net_weight_kg'),
      total_packages: parseInt(parsedStr('total_packages', '0'), 10) || parsedNum('total_packages'),
      total_value: parsedNum('cargo_value') || parsedNum('cif_value'),
      currency: form.currency,
      notes: [
        parsedStr('product_name') && `品名: ${parsedStr('product_name')}`,
        parsedStr('hs_code') && `HS Code: ${parsedStr('hs_code')}`,
        parsedStr('container_type') && `柜型: ${parsedStr('container_type')}`,
        parsedStr('bl_number') && `提单号: ${parsedStr('bl_number')}`,
        parsedStr('container_number') && `集装箱号: ${parsedStr('container_number')}`,
        parsedStr('shipping_company') && `船公司: ${parsedStr('shipping_company')}`,
        parsedStr('delivery_address') && `派送: ${parsedStr('delivery_address')}`,
        form.notes,
      ]
        .filter(Boolean)
        .join('\n') || undefined,
      attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
    const payload = buildPayload();
    if (!payload) return;

    setSubmitting(true);
    try {
      const order = await createInquiry(payload);
      if (!asDraft) {
        await submitInquiry(order.id);
        message.success('询价单已提交，等待管理端报价');
      } else {
        message.success(`草稿已保存：${order.business_number}`);
      }
      navigate(`/client/inquiries/${order.id}`);
    } catch (err) {
      const e = err as { message?: string };
      message.error(`提交失败: ${e.message ?? '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Typography.Title level={3}>创建询价单</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">支持的模板：</Typography.Text>{' '}
        {templates.map((t) => (
          <Tag color="blue" key={t.id}>
            {t.name}
          </Tag>
        ))}
      </Card>
      <Card>
        <Steps current={current} onChange={setCurrent} style={{ marginBottom: 32 }}>
          <Step title="上传询价表" />
          <Step title="确认字段" />
          <Step title="上传单证" />
          <Step title="确认提交" />
        </Steps>

        {current === 0 && (
          <Step1Upload
            attachment={excelAttachment}
            templates={templates}
            onUpload={handleExcelUpload}
            onDownload={downloadTemplate}
            onNext={() => setCurrent(1)}
          />
        )}

        {current === 1 && (
          <Step2Confirm
            form={form}
            setForm={setForm}
            templates={templates}
            excelAttachment={excelAttachment}
            onPrev={() => setCurrent(0)}
            onNext={() => setCurrent(2)}
          />
        )}

        {current === 2 && (
          <Step3Documents
            docBundle={docBundle}
            onUpload={handleDocUpload}
            onPrev={() => setCurrent(1)}
            onNext={() => setCurrent(3)}
          />
        )}

        {current === 3 && (
          <Step4Confirm
            form={form}
            excelAttachment={excelAttachment}
            docBundle={docBundle}
            submitting={submitting}
            onPrev={() => setCurrent(2)}
            onSubmit={handleSubmit}
          />
        )}
      </Card>
    </>
  );
}

// ============= Step 1 =============
function Step1Upload({
  attachment,
  templates,
  onUpload,
  onDownload,
  onNext,
}: {
  attachment: Attachment | null;
  templates: TemplateConfig[];
  onUpload: (file: File) => Promise<void>;
  onDownload: (id: string, name?: string) => Promise<void>;
  onNext: () => void;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {templates.length > 0 ? (
        <Card size="small" title="下载询价模板">
          <Space wrap>
            {templates.map((t) => (
              <Button
                key={t.id}
                icon={<DownloadOutlined />}
                onClick={() => void onDownload(t.id, t.name)}
              >
                {t.name}
              </Button>
            ))}
          </Space>
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            提示：先下载模板，按格式填写后再上传。黄色单元格为必填项；产品图片请插入"产品图片"行。
          </div>
        </Card>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="暂无可下载模板"
          description="后端未返回模板列表。请确认 API 服务可访问（/api/attachments/templates），或联系管理员配置模板。"
        />
      )}

      <Upload.Dragger
        accept=".xls,.xlsx"
        beforeUpload={(file) => {
          void onUpload(file);
          return false;
        }}
        showUploadList={false}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域上传</p>
        <p className="ant-upload-hint">支持 .xls / .xlsx，文件不超过 25MB（推荐使用 .xlsx 以支持产品图片）</p>
      </Upload.Dragger>

      {attachment?.parsed_data && (
        <Alert
          type={
            attachment.parsed_data.template_id
              ? 'success'
              : 'warning'
          }
          showIcon
          message={
            attachment.parsed_data.template_id
              ? `已识别模板: ${attachment.parsed_data.template_name}`
              : '未识别到已知模板，将作为通用附件处理'
          }
        />
      )}

      <div style={{ textAlign: 'right' }}>
        <Button type="primary" disabled={!attachment} onClick={onNext}>
          下一步
        </Button>
      </div>
    </Space>
  );
}

// ============= Step 2 =============
function Step2Confirm({
  form,
  setForm,
  templates,
  excelAttachment,
  onPrev,
  onNext,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  templates: TemplateConfig[];
  excelAttachment: Attachment | null;
  onPrev: () => void;
  onNext: () => void;
}) {
  // 找到当前模板的字段配置
  const matchedTemplate = useMemo(() => {
    if (!excelAttachment?.parsed_data?.template_id) return null;
    return templates.find((t) => t.id === excelAttachment.parsed_data!.template_id) ?? null;
  }, [excelAttachment, templates]);

  if (!matchedTemplate) {
    return (
      <Empty description="未识别模板，请返回上传正确格式的询价表" />
    );
  }

  const updateParsed = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, parsed: { ...prev.parsed, [key]: value } }));
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card size="small" title="模板字段（来自 Excel）">
        <Row gutter={[16, 12]}>
          {Object.entries(matchedTemplate.field_mapping).map(([key, cfg]) => {
            const excelVal = excelAttachment?.parsed_data?.fields?.[key]?.value;
            const currentVal = form.parsed[key] ?? excelVal ?? '';
            const isRequired = cfg.required;

            return (
              <Col span={12} key={key}>
                <Form.Item
                  label={
                    <span>
                      {cfg.label}
                      {isRequired && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
                      <Tag style={{ marginLeft: 4 }}>{TYPE_LABELS[cfg.type]}</Tag>
                    </span>
                  }
                  style={{ marginBottom: 0 }}
                >
                  {cfg.type === 'select' && cfg.options ? (
                    <Select
                      value={String(currentVal ?? '') || undefined}
                      options={cfg.options.map((o) => ({ value: o, label: o }))}
                      onChange={(v) => updateParsed(key, v)}
                      placeholder="请选择"
                      allowClear
                    />
                  ) : cfg.type === 'number' ? (
                    <InputNumber
                      value={currentVal !== null && currentVal !== undefined ? Number(currentVal) : null}
                      onChange={(v) => updateParsed(key, v ?? null)}
                      style={{ width: '100%' }}
                    />
                  ) : cfg.type === 'image' ? (
                    Array.isArray(currentVal) && currentVal.length > 0 ? (
                      <Image.PreviewGroup>
                        <Space wrap>
                          {(currentVal as ParsedImageRef[]).map((img, idx) => (
                            <Image
                              key={`${img.storage_key}-${idx}`}
                              src={img.url}
                              width={80}
                              height={80}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                              fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='%23f0f0f0'/><text x='50%' y='50%' font-size='12' text-anchor='middle' fill='%23999' dy='.3em'>加载失败</text></svg>"
                            />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    ) : (
                      <Input
                        value=""
                        disabled
                        placeholder="未识别到图片（仅 .xlsx 支持，请确认模板已插入图片）"
                      />
                    )
                  ) : (
                    <Input
                      value={String(currentVal ?? '')}
                      onChange={(e) => updateParsed(key, e.target.value)}
                    />
                  )}
                </Form.Item>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card size="small" title="业务必填字段（系统要求）">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="贸易类型" required style={{ marginBottom: 12 }}>
              <Select
                value={form.trade_type}
                options={[
                  { value: 'import', label: '进口' },
                  { value: 'export', label: '出口' },
                ]}
                onChange={(v) => setForm((p) => ({ ...p, trade_type: v }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="贸易条款 (Incoterm)" required style={{ marginBottom: 12 }}>
              <Select
                value={form.incoterm}
                options={['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA'].map((v) => ({ value: v, label: v }))}
                onChange={(v) => setForm((p) => ({ ...p, incoterm: v }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="原产国 (ISO 3)" required style={{ marginBottom: 12 }}>
              <Input
                value={form.origin_country}
                onChange={(e) =>
                  setForm((p) => ({ ...p, origin_country: e.target.value.toUpperCase().slice(0, 3) }))
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="目的国 (ISO 3)" required style={{ marginBottom: 12 }}>
              <Input
                value={form.destination_country}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    destination_country: e.target.value.toUpperCase().slice(0, 3),
                  }))
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="币种" required style={{ marginBottom: 12 }}>
              <Select
                value={form.currency}
                options={['CNY', 'USD', 'EUR', 'GBP', 'JPY'].map((v) => ({ value: v, label: v }))}
                onChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="备注" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={3}
                value={form.notes ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev}>上一步</Button>
          <Button type="primary" onClick={onNext}>
            下一步
          </Button>
        </Space>
      </div>
    </Space>
  );
}

// ============= Step 3 =============
function Step3Documents({
  docBundle,
  onUpload,
  onPrev,
  onNext,
}: {
  docBundle: Attachment | null;
  onUpload: (file: File) => Promise<void>;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="商业发票 & 装箱单" size="small">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Button
              icon={<DownloadOutlined />}
              href="/templates/invoice-packing-template.xlsx"
              download="HC欧洲清关装箱单&发票模板.xlsx"
            >
              下载模板
            </Button>
            <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
              一个文件含两个 Sheet：发票（INVOICE）、装箱单（PACKING LIST）
            </span>
          </div>

          <Upload.Dragger
            accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,.tif"
            beforeUpload={(file) => {
              void onUpload(file);
              return false;
            }}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined />
            </p>
            <p>点击或拖拽上传「商业发票 &amp; 装箱单」</p>
            <p style={{ fontSize: 12, color: '#999' }}>
              PDF / Excel / 图片，可将发票与装箱单合并为一个文件
            </p>
          </Upload.Dragger>

          {docBundle && (
            <Alert
              type="success"
              showIcon
              message={docBundle.original_filename}
              description={`大小: ${(parseInt(docBundle.size_bytes) / 1024).toFixed(1)} KB`}
            />
          )}
        </Space>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev}>上一步</Button>
          <Button type="primary" onClick={onNext}>
            下一步
          </Button>
        </Space>
      </div>
    </Space>
  );
}

// ============= Step 4 =============
function Step4Confirm({
  form,
  excelAttachment,
  docBundle,
  submitting,
  onPrev,
  onSubmit,
}: {
  form: FormState;
  excelAttachment: Attachment | null;
  docBundle: Attachment | null;
  submitting: boolean;
  onPrev: () => void;
  onSubmit: (asDraft: boolean) => Promise<void>;
}) {
  const docs = [
    { name: '询价表', attachment: excelAttachment },
    { name: '商业发票&装箱单', attachment: docBundle },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card size="small" title="提交预览">
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="贸易类型">
            {form.trade_type === 'import' ? '进口' : '出口'}
          </Descriptions.Item>
          <Descriptions.Item label="Incoterm">{form.incoterm}</Descriptions.Item>
          <Descriptions.Item label="原产国">{form.origin_country}</Descriptions.Item>
          <Descriptions.Item label="目的国">{form.destination_country}</Descriptions.Item>
          <Descriptions.Item label="起运港">{String(form.parsed.etd_port ?? '')}</Descriptions.Item>
          <Descriptions.Item label="目的港">{String(form.parsed.eta_port ?? '')}</Descriptions.Item>
          <Descriptions.Item label="总毛重 (kg)">
            {String(form.parsed.total_gross_weight_kg ?? '')}
          </Descriptions.Item>
          <Descriptions.Item label="总净重 (kg)">
            {String(form.parsed.total_net_weight_kg ?? '')}
          </Descriptions.Item>
          <Descriptions.Item label="件数">{String(form.parsed.total_packages ?? '')}</Descriptions.Item>
          <Descriptions.Item label="货值">
            {form.currency} {String(form.parsed.cargo_value ?? form.parsed.cif_value ?? '')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="附件清单">
        <Table
          size="small"
          pagination={false}
          rowKey={(_, idx) => String(idx)}
          dataSource={docs}
          columns={[
            { title: '文档类型', dataIndex: 'name', width: 120 },
            {
              title: '文件名',
              dataIndex: ['attachment', 'original_filename'],
              render: (v: string | undefined) => v ?? <Tag color="default">未上传</Tag>,
            },
            {
              title: '解析状态',
              width: 120,
              render: (_, r) => {
                const s = r.attachment?.parse_status;
                if (!s) return '-';
                const map: Record<string, { color: string; text: string }> = {
                  pending: { color: 'blue', text: '解析中' },
                  success: { color: 'green', text: '成功' },
                  failed: { color: 'red', text: '失败' },
                  skipped: { color: 'default', text: '跳过' },
                };
                const cfg = map[s];
                return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : s;
              },
            },
          ]}
        />
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev} disabled={submitting}>
            上一步
          </Button>
          <Button onClick={() => onSubmit(true)} loading={submitting}>
            保存草稿
          </Button>
          <Button type="primary" onClick={() => onSubmit(false)} loading={submitting}>
            提交询价
          </Button>
        </Space>
      </div>
    </Space>
  );
}

async function pollUntilParsed(id: string, maxAttempts = 10): Promise<Attachment> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const result = await getAttachment(id);
    if (result.parse_status !== 'pending') {
      return result;
    }
  }
  return getAttachment(id);
}