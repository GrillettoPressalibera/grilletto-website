import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const dist = new URL('../dist/brand/', import.meta.url);
const official = {
  'Pressalibera-Logo-1-BN.png': '5f524048fea94364494c2b14a28bc4f52c9e24b79638c03c32385a6a5ae7dbb8',
  'Grilletto-Logo-Cuore-BN.png': 'd3d204c8d35e48cc4636355fce4e16b436e8917a400f95ed2b3b678d4978480c',
  'Periodico-gratuito.png': 'e7441309648460fcf2d874d7e078418f3f2b25686478dfacca7225d1182b2376',
  'Storie-e-strisce.png': '9d7d29933dba8fbad425e456040bb079992f28cb7b3b49fab77cb4b2fe66a5e2',
  'Cuore.png': '86d9c3cfde7bbef73e22987574dde1698f8dd2e4b50b4009ecfd4b0831981899',
  'Stella.png': '80f2847f0f7143294acb9cfb8acdc33b220f2f203ab216e74006268615f01d93',
  'Grillo.png': '31bd7b19f8c18987e097906cc6bebfdfaf64311cd69137e0ea513ad519cb72b3',
};

test('production output carries exactly the seven official PNG assets unmodified', () => {
  assert.deepEqual(readdirSync(dist).sort(), Object.keys(official).sort());
  for (const [name, expected] of Object.entries(official)) {
    const actual = createHash('sha256').update(readFileSync(new URL(name, dist))).digest('hex');
    assert.equal(actual, expected, name);
  }
});

test('no trial fonts or other font binaries are included in the public build', () => {
  const output = readdirSync(new URL('../dist/', import.meta.url), { recursive: true });
  assert.equal(output.some(name => /\.(?:otf|ttf|woff2?)$|TRIAL|Arizona/i.test(name)), false);
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /ABC.?Arizona|TRIAL/i);
});
