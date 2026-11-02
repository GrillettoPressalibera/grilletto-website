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

  await test('desktop announcement and decorative pointer/scroll effect', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url);
    await page.locator('.motion-layer').waitFor();
    assert.match(await page.locator('main').innerText(), /Stiamo\s+arrivando/);
    assert.match(await page.locator('h1').ariaSnapshot(), /Grilletto Pressalibera/);
    assert.match(await page.locator('h2').ariaSnapshot(), /Stiamo arrivando\./);
    const initialTransform = await page.locator('.orbit-one').evaluate((node) => getComputedStyle(node).transform);
    await page.locator('.graphic').hover({ position: { x: 200, y: 300 } });
    await page.waitForFunction(() => document.querySelector('.motion-layer').style.getPropertyValue('--cursor-x') !== '0px');
    const pointerTransform = await page.locator('.orbit-one').evaluate((node) => getComputedStyle(node).transform);
    assert.notEqual(pointerTransform, initialTransform, 'pointer must move the rendered ornament');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => document.querySelector('.motion-layer').style.getPropertyValue('--scroll-shift') !== '0px');
    const scrollTransform = await page.locator('.orbit-one').evaluate((node) => getComputedStyle(node).transform);
    assert.notEqual(scrollTransform, pointerTransform, 'scroll must move the rendered ornament');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.close();
  });

  await test('mobile has no horizontal overflow, including zoom', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    await page.goto(url);
    await page.locator('.motion-layer').waitFor();
    await page.waitForFunction(() => document.querySelector('.motion-layer').style.getPropertyValue('--cursor-x') !== '');
    for (const scale of [1, 2]) {
      await page.evaluate((value) => { document.documentElement.style.zoom = value; }, scale);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at zoom ${scale}`);
    }
    assert.equal(await page.locator('.motion-layer').evaluate((node) => node.style.getPropertyValue('--cursor-x')), '0px');
    await page.close();
  });

  await test('essential words remain inside the visible page at narrow zoom-equivalent widths', async () => {
    for (const width of [160, 200, 256, 375]) {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 812 } });
      const page = await context.newPage();
      await page.goto(url);
      const textBounds = await page.evaluate(() => {
        const elements = [...document.querySelectorAll('.brand span, .message')];
        return elements.flatMap((element) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const bounds = [];
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            bounds.push(...[...range.getClientRects()].map(({ left, right }) => ({ left, right })));
          }
          return bounds;
        });
      });
      assert.ok(textBounds.length >= 4, `no text bounds at ${width}px`);
      assert.ok(textBounds.every(({ left, right }) => left >= -1 && right <= width + 1), `${width}px: ${JSON.stringify(textBounds)}`);
      await context.close();
    }
  });

  await test('a failed JavaScript bundle leaves the styled announcement intact', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.route('**/*.js', (route) => route.abort());
    await page.goto(url);
    assert.equal(await page.locator('.message').isVisible(), true);
    assert.match(await page.locator('h1').ariaSnapshot(), /Grilletto Pressalibera/);
    assert.match(await page.locator('h2').ariaSnapshot(), /Stiamo arrivando\./);
    assert.equal(await page.locator('.graphic').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(17, 17, 16)');
    assert.equal(await page.locator('.motion-layer').count(), 0);
    await page.close();
  });

  await test('without JavaScript the announcement remains styled and visible', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(url);
    assert.equal(await page.locator('.message').isVisible(), true);
    assert.match(await page.locator('.message').innerText(), /Stiamo\s+arrivando/);
    assert.equal(await page.locator('.editorial').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('.graphic').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(17, 17, 16)');
    await context.close();
  });

  await test('reduced motion halts JS movement and freezes decoration', async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    await page.goto(url);
    await page.locator('.graphic').hover({ position: { x: 200, y: 300 } });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.motion-layer').evaluate((node) => node.style.getPropertyValue('--cursor-x')), '');
    assert.equal(await page.locator('.orbit-one').evaluate((node) => getComputedStyle(node).transform), 'none');
    await page.close();
  });
} finally {
  if (browser) await browser.close();
  server.kill();
}
