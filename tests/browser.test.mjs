import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:4174/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
let browser;

async function ready() {
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) throw new Error('Vite preview exited before becoming ready');
    try { if ((await fetch(url)).ok) return; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Vite preview did not become ready');
}

async function bounds(page) {
  return page.locator('.arrival-copy, .topbar-label, .topbar-note, .footer span').evaluateAll(nodes => nodes.flatMap(node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const rects = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      rects.push(...Array.from(range.getClientRects(), ({ left, right }) => ({ left, right })));
    }
    return rects;
  }));
}

try {
  await ready();
  browser = await chromium.launch({ channel: 'chrome', headless: true });

  await test('official logos load and copy stays accessible without JavaScript', async () => {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const failed = [];
    page.on('requestfailed', req => failed.push(req.url()));
    await page.goto(url);
    assert.match(await page.locator('h1').ariaSnapshot(), /Pressa libera/i);
    assert.match(await page.locator('.periodico-art').ariaSnapshot(), /Periodico gratuito porcellotto antifascista/i);
    assert.equal((await page.locator('.arrival').innerText()).replace(/\s+/g, ' ').trim(), 'IN ARRIVO');
    assert.equal(await page.locator('script').count(), 0);
    assert.equal(await page.locator('img').evaluateAll(nodes => nodes.every(n => n.complete && n.naturalWidth > 0)), true);
    assert.deepEqual(failed, []);
    await page.close();
  });

  await test('official imagery and text reflow at mobile, tablet and desktop widths', async () => {
    for (const width of [320, 390, 600, 900, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: false });
      await page.goto(url);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= width, `${width}px document overflow: ${scrollWidth}`);
      assert.equal(await page.locator('.brand img').isVisible(), true);
      assert.equal(await page.locator('.periodico-art').isVisible(), true);
      await page.locator('.footer').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.footer').isVisible(), true);
      const rects = await bounds(page);
      assert.ok(rects.every(({ left, right }) => left >= -2 && right <= width + 2), `${width}px clipped words: ${JSON.stringify(rects)}`);
      await page.close();
    }
  });

  await test('the announcement fits the viewport without scrolling at common display sizes', async () => {
    for (const [width, height] of [[320, 480], [320, 568], [390, 844], [601, 375], [667, 375], [820, 720], [901, 375], [1024, 600], [1440, 715], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, javaScriptEnabled: false });
      await page.goto(url);
      const layout = await page.evaluate(() => {
        const box = selector => {
          const element = document.querySelector(selector);
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        };
        return {
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          brand: box('.brand img'),
          periodico: box('.periodico-art'),
          arrival: box('.arrival'),
          footer: box('.footer'),
        };
      });
      assert.ok(layout.scrollHeight <= height + 1, `${width}x${height} scrolls: ${JSON.stringify(layout)}`);
      if (width === 667) {
        assert.ok(layout.brand.right - layout.brand.left >= 160, `${width}x${height} landscape wordmark unreadably small`);
        assert.ok(layout.periodico.right - layout.periodico.left >= 90, `${width}x${height} landscape side slogan unreadably small`);
      }
      assert.ok(layout.scrollWidth <= width + 1, `${width}x${height} horizontal scroll`);
      for (const name of ['brand', 'periodico', 'arrival', 'footer']) {
        const rect = layout[name];
        assert.ok(rect.top >= -1 && rect.bottom <= height + 1, `${width}x${height} ${name} clipped: ${JSON.stringify(rect)}`);
        assert.ok(rect.left >= -1 && rect.right <= width + 1, `${width}x${height} ${name} clipped horizontally`);
      }
      await page.close();
    }
  });

  await test('the large wordmark breathes below the PRESSA — LIBERA rule without adding scroll', async () => {
    for (const [width, height] of [[320, 480], [320, 568], [820, 720], [1440, 715], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, javaScriptEnabled: false });
      await page.goto(url);
      const spacing = await page.evaluate(() => ({
        gap: document.querySelector('.brand img').getBoundingClientRect().top - document.querySelector('.cover-overline').getBoundingClientRect().bottom,
        scrollHeight: document.documentElement.scrollHeight,
      }));
      const minimum = Math.min(28, Math.max(16, height * .03));
      assert.ok(spacing.gap >= minimum - 1, `${width}x${height} wordmark gap ${spacing.gap}px below ${minimum}px`);
      assert.ok(spacing.scrollHeight <= height + 1, `${width}x${height} spacing introduced scroll`);
      await page.close();
    }
  });

  await test('IN ARRIVO lettering stays inside the solid center of the star', async () => {
    for (const [width, height] of [[320, 480], [320, 568], [390, 844], [667, 375], [1440, 715], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, javaScriptEnabled: false });
      await page.goto(url);
      const measure = await page.locator('.arrival').evaluate(star => {
        const text = star.querySelector('.arrival-copy');
        const range = document.createRange();
        range.selectNodeContents(text.lastChild);
        const word = range.getBoundingClientRect();
        const shape = star.getBoundingClientRect();
        return { wordWidth: word.width, starWidth: star.offsetWidth, fontSize: parseFloat(getComputedStyle(text).fontSize), offset: Math.abs((word.left + word.right) / 2 - (shape.left + shape.right) / 2) };
      });
      assert.ok(measure.starWidth >= 90, `${width}x${height} star too small for legible lettering: ${JSON.stringify(measure)}`);
      assert.ok(measure.fontSize >= 16, `${width}x${height} lettering too small: ${JSON.stringify(measure)}`);
      assert.ok(measure.wordWidth <= measure.starWidth * .7, `${width}x${height} ARRIVO too wide for star: ${JSON.stringify(measure)}`);
      assert.ok(measure.offset <= measure.starWidth * .05, `${width}x${height} ARRIVO not centered: ${JSON.stringify(measure)}`);
      await page.close();
    }
  });

  await test('large text on short screens preserves the logo and side slogan with reachable scroll', async () => {
    for (const [width, height, fontSize] of [[320, 480, 32], [390, 480, 32], [600, 375, 32], [601, 375, 32], [667, 375, 32], [900, 375, 32], [901, 375, 24], [901, 375, 32], [1024, 375, 32], [1440, 375, 32]]) {
      const page = await browser.newPage({ viewport: { width, height }, javaScriptEnabled: false });
      await page.goto(url);
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
      const layout = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        brand: document.querySelector('.brand img').getBoundingClientRect().width,
        periodico: document.querySelector('.periodico-art').getBoundingClientRect().width,
        footerBottom: document.querySelector('.footer').getBoundingClientRect().bottom,
        coverBottom: document.querySelector('.cover').getBoundingClientRect().bottom,
        footerTop: document.querySelector('.footer').getBoundingClientRect().top,
        logoBottom: document.querySelector('.brand img').getBoundingClientRect().bottom,
        badgeBottom: document.querySelector('.arrival').getBoundingClientRect().bottom,
        sideBottom: document.querySelector('.periodico-art').getBoundingClientRect().bottom,
        mainBottom: document.querySelector('.cover-main').getBoundingClientRect().bottom,
        sideTop: document.querySelector('.cover-side').getBoundingClientRect().top,
      }));
      assert.ok(layout.brand >= 120, `${width}x${height} enlarged text collapsed logo: ${JSON.stringify(layout)}`);
      assert.ok(layout.periodico >= 60, `${width}x${height} enlarged text collapsed slogan: ${JSON.stringify(layout)}`);
      assert.ok(layout.scrollHeight > height, `${width}x${height} needs reachable vertical scroll: ${JSON.stringify(layout)}`);
      assert.ok(layout.scrollWidth <= width, `${width}x${height} horizontal clipping: ${JSON.stringify(layout)}`);
      assert.ok(layout.logoBottom <= layout.coverBottom + 1, `${width}x${height} logo overflows cover: ${JSON.stringify(layout)}`);
      assert.ok(layout.badgeBottom <= layout.coverBottom + 1, `${width}x${height} badge overflows cover: ${JSON.stringify(layout)}`);
      assert.ok(layout.sideBottom <= layout.coverBottom + 1, `${width}x${height} side artwork overflows cover: ${JSON.stringify(layout)}`);
      assert.ok(layout.coverBottom <= layout.footerTop + 1, `${width}x${height} cover overlaps footer: ${JSON.stringify(layout)}`);
      if (width === 320) {
        assert.ok(layout.logoBottom <= layout.mainBottom + 1 && layout.badgeBottom <= layout.mainBottom + 1, `mobile brand/stamp overlaps side panel: ${JSON.stringify(layout)}`);
        assert.ok(layout.mainBottom <= layout.sideTop + 1, `mobile panels overlap: ${JSON.stringify(layout)}`);
      }
      await page.locator('.footer').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.footer').isVisible(), true);
      await page.close();
    }
  });

  await test('text zoom at 320px does not crop the announcement or arrival stamp', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.goto(url);
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    const rects = await bounds(page);
    assert.ok(rects.every(({ left, right }) => left >= -2 && right <= 322), `zoom clipped words: ${JSON.stringify(rects)}`);
    assert.equal(await page.locator('.brand img').isVisible(), true);
    await page.close();
  });
} finally {
  if (browser) await browser.close();
  server.kill();
}
