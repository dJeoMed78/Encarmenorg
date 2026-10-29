import { chromium } from '/root/.bun/install/global/node_modules/playwright-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/evidence/ENC-PUBLIC-DETAIL-UX-001');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  // 1. Desktop 1440x900
  console.log('Capturing Desktop (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:3000/?negocio=yuss', { waitUntil: 'networkidle' });
  await desktopPage.waitForSelector('.bpd-shell', { timeout: 10000 });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: path.join(outDir, 'desktop-1440.png'), fullPage: false });
  await desktopPage.screenshot({ path: path.join(outDir, 'desktop-1440-full.png'), fullPage: true });

  // 2. Mobile 390x844 (iPhone standard)
  console.log('Capturing Mobile (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000/?negocio=yuss', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.bpd-shell', { timeout: 10000 });
  await mobilePage.waitForTimeout(1000);
  // Viewport fold
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-390-viewport.png'), fullPage: false });
  // Scroll to description & facts
  await mobilePage.evaluate(() => window.scrollBy(0, 600));
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-390-scrolled.png'), fullPage: false });
  // Full page
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-390-full.png'), fullPage: true });

  // 3. Small Mobile 360x740 (Android compact)
  console.log('Capturing Narrow Mobile (360x740)...');
  const narrowContext = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const narrowPage = await narrowContext.newPage();
  await narrowPage.goto('http://localhost:3000/?negocio=yuss', { waitUntil: 'networkidle' });
  await narrowPage.waitForSelector('.bpd-shell', { timeout: 10000 });
  await narrowPage.waitForTimeout(1000);
  await narrowPage.screenshot({ path: path.join(outDir, 'mobile-360-viewport.png'), fullPage: false });
  await narrowPage.screenshot({ path: path.join(outDir, 'mobile-360-full.png'), fullPage: true });

  // Verify elements order and bounding boxes in mobile
  const inspection = await mobilePage.evaluate(() => {
    const heading = document.querySelector('.bpd-heading')?.getBoundingClientRect();
    const identity = document.querySelector('.bpd-identity')?.getBoundingClientRect();
    const media = document.querySelector('.bpd-media')?.getBoundingClientRect();
    const desc = document.querySelector('.bpd-story-description')?.getBoundingClientRect();
    const facts = document.querySelector('.bpd-facts')?.getBoundingClientRect();
    const reviews = document.querySelector('.bpd-reviews')?.getBoundingClientRect();

    const descLinks = Array.from(document.querySelectorAll('.bpd-description a')).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent,
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel')
    }));

    const waBtn = document.querySelector('.bpd-wa')?.getAttribute('href');
    const callBtn = document.querySelector('.bpd-call')?.getAttribute('href');

    return {
      rects: {
        headingTop: heading?.top,
        identityTop: identity?.top,
        mediaTop: media?.top,
        descTop: desc?.top,
        factsTop: facts?.top,
        reviewsTop: reviews?.top,
      },
      descLinks,
      waBtn,
      callBtn,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });

  fs.writeFileSync(path.join(outDir, 'inspection.json'), JSON.stringify(inspection, null, 2));
  console.log('Inspection result:', inspection);

  await browser.close();
  console.log('Evidence capture complete! Files saved to:', outDir);
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
