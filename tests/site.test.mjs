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
  assert.match(page, /<h1[^>]*>\s*<span>Grilletto<\/span>\s*<span>Pressalibera<\/span>\s*<\/h1>/);
  assert.match(page, /Stiamo arrivando\./);
  assert.match(page, /<main\b/);
  assert.match(page, /id="effects"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(page, /https?:\/\//);
  assert.doesNotMatch(page, /<form\b|<a\b|<img\b/i);
});

test('the production CSS keeps essential content visible and reduced motion still', () => {
  const css = stylesheet();
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /\.message[^}]*display:\s*none/);
  assert.doesNotMatch(css, /@import\s+url\(/);
});
