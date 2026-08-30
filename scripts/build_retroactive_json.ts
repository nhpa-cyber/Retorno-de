import fs from 'fs';
import path from 'path';
import { processRefugoImportData } from '../src/utils/excelImportHelper.js';

function parseCsv(csvText: string) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Detect separator (; or , or \t)
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  
  const headers = lines[0].split(sep);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(sep);
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx] ? values[idx].trim() : '';
    });
    rows.push(obj);
  }
  return rows;
}

async function main() {
  const inputArg = process.argv[2];
  let rows: any[] = [];

  if (inputArg && fs.existsSync(inputArg)) {
    console.log(`Reading real refugo file: ${inputArg}`);
    const content = fs.readFileSync(inputArg, 'utf-8');
    if (inputArg.endsWith('.json')) {
      const parsed = JSON.parse(content);
      rows = Array.isArray(parsed) ? parsed : (parsed.collections?.audits || parsed.audits || []);
    } else {
      rows = parseCsv(content);
    }
  } else {
    // Check if an Import_Refugo_Rota file exists in workspace
    const candidateFiles = [
      './Import_Refugo_Rota.csv',
      './Import_Refugo_Rota.json',
      './public/Import_Refugo_Rota.csv'
    ];
    let foundPath = candidateFiles.find(p => fs.existsSync(p));
    if (foundPath) {
      console.log(`Found workspace file: ${foundPath}`);
      const content = fs.readFileSync(foundPath, 'utf-8');
      rows = foundPath.endsWith('.json') ? JSON.parse(content) : parseCsv(content);
    } else {
      console.log("No input file provided. Usage: npx tsx scripts/build_retroactive_json.ts <path-to-real-csv-or-json>");
    }
  }

  const result = processRefugoImportData(rows, [], []);

  const finalJson = {
    collections: {
      audits: result.auditsToSave
    },
    newDrivers: result.newDriversToSave,
    summary: {
      totalMaps: result.totalMapsProcessed,
      unregisteredDrivers: result.unregisteredDriversCount,
      generatedAudits: result.auditsToSave.length
    }
  };

  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(publicDir, 'audits_retroativos_import.json'),
    JSON.stringify(finalJson, null, 2),
    'utf-8'
  );
  console.log(`Processed ${result.auditsToSave.length} audits and saved to public/audits_retroativos_import.json!`);
}

main().catch(err => {
  console.error("Error building retroactive json:", err);
  process.exit(1);
});
