const XLSX = require('C:/Users/78741/Desktop/青提派/haycargo/apps/api/node_modules/xlsx');
const path = require('path');

const FILES = [
  'C:/Users/78741/Desktop/青提派/haycargo/Docs/HC欧洲清关询价模板.xls',
];

async function dumpXls(file) {
  console.log(`\n========== ${path.basename(file)} ==========`);
  const wb = XLSX.readFile(file);
  console.log(`sheet_names: ${JSON.stringify(wb.SheetNames)}`);

  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    console.log(`--- sheet: "${sn}" ---`);
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    rows.slice(0, 30).forEach((row, i) => {
      const a = row[0] !== undefined ? String(row[0]) : '';
      console.log(`r${String(i + 1).padStart(2, ' ')} | A="${a}"`);
    });
  }
}

async function main() {
  for (const f of FILES) await dumpXls(f);
}
main().catch((e) => { console.error(e); process.exit(1); });
