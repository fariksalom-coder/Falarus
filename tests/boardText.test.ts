import test from 'node:test';
import assert from 'node:assert/strict';
import { textBox, textLines, textMaxWidth, textWidth } from '../src/components/materials/ink';

test('long board text wraps inside the page instead of running off the right edge', () => {
  const text = 'Men bugun rus tilida juda koʻp yangi soʻzlarni oʻrgandim va ularni yodlab oldim';
  for (const x of [0.05, 0.4, 0.7]) {
    const lines = textLines(text, 34, x);
    assert.ok(lines.length > 1, `wraps at x=${x}`);
    assert.equal(lines.join(' '), text, 'no words lost');
    for (const l of lines) assert.ok(textWidth(l, 34) <= textMaxWidth(34, x), `fits at x=${x}: ${l}`);
  }
});

test('a single very long word is split rather than overflowing', () => {
  const lines = textLines('a'.repeat(120), 34, 0.5);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(''), 'a'.repeat(120));
});

test('short text stays on one line and its box grows with the line count', () => {
  assert.deepEqual(textLines('Privet', 34, 0.2), ['Privet']);
  const one = textBox({ size: 34, pts: [0.2, 0.2], text: 'Privet' }, 0.7);
  const many = textBox({ size: 34, pts: [0.2, 0.2], text: 'Privet '.repeat(30).trim() }, 0.7);
  assert.ok(many.h > one.h * 2);
  assert.ok(many.x + many.w <= 1);
});
