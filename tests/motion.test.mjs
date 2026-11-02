import assert from 'node:assert/strict';
import test from 'node:test';
import { motionOffsets } from '../src/motion.js';

test('pointer and scroll input are clamped to the decorative field', () => {
  assert.deepEqual(motionOffsets({ x: 0, y: 0, width: 100, height: 200, scroll: 0 }), { x: -1, y: -1, scroll: 0 });
  assert.deepEqual(motionOffsets({ x: 250, y: 300, width: 100, height: 200, scroll: 2 }), { x: 1, y: 1, scroll: 1 });
});

test('reduced motion returns fixed offsets regardless of input', () => {
  assert.deepEqual(motionOffsets({ x: 90, y: 190, width: 100, height: 200, scroll: 0.8, reduced: true }), { x: 0, y: 0, scroll: 0 });
});
