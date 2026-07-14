/* 用 SheetJS 解析 .xls 询价模板 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join('/sessions/intelligent-determined-davinci/mnt/青提派/haycargo/Docs/HC欧洲清关询价模板.xls');

console.log(`文件: ${path.basename(filePath)}`);
console.log(`大小: ${fs.statSync(filePath).size} bytes`);
console.log('='.repeat(80));

const wb = XLSX.readFile(filePath);
console.log(`Sheet 数: ${wb.SheetNames.length}`);
wb.SheetNames.forEach((name, idx) => {
  console.log(`  [${idx}] "${name}"`);
});

for (const sheetName of wb.SheetNames) {
  console.log(`\n--- Sheet: "${sheetName}" ---`);
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`范围: ${ws['!ref']} (行 ${range.s.r + 1}-${range.e.r + 1}, 列 ${range.s.c + 1}-${range.e.c + 1})`);

  const merges = ws['!merges'] || [];
  console.log(`合并单元格数: ${merges.length}`);

  const maxRow = Math.min(range.e.r + 1, 40);
  const maxCol = Math.min(range.e.c + 1, 15);
  for (let r = 0; r < maxRow; r++) {
    const cells = [];
    for (let c = 0; c < maxCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      let val = '';
      if (cell) {
        if (cell.f) {
          val = `=${cell.f}->${cell.v}`;
        } else if (cell.v !== undefined) {
          val = String(cell.v);
        }
      }
      cells.push(val);
    }
    if (cells.some(c => c !== '')) {
      console.log(`R${String(r + 1).padStart(2)}: ${JSON.stringify(cells)}`);
    }
  }
}

console.log('\n合并单元格详情:');
const ws = wb.Sheets[wb.SheetNames[0]];
(ws['!merges'] || []).forEach(m => {
  console.log(`  ${XLSX.utils.encode_range(m)}`);
});