import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const EVIDENCE_DIR = path.resolve('docs/evidence/ENC-CLASSIFIEDS-UX-001');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    // Dynamic import WebSocket from ws (built-in or module)
    import('ws').then(({ WebSocket }) => {
      const ws = new WebSocket(wsUrl);
      let idCounter = 1;
      const callbacks = new Map();

      ws.on('open', () => {
        resolve({
          send(method, params = {}) {
            return new Promise((res, rej) => {
              const id = idCounter++;
              callbacks.set(id, { resolve: res, reject: rej });
              ws.send(JSON.stringify({ id, method, params }));
            });
          },
          close() {
            ws.close();
          }
        });
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id && callbacks.has(msg.id)) {
          const { resolve, reject } = callbacks.get(msg.id);
          callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      });

      ws.on('error', reject);
    }).catch(err => {
      reject(err);
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Starting chrome headless with remote debugging on port 9222...');
  const chrome = spawn(CHROME_PATH, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,900',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    await sleep(1500);

    const targets = await fetchJson('http://127.0.0.1:9222/json/list');
    console.log(`Found ${targets.length} targets`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No target with webSocketDebuggerUrl found');
    }

    const client = await connectWs(pageTarget.webSocketDebuggerUrl);
    console.log('Connected to CDP');

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to http://localhost:3000/clasificados on Desktop...');
    await client.send('Page.navigate', { url: 'http://localhost:3000/clasificados' });
    await sleep(3500);

    // 1. Desktop Feed screenshot
    const shot1 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '01_desktop_classifieds_feed_1440x900.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved 01_desktop_classifieds_feed_1440x900.png');

    // 2. Click "+ Publicar Vacante o Anuncio"
    console.log('Opening Create Classified Modal...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const createBtn = btns.find(b => b.textContent && b.textContent.includes('Publicar Vacante'));
        if (createBtn) createBtn.click();
      })()`
    });
    await sleep(1000);
    const shot2 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '02_desktop_classified_create_modal.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved 02_desktop_classified_create_modal.png');

    // Close create modal via Escape
    await client.send('Runtime.evaluate', {
      expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`
    });
    await sleep(800);

    // 3. Open Detail Modal by clicking the first card
    console.log('Opening Detail Modal for first classified...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('div.cursor-pointer.group');
        if (card) card.click();
      })()`
    });
    await sleep(1000);
    const shot3 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '03_desktop_classified_detail_modal.png'), Buffer.from(shot3.data, 'base64'));
    console.log('Saved 03_desktop_classified_detail_modal.png');

    // Close detail modal via Escape
    await client.send('Runtime.evaluate', {
      expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`
    });
    await sleep(800);

    // 4. Switch to Mobile Viewport (iPhone 14 / standard modern mobile: 390x844)
    console.log('Switching to Mobile Viewport (390x844)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);
    const shot4 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '04_mobile_classifieds_feed_390x844.png'), Buffer.from(shot4.data, 'base64'));
    console.log('Saved 04_mobile_classifieds_feed_390x844.png');

    // 5. Expand Mobile Filters
    console.log('Toggling Mobile Filters...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const filterBtn = btns.find(b => b.textContent && b.textContent.includes('Filtros avanzados'));
        if (filterBtn) filterBtn.click();
      })()`
    });
    await sleep(600);
    const shot5 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '05_mobile_filters_expanded_390x844.png'), Buffer.from(shot5.data, 'base64'));
    console.log('Saved 05_mobile_filters_expanded_390x844.png');

    // 6. Mobile Detail Modal
    console.log('Opening Detail Modal on Mobile...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('div.cursor-pointer.group');
        if (card) card.click();
      })()`
    });
    await sleep(1000);
    const shot6 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '06_mobile_classified_detail_modal_390x844.png'), Buffer.from(shot6.data, 'base64'));
    console.log('Saved 06_mobile_classified_detail_modal_390x844.png');

    // 7. Compact Mobile Screen (360x740)
    console.log('Testing Compact Mobile (360x740)...');
    await client.send('Runtime.evaluate', {
      expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`
    });
    await sleep(500);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 740,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(800);
    const shot7 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '07_compact_mobile_feed_360x740.png'), Buffer.from(shot7.data, 'base64'));
    console.log('Saved 07_compact_mobile_feed_360x740.png');

    console.log('All evidence screenshots captured successfully.');
    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error running capture:', err);
  process.exit(1);
});
