const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

//   Change this to your extension or web app URL for chat list page
const baseUrl = 'chrome-extension://inmcbnhlaocpknodclgmjgbjmmonpedl/src/PanelRoute.html'; // Update accordingly
const progressFile = path.resolve(__dirname, 'progress.json');
const outputFile = path.resolve(__dirname, '../coherence-data/llama7b', 'result_reply.json');
const dataPath = path.resolve(__dirname, 'data', 'testData_instruct.json');

// Load last completed id from file
function loadProgress() {
  try {
    if (fs.existsSync(progressFile)) {
      const data = fs.readFileSync(progressFile, 'utf8');
      const json = JSON.parse(data);
      return json.lastCompletedId || null;
    }
  } catch (e) {
    console.error('Error loading progress:', e);
  }
  return null;
}

// Save last completed id to file
function saveProgress(id) {
  try {
    fs.writeFileSync(progressFile, JSON.stringify({ lastCompletedId: id }), 'utf8');
  } catch (e) {
    console.error('Error saving progress:', e);
  }
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
  const lastCompletedId = loadProgress();
  let skip = true;
  // Load test data from file
  const rawData = fs.readFileSync(dataPath);
  const testData = JSON.parse(rawData);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  for (const testItem of testData) {
    if (!lastCompletedId) skip = false;
    if (skip) {
        // If this testItem.id equals last completed id, stop skipping and start testing next
        if (testItem.id === lastCompletedId) {
        skip = false;
        continue; // skip the last completed test itself
        }
        console.log(`Skipping test id ${testItem.id} because it was completed`);
        continue; // skip tests before last completed
    }
    console.log(`\nTesting chat id: ${testItem.id}`);

    // Open create chat UI
    await page.click('button.add-button');

    // Type chat title as ID
    await page.type('input.chat-name-input', testItem.id);

    // Click create button
    await page.click('button.create-button');

    await page.waitForSelector('textarea:not([disabled])', { timeout: 8000 });

    // Construct prompt
    const prompt = `Summarize the following article by focusing only on the most important facts and key points relevant to the main event. Write a concise summary of about 3 to 5 sentences that captures the essential information without extra details or opinions \n "${testItem.article}"`;

    // Fill in the textarea by setting value directly
    await page.click('textarea', { clickCount: 3 });
    await page.keyboard.press('Backspace'); 

    await page.evaluate((text) => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(textarea, text);

        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
    }, prompt);


    // Click send
    await page.click('button.send-button');

    // Wait for streaming to finish (streaming indicator disappears)
    await page.waitForFunction(() => {
        const messages = document.querySelectorAll('.message-assistant');
        if (messages.length === 0) return false;
        const lastMsg = messages[messages.length - 1];
        return lastMsg.querySelector('.message-actions') !== null;
    }, { timeout: 120000 });

    // Now get the full assistant message content
    const reply = await page.evaluate(() => {
        const messages = document.querySelectorAll('.message-assistant');
        return messages[messages.length - 1]?.textContent || '';
    });
    

    appendOutput({
      id: testItem.id,
      article: testItem.article,
      short_summary: testItem.short_summary || '',
      reply: reply,
    });

    saveProgress(testItem.id);

    console.log(`Reply:\n${reply}`);

    // Wait a bit before next iteration
    await page.waitForTimeout(100);
    await page.click('button.back-button');
  }


  console.log(`all test data tested`);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});


// exec arch -arm64 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug