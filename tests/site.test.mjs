import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const html = () => readFileSync(new URL('index.html', dist), 'utf8');

test('production page serves the approved announcement as HTML, without JavaScript', () => {
  const page = html();
  assert.match(page, /<html lang="it">/);
  assert.match(page, /<h1[^>]*>[\s\S]*?<img[^>]+src="\.\/brand\/Pressalibera-Logo-1-BN\.png"[^>]+alt="Pressa libera"/);
  assert.doesNotMatch(page, /<p class="label">/);
  assert.match(page, /<img class="periodico-art"[^>]+alt="Periodico gratuito porcellotto antifascista"/);
  assert.match(page, /<strong class="arrival-copy">IN<br\s*\/>ARRIVO<\/strong>/);
  assert.match(page, /<meta name="description" content="Pressa libera, periodico gratuito porcellotto antifascista\. In arrivo\."/);
  assert.doesNotMatch(page, /<script\b|<form\b|<input\b|id="motif"/i);
});

test('official PNG graphics and CSS are referenced with relative paths', () => {
  const page = html();
  for (const asset of ['Grilletto-Logo-Cuore-BN','Pressalibera-Logo-1-BN','Periodico-gratuito','Stella','Grillo','Cuore','Storie-e-strisce']) {
    assert.ok(page.includes(`./brand/${asset}.png`), asset);
  }
  assert.match(page, /href="\.\/assets\/[^" ]+\.css"/);
  assert.doesNotMatch(page, /https?:\/\/|fonts\.googleapis|ABC.?Arizona|TRIAL/i);
});

test('production CSS keeps essential content visible with the supplied palette', () => {
  const css = readdirSync(new URL('assets/', dist)).filter(name => name.endsWith('.css'))
    .map(name => readFileSync(new URL(`assets/${name}`, dist), 'utf8')).join('\n');
  assert.match(css, /#f9f7ed/i);
  assert.match(css, /#1e1b07/i);
  assert.doesNotMatch(css, /\.brand[^}]*display:\s*none/);
  assert.doesNotMatch(css, /@import\s+url\(/);
});
