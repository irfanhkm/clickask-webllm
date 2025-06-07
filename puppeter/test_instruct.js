const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const urlModel = "mlc-ai/SmolLM2-360M-Instruct-q0f16-MLC";

/* ---------- CONFIG ---------- */
const model = 'smolLLM';
const baseUrl = 'chrome-extension://inmcbnhlaocpknodclgmjgbjmmonpedl/src/PanelRoute.html';
const dataPath = path.resolve(__dirname, 'data', 'testData_instruct.json');
const progressFile = path.resolve(__dirname, 'progress.json');

const runId = "7Jun0130"
const outputFile = path.resolve(`../coherence-data/${model}/output/`, `${runId}_result_reply.json`)

// Load last completed id from file
function loadProgress() {
  try {
    if (fs.existsSync(progressFile)) {
      const data = fs.readFileSync(progressFile, 'utf8');
      return JSON.parse(data).lastCompletedId || null;
    }
  } catch {}
  return null;
}
function saveProgress(id) {
  fs.writeFileSync(progressFile, JSON.stringify({ lastCompletedId: id }));
}

// Append single entry to output file, maintaining a JSON array structure
function appendOutput(entry) {
  let data = [];
  if (fs.existsSync(outputFile)) {
    try {
      const fileContent = fs.readFileSync(outputFile, 'utf8');
      data = fileContent ? JSON.parse(fileContent) : [];
    } catch {
      data = [];
    }
  }
  data.push(entry);
  try {
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing output:', e);
  }
}

async function runTest() {
  const { AutoTokenizer } = await import('@xenova/transformers');
  const tokenizer = await AutoTokenizer.from_pretrained(urlModel);
  const lastCompletedId = loadProgress();
  let skip = true;
  // Load test data from file
  const rawData = fs.readFileSync(dataPath);
  const testData = JSON.parse(rawData);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700 })
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  for (const item of testData) {
    if (!lastCompletedId) skip = false;
    if (skip) {
      if (item.id === lastCompletedId) { skip = false; continue; }
      console.log(`Skipping ${item.id}`); continue;
    }

    await page.evaluate(() => window.scrollTo(-1, -1));
    console.log(`\nProcessing id ${item.id}`);

    const prompt = `Summarize the following article in 2 or 3 sentences. Only include the main event and its immediate outcome, avoiding all background, side details, or interpretation. Your summary must be strictly factual, concise, and limited to what is directly stated in the article:\n\n"${item.article}"`;
    const tokenizerResult = await tokenizer(prompt);
    const tokenLength = tokenizerResult.input_ids.size;

    // create chat
    await page.click('button.add-button');
    await page.type('input.chat-name-input', String(item.id));
    await page.click('button.create-button');
    await page.waitForSelector('textarea:not([disabled])', { timeout: 120000 });

    await page.click('textarea', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.evaluate((t) => {
      const ta = document.querySelector('textarea');
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      set.call(ta, t); ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, prompt);

    const t0 = Date.now();
    await page.click('button.send-button');
    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll('.message-assistant');
      if (msgs.length === 0) return false;
      return msgs[msgs.length - 1].querySelector('.message-actions') !== null;
    }, { timeout: 120000 });

    const reply = await page.evaluate(() => {
      const msgs = document.querySelectorAll('.message-assistant');
      return msgs[msgs.length - 1]?.textContent || '';
    });
    const latency = Date.now() - t0;

    const tokenizerOutput = await tokenizer(reply);
    const outputLength = tokenizerOutput.input_ids.size;
    appendOutput({ id: item.id, latency_ms: latency, article: item.article, short_summary: item.short_summary, prompt, reply, input_token_length: tokenLength, output_token_length: outputLength });
    saveProgress(item.id);

    console.log(`Reply: ${reply}`);
    console.log(`Latency ${latency} ms`);
    await page.waitForTimeout(100);
    await page.click('button.back-button');
  }

  console.log(`all test data tested`);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
