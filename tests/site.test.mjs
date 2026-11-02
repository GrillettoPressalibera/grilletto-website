import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const html = () => readFileSync(new URL('index.html', dist), 'utf8');

function stylesheet() {
  const cssDir = new URL('assets/', dist);
  return readdirSync(cssDir).filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(join(cssDir.pathname, name), 'utf8')).join('\n');
}

test('the built HTML communicates the announcement without JavaScript', () => {
  const page = html();
  assert.match(page, /<html lang="it">/);
  assert.match(page, /<h1[^>]*>\s*<span>Pressa<\/span>\s*<span>Libera<\/span>\s*<\/h1>/);
  assert.match(page, /<strong>IN<br\s*\/>ARRIVO<\/strong>/);
  assert.match(page, /<p class="label">PERIODICO GRATUITO PORCELLOTTO ANTIFASCISTA<\/p>/);
  assert.doesNotMatch(page, /UN FOGLIO NUOVO STA PRENDENDO FORMA/);
  assert.doesNotMatch(page, /Stiamo arrivando|LIBERO DI FARE RUMORE|↘|↗/i);
  assert.doesNotMatch(page, /<div class="seal">[^<]*<span>GRILLETTO/);
  assert.match(page, /<main\b/);
  assert.match(page, /id="motif"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(page, /https?:\/\//);
  assert.doesNotMatch(page, /<form\b|<a\b|<img\b/i);
});

test('the production CSS keeps essential content visible and reduced motion still', () => {
  const css = stylesheet();
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /\.brand[^}]*display:\s*none/);
  assert.doesNotMatch(css, /\.orbit|--cursor-x|--scroll-shift/);
  assert.doesNotMatch(css, /@import\s+url\(/);
});
