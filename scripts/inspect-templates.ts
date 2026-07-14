/**
 * 一次性脚本：解析 Docs/ 下的两个模板，输出结构
 * 让我看清字段再决定字段映射规则
 *
 * 用法：pnpm exec ts-node scripts/inspect-templates.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

async function inspect(filePath: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`文件: ${path.basename(filePath)}`);
  console.log(`大小: ${fs.statSync(filePath).size} bytes`);
  console.log('='.repeat(80));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fs.readFileSync(filePath));

  console.log(`Sheet 数: ${workbook.worksheets.length}`);
  workbook.worksheets.forEach((sheet, idx) => {
    console.log(`  [${idx}] ${sheet.name} (行=${sheet.rowCount}, 列=${sheet.columnCount})`);
  });

  for (const sheet of workbook.worksheets) {
    console.log(`\n--- Sheet: ${sheet.name} ---`);
    const maxRows = Math.min(sheet.rowCount, 30);
    for (let i = 1; i <= maxRows; i++) {
      const row = sheet.getRow(i);
      const values = row.values as unknown[];
      // values[0] 是 padding
      const cells = values.slice(1).map((v) => formatCell(v));
      console.log(`R${i.toString().padStart(2)}:`, JSON.stringify(cells));
    }
    if (sheet.rowCount > 30) {
      console.log(`... (共 ${sheet.rowCount} 行)`);
    }
  }
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    return (v as { richText: Array<{ text: string }> })
      .richText.map((r) => r.text)
      .join('');
  }
  if (typeof v === 'object' && v !== null && 'formula' in v) {
    const f = v as { formula: string; result: unknown };
    return `=${f.formula}→${formatCell(f.result)}`;
  }
  return String(v);
}

async function main() {
  const docsDir = path.join(__dirname, '..', 'Docs');
  if (!fs.existsSync(docsDir)) {
    console.error(`Docs 目录不存在: ${docsDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(docsDir).filter((f) => /\.(xlsx|xls)$/i.test(f));
  if (files.length === 0) {
    console.error('Docs 目录下没有 Excel 文件');
    process.exit(1);
  }
  for (const f of files) {
    await inspect(path.join(docsDir, f));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});