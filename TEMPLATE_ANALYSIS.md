# 📊 模板结构分析 & 字段映射设计

## 一、两个模板的真实结构

### 模板 1：`HC欧洲清关装箱单&发票模板.xlsx` ✅ 可解析

**结构**：双 Sheet

#### Sheet "INVOICE"（商业发票）

- **前 18 行**：表头信息（公司名、出口商、进口商、地址、VAT/EORI、币种、交货条款等）
- **第 19 行**：商品明细的**列表头**
  | 列 | 表头（中英） |
  |----|------------|
  | A | Article NO. / T1 ITEM NO.（行号） |
  | B | Description of Goods（英文描述） |
  | C | HS Code |
  | D | Unit Price |
  | E | Description of Chinese（中文描述） |
  | F | Material（材质） |
  | G | Mark（箱唛） |
  | H | Quantity（产品件数） |
  | I | Total Value |
  | J | Total Net Weight kg |
  | K | Total Gross Weight kg |
  | L | Sales Link（销售链接，PDF 输出隐藏） |
- **第 20 行起**：商品明细数据
- **合并单元格**：公司名行/标题行横跨整行
- **跨 sheet 公式**：PACKING LIST 用 `=INVOICE!A20` 等引用

#### Sheet "PACKING LIST"（装箱单）

- **前 4 行**：表头 + 公司名（公式引用 INVOICE）
- **第 5 行**：列表头
  | 列 | 表头 |
  |----|------|
  | A | Article NO. |
  | B | Description of Goods |
  | C | Unit Price |
  | D | Description of Chinese |
  | E | Mark |
  | F | Unit Weight（单品净重） |
  | G | Carton No.（箱数） |
  | H | Quantity |
  | I | Total Net Weight kg |
  | J | Total Gross Weight kg |
- **第 6 行起**：数据（也是公式引用 INVOICE 的 R20-R35）
- **R22**：汇总行（SUM）

### 模板 2：`HC欧洲清关询价模板.xls` ⚠️ 解析失败

- 扩展名是 `.xls`（老格式 OLE2），ExcelJS **不支持**
- ExcelJS 只支持 `.xlsx`（OOXML）
- **两种解法**：
  - **A**：加 `xlsx` (SheetJS) 库，它两种都支持
  - **B**：让用户先在 Excel 里"另存为 .xlsx"再上传

## 二、和我之前假设的差异

| 之前假设 | 实际情况 | 影响 |
|---------|---------|------|
| 单 sheet | **双 sheet**（INVOICE + PACKING LIST） | 必须按 sheet 名分别解析 |
| 第一行是表头 | 表头在 **第 19 行**（前面 18 行是公司/客户信息） | 需要**表头行偏移**配置 |
| 只有商品明细 | 含完整的客户/订单抬头信息（发票号、日期、币种、Incoterm、VAT/EORI...） | 需要新增"订单抬头"字段映射 |
| 数据从第二行 | INVOICE 数据从**第 20 行** | 同上 |
| 没有合并单元格 | 有（公司名/标题横跨多列） | 解析时不能按列索引推断，需按合并区域 |
| 没有公式 | 大量跨 sheet 公式 `=INVOICE!A20` | 必须解析时取**计算结果**而不是公式本身 |

## 三、字段映射规则设计（提议）

### 概念

**模板 = 客户填写规范的具象化**。每种客户可能用不同模板，所以我们需要：

```
TemplateConfig {
  name: "HC 欧洲清关 INVOICE 模板"
  version: "v1"
  sheet_name: "INVOICE"
  header_row: 19                    // 表头所在行
  data_start_row: 20                // 数据起始行
  total_row: 22                     // 汇总行（如有）
  
  // 列名 → 业务字段 的映射
  column_mapping: {
    "Article NO.": "line_number",
    "Description of Goods": "description",
    "HS Code": "hs_code",
    "Unit Price": "unit_price",
    "Quantity": "quantity",
    ...
  }
  
  // 表头之前的信息字段映射（按行号 + 列号）
  header_fields: {
    "invoice_no": { row: 4, col: 8 },        // Invoice No.
    "invoice_date": { row: 5, col: 8 },       // Invoice Date
    "consignor_name": { row: 4, col: 1 },    // 出口商名称
    "consignee_name": { row: 11, col: 1 },   // 进口商名称
    "consignee_vat": { row: 11, col: 8 },    // 增值税号
    "consignee_eori": { row: 12, col: 8 },   // EORI 号
    "currency": { row: 13, col: 8 },         // 币种
    "delivery_terms": { row: 14, col: 8 },   // 交货条款（Incoterm）
    "delivery_place": { row: 15, col: 8 },   // 交货地点
    "procedure": { row: 16, col: 8 },        // 递延
    "country_of_origin": { row: 17, col: 8 },// 原产国
  }
}
```

### 阶段规划

**阶段 2.1（必须做）**：
- 修 `ExcelParserService`：支持 `sheet_name`、`header_row` 参数
- 把"模板配置"作为硬编码常量（先支持这一个模板）
- 用户上传时按 sheet 名识别 → 自动套对应配置

**阶段 2.2（必须做）**：
- 加 `xlsx` (SheetJS) 库，支持 `.xls` 上传
- 或者前端明确告诉用户"请另存为 .xlsx"——倾向 A，一劳永逸

**阶段 2.3（建议）**：
- 模板配置存数据库（`excel_templates` 表）
- 用户可上传新模板 + 字段映射 → 系统记住
- 同一个客户不同次的模板自动套用历史配置

**阶段 2.4（可选）**：
- Web 端字段映射 UI：用户上传后看到自动推断 → 可手动调整 → 保存为模板配置

## 四、需要你明天回答的问题

按 Karpathy 准则 #1（Think Before Coding），以下决策必须你拍板，我不擅自决定：

### Q1：字段映射的存储位置
- **A**：硬编码在代码里（最快，1 个模板就够）
- **B**：存数据库 `excel_templates` 表（灵活，支持客户自定义）
- 建议 **B**，因为你说"清提派系统"是要给多个货主用的

### Q2：表头之前的信息（发票号、日期、VAT 等）要不要解析？
- **A**：要 — 这是询价的关键信息（不然询价单要手动填一大堆）
- **B**：不要 — 让用户手动填
- 建议 **A**

### Q3：双 sheet 都解析还是只解析 INVOICE？
- 装箱单和发票数据大部分重叠（都引用 INVOICE）
- **A**：只解析 INVOICE，PACKING LIST 作为附件存
- **B**：两个都解析，交叉校验
- 建议 **A**（MVP 阶段），后期加交叉校验

### Q4：`.xls` 老格式要不要支持？
- **A**：加 SheetJS 库，两种都支持（+200KB）
- **B**：用户必须另存为 .xlsx
- 建议 **A**（你已经在用了，不能要求客户改格式）

### Q5：模板版本管理？
- 同一个模板客户可能升级
- **A**：每个模板配置带 `version` 字段
- **B**：不管，同名覆盖
- 建议 **A**

## 五、我下一步可以做的

如果你能告诉我 Q1-Q5 的选择（或者"按你建议来"），我就接着实现：

1. 修 `ExcelParserService`：支持 `sheet_name` + `header_row` 参数
2. 写硬编码的 `HC_INVOICE_TEMPLATE` 配置常量
3. 加 `xlsx` (SheetJS) 库支持 `.xls`
4. 把"模板配置"挪到数据库（如果选 B）
5. 更新 `AttachmentService`：解析时自动套模板配置，返回结构化数据

**或者**：你直接说"按你建议来，全部做"，我就一把梭。

晚安，等你明天回来定。🌙