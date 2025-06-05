const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get base folder from command line argument or fallback to "llama7b"
const baseFolder = process.argv[2] || 'llama7b';
const folderPath = path.resolve(__dirname, baseFolder);

// Timestamp for filenames
const timestamp = Math.floor(Date.now() / 1000);

const resultPath = path.resolve(folderPath, 'result_reply.json');
const instructPath = path.resolve(__dirname, '../puppeter/data/testData_instruct.json');

// Load data
const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
const instructData = JSON.parse(fs.readFileSync(instructPath, 'utf-8'));

// ---- 1. Uniqueness and completeness check ----
const idSet = new Set();
const invalidItems = [];
let validCount = 0;

for (const item of resultData) {
  if (idSet.has(item.id)) {
    console.log(`Duplicate id found: ${item.id}`);
  }
  idSet.add(item.id);
  if (!item.reply || item.reply.split(/[.!?]\s+/).length <= 2) {
    invalidItems.push(item.id);
  } else {
    validCount++;
  }
}

if (invalidItems.length) {
  console.log('IDs with missing/too-short replies:', invalidItems);
} else {
  console.log('All replies exist and are longer than 2 sentences.');
}

// ---- 2. Check for missing IDs ----
const instructIds = new Set(instructData.map(d => d.id));
const resultIds = new Set(resultData.map(d => d.id));
const missingIds = [...instructIds].filter(id => !resultIds.has(id));
if (missingIds.length) {
  console.log('Missing IDs in result data:', missingIds);
} else {
  console.log('No missing IDs in result data.');
}

// Save a copy of result_reply.json with timestamp
const outputFolder = folderPath + "/output"; // same folder
const outputResultFilename = `${timestamp}_result_reply.json`;
const outputResultPath = path.resolve(outputFolder, outputResultFilename);

fs.writeFileSync(outputResultPath, JSON.stringify(resultData, null, 2), 'utf-8');
console.log(`Saved result data to ${outputResultFilename}`);

try {
  const pythonResult = execSync(
    `python rouge_eval.py ${baseFolder}`, 
    { encoding: 'utf-8' }
  );
  console.log('\n=== ROUGE scores ===\n');
  console.log(pythonResult);

  function parseRougeOutput(raw) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const totalItemMatch = lines[0].match(/over\s+(\d+)\s+items/i);
    const total_item = totalItemMatch ? Number(totalItemMatch[1]) : 0;

    const result = {
      raw_output: raw,
      total_item,
      rouge1: { precision: 0, recall: 0, f1: 0 },
      rouge2: { precision: 0, recall: 0, f1: 0 },
      rougeL: { precision: 0, recall: 0, f1: 0 },
    };

    for (const line of lines.slice(1)) {
      const m = line.match(/(rouge1|rouge2|rougeL):\s*Precision=([\d.]+),\s*Recall=([\d.]+),\s*F1=([\d.]+)/i);
      if (m) {
        const key = m[1].toLowerCase();
        result[key] = {
          precision: parseFloat(m[2]),
          recall: parseFloat(m[3]),
          f1: parseFloat(m[4]),
        };
      }
    }

    return result;
  }

  const rougeJson = parseRougeOutput(pythonResult);

  const outputRougeFilename = `${timestamp}_${baseFolder}_rouge_result.json`;
  const outputRougePath = path.resolve(outputFolder, outputRougeFilename);

  fs.writeFileSync(outputRougePath, JSON.stringify(rougeJson, null, 2), 'utf-8');
  console.log(`Saved parsed ROUGE result output to ${outputRougeFilename}`);

} catch (err) {
  console.error('Error running Python ROUGE evaluation:', err.message);
}