const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get base folder from command line argument or fallback to "llama7b"
const baseFolder = process.argv[2] || 'phi';
const fileName = "7Jun0130_result_reply.json";
const folderPath = path.resolve(__dirname, baseFolder);

const resultPath = path.resolve(folderPath + "/output", fileName);
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

   // --- 1.a. Hitung decode speed untuk masing-masing entry ---
  // Pastikan field berikut ada di setiap item:
  //   - item.output_token_length  (misalnya 104)
  //   - item.latency_ms           (misalnya 15770)
  if (typeof item.output_token_length === 'number' && typeof item.latency_ms === 'number') {
    const decodeTimeSec = item.latency_ms / 1000;
    // tokens per second
    item.decode_speed_tps = parseFloat(
      (item.output_token_length / decodeTimeSec).toFixed(2)
    );
  } else {
    item.decode_speed_tps = null;  // jika salah satu field tidak ada
  }
}

try {
  fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2), 'utf-8');
  console.log(`\nUpdated file written back to ${fileName} (with decode_speed_tps).`);
} catch (e) {
  console.error('Error writing updated resultData:', e.message);
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
try {
  const pythonResult = execSync(
    `python rouge_eval.py ${baseFolder} ${fileName}`, 
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

  const outputRougeFilename = `${fileName}_${baseFolder}_rouge_result.json`;
  const outputRougePath = path.resolve(outputFolder, outputRougeFilename);

  fs.writeFileSync(outputRougePath, JSON.stringify(rougeJson, null, 2), 'utf-8');
  console.log(`Saved parsed ROUGE result output to ${outputRougeFilename}`);

} catch (err) {
  console.error('Error running Python ROUGE evaluation:', err.message);
}