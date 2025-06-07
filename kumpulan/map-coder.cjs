// map.cjs
const fs   = require('fs');
const path = require('path');

/**
 * Load two JSON files (mac & windows), enrich dengan device label
 * and compute decode_speed_tps.
 */
function loadAndEnrich(modelName) {
  const macFile = path.resolve(__dirname, `${modelName}-mac-7Jun0130_result_reply.json`);
  const winFile = path.resolve(__dirname, `${modelName}-windows-7Jun0130_result_reply.json`);

  const mac = JSON.parse(fs.readFileSync(macFile, 'utf-8'));
  const win = JSON.parse(fs.readFileSync(winFile, 'utf-8'));

  return [
    ...mac.map(d => ({ ...d, device: 'Mid-Range' })),
    ...win.map(d => ({ ...d, device: 'High-End' }))
  ].map(d => ({
    id: d.id,
    device: d.device,
    latency_ms: d.latency_ms,
    input_token_length: d.input_token_length,
    output_token_length: d.output_token_length,
    decode_speed_tps: parseFloat((d.output_token_length / (d.latency_ms/1000)).toFixed(2))
  }));
}

// Jalankan untuk model yang Anda mau, misal "llama7b"
const model = process.argv[2] || 'qwen';
const enriched = loadAndEnrich(model);

// Simpan hasil ke JSON baru
const outFile = path.resolve(__dirname, `${model}-enriched.json`);
fs.writeFileSync(outFile, JSON.stringify(enriched, null, 2), 'utf-8');
console.log(`Enriched data for ${model} written to ${outFile}`);
