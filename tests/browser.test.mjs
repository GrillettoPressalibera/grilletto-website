import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:4174/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
let browser;

async function ready() {
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* startup */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Vite preview did not become ready');
}

try {
  await ready();
  browser = await chromium.launch({ channel: 'chrome', headless: true });

  await test('desktop has the revised title, stamp, and no arbitrary hover motion', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url);
    assert.match(await page.locator('h1').ariaSnapshot(), /Pressa Libera/);
    assert.equal((await page.locator('.seal').innerText()).replace(/\s+/g, ' ').trim(), 'IN ARRIVO');
    assert.doesNotMatch(await page.locator('main').innerText(), /Stiamo arrivando|LIBERO DI FARE RUMORE|↘|↗/i);
    await page.locator('.graphic-type').waitFor();
    const before = await page.locator('.graphic-type').evaluate((node) => getComputedStyle(node).transform);
    await page.locator('.graphic').hover({ position: { x: 200, y: 300 } });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    assert.equal(await page.locator('.graphic-type').evaluate((node) => getComputedStyle(node).transform), before);
    assert.equal(await page.locator('.orbit').count(), 0);
    await page.close();
  });

  await test('decorative P/L is subordinate to the title on desktop and mobile', async () => {
    for (const [width, maxSize] of [[1440, 300], [375, 170]]) {
      const page = await browser.newPage({ viewport: { width, height: 812 } });
      await page.goto(url);
      await page.locator('.graphic-type').waitFor();
      const size = await page.locator('.graphic-type').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      assert.ok(size <= maxSize, `P/L ${size}px at ${width}px exceeds ${maxSize}px`);
      await page.close();
    }
  });

  await test('essential words stay visible at mobile and zoom-equivalent widths', async () => {
    for (const width of [160, 200, 256, 375]) {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 812 } });
      const page = await context.newPage();
      await page.goto(url);
      const label = page.locator('.label');
      assert.equal(await label.isVisible(), true, `cover copy hidden at ${width}px`);
      assert.match(await label.ariaSnapshot(), /PERIODICO GRATUITO PORCELLOTTO ANTIFASCISTA/);
      const styles = await label.evaluate((node) => ({ opacity: getComputedStyle(node).opacity, visibility: getComputedStyle(node).visibility }));
      assert.deepEqual(styles, { opacity: '1', visibility: 'visible' });
      const bounds = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('.brand span, .seal strong, .label')];
        return nodes.flatMap((element) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const rects = [];
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            rects.push(...[...range.getClientRects()].map(({ left, right }) => ({ left, right })));
          }
          return rects;
        });
      });
      assert.ok(bounds.length >= 4, `no title/stamp bounds at ${width}px`);
      assert.ok(bounds.every(({ left, right }) => left >= -1 && right <= width + 1), `${width}px: ${JSON.stringify(bounds)}`);
      await context.close();
    }
  });

  await test('failed JavaScript leaves the title and in-arrivo stamp styled', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.route('**/*.js', (route) => route.abort());
    await page.goto(url);
    assert.match(await page.locator('h1').ariaSnapshot(), /Pressa Libera/);
    assert.equal((await page.locator('.seal').innerText()).replace(/\s+/g, ' ').trim(), 'IN ARRIVO');
    assert.equal(await page.locator('.graphic').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(17, 17, 16)');
    assert.equal(await page.locator('.graphic-type').count(), 0);
    await page.close();
  });

  await test('reduced motion has no moving decorative elements', async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    await page.goto(url);
    await page.locator('.graphic-type').waitFor();
    assert.equal(await page.locator('.graphic-type').evaluate((node) => getComputedStyle(node).animationName), 'none');
    assert.equal(await page.locator('.graphic-type').evaluate((node) => getComputedStyle(node).transitionDuration), '0s');
    await page.close();
  });
} finally {
  if (browser) await browser.close();
  server.kill();
}
