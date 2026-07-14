/* 临时脚本：解析 Docs/ 下的两个 Excel 模板
 * 跑完看完结构可以删掉 */
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

function formatCell(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object' && v !== null && v.richText) {
    return v.richText.map((r) => r.text).join('');
  }
  if (typeof v === 'object' && v !== null && 'formula' in v) {
    return `=${v.formula}->${formatCell(v.result)}`;
  }
  if (typeof v === 'object' && v !== null && v.text) return v.text;
  return String(v);
}

async function inspect(filePath) {
  console.log('\n' + '='.repeat(80));
  console.log(`文件: ${path.basename(filePath)}`);
  console.log(`大小: ${fs.statSync(filePath).size} bytes`);
  console.log('='.repeat(80));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(filePath));

  console.log(`Sheet 数: ${wb.worksheets.length}`);
  wb.worksheets.forEach((s, idx) => {
    console.log(`  [${idx}] "${s.name}" 行=${s.rowCount} 列=${s.columnCount}`);
  });

  for (const sheet of wb.worksheets) {
    console.log(`\n--- Sheet: "${sheet.name}" ---`);
    const max = Math.min(sheet.rowCount, 30);
    for (let i = 1; i <= max; i++) {
      const row = sheet.getRow(i);
      const vals = row.values;
      const cells = vals.slice(1).map(formatCell);
      console.log(`R${String(i).padStart(2)}: ${JSON.stringify(cells)}`);
    }
    if (sheet.rowCount > 30) console.log(`... (共 ${sheet.rowCount} 行)`);
  }
}

(async () => {
  const docsDir = '/sessions/intelligent-determined-davinci/mnt/青提派/haycargo/Docs';
  if (!fs.existsSync(docsDir)) {
    console.error('Docs 目录不存在:', docsDir);
    process.exit(1);
  }
  const files = fs.readdirSync(docsDir).filter((f) => /\.(xlsx|xls)$/i.test(f));
  console.log('找到文件:', files);
  for (const f of files) {
    await inspect(path.join(docsDir, f));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});