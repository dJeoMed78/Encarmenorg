import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const EVIDENCE_DIR = path.resolve('docs/evidence/ENC-CLASSIFIEDS-UX-001');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
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
          close() { ws.close(); }
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
    });
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
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
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const client = await connectWs(pageTarget.webSocketDebuggerUrl);

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // MOBILE VIEW: 390x844
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    await client.send('Page.navigate', { url: 'http://localhost:3000/clasificados' });
    await sleep(3500);

    // Scroll to classifieds content
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const title = Array.from(document.querySelectorAll('h1')).find(h => h.textContent.includes('Vacantes'));
        if (title) title.scrollIntoView({ behavior: 'instant', block: 'start' });
      })()`
    });
    await sleep(800);

    const shotMobileHeader = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '04_mobile_classifieds_header_390x844.png'), Buffer.from(shotMobileHeader.data, 'base64'));
    console.log('Saved 04_mobile_classifieds_header_390x844.png');

    // Scroll down to cards grid
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        window.scrollBy(0, 450);
      })()`
    });
    await sleep(800);

    const shotMobileCards = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '05_mobile_cards_grid_390x844.png'), Buffer.from(shotMobileCards.data, 'base64'));
    console.log('Saved 05_mobile_cards_grid_390x844.png');

    // Open detail modal and take full screenshot
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('[data-testid="classified-card"]');
        if (card) card.click();
      })()`
    });
    await sleep(1000);

    const shotMobileModal = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '06_mobile_classified_detail_modal_390x844.png'), Buffer.from(shotMobileModal.data, 'base64'));
    console.log('Saved 06_mobile_classified_detail_modal_390x844.png');

    // DESKTOP: Full view scrolled to classifieds cards
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Runtime.evaluate', {
      expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`
    });
    await sleep(500);

    // Open desktop detail modal
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('[data-testid="classified-card"]');
        if (card) card.click();
      })()`
    });
    await sleep(1000);

    const shotDesktopDetail = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '03_desktop_classified_detail_modal.png'), Buffer.from(shotDesktopDetail.data, 'base64'));
    console.log('Saved 03_desktop_classified_detail_modal.png');

    await client.send('Runtime.evaluate', {
      expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`
    });
    await sleep(500);

    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const title = Array.from(document.querySelectorAll('h1')).find(h => h.textContent.includes('Vacantes'));
        if (title) title.scrollIntoView({ behavior: 'instant', block: 'start' });
      })()`
    });
    await sleep(800);

    const shotDesktopCards = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(EVIDENCE_DIR, '01_desktop_classifieds_cards_1440x900.png'), Buffer.from(shotDesktopCards.data, 'base64'));
    console.log('Saved 01_desktop_classifieds_cards_1440x900.png');

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error running scroll capture:', err);
  process.exit(1);
});
