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

test('a student may edit or move any board text, but not erase the teacher pen strokes', async () => {
  const { canApply, emptyRoomState, inkKeyOf } = await import('../shared/lessonRoom');
  const base = { ...emptyRoomState(), blank: 1, blankCount: 1, studentCanDraw: true };
  const key = inkKeyOf(base)!;
  const state = {
    ...base,
    ink: {
      [key]: [
        { id: 't1', tool: 'text' as const, color: '#EF4444', size: 34, pts: [0.1, 0.1], text: 'Jamshed', by: 'teacher' as const },
        { id: 'p1', tool: 'pen' as const, color: '#0F172A', size: 7, pts: [0.1, 0.1, 0.2, 0.2], by: 'teacher' as const },
      ],
    },
  };
  const edit = { type: 'ink' as const, key, remove: ['t1'], add: [{ id: 't2', tool: 'text' as const, color: '#EF4444', size: 34, pts: [0.1, 0.1], text: 'Laziz' }] };
  assert.equal(canApply('student', edit, state), true, 'teacher text can be replaced');
  assert.equal(canApply('student', { type: 'ink', key, remove: ['p1'] }, state), false, 'teacher drawing stays');
  assert.equal(canApply('student', edit, { ...state, studentCanDraw: false }), false, 'only with permission');
});
