/**
 * Builds expected task totals for lessons 11–24 from page sources.
 * Run: node --import tsx scripts/oneoff/buildExtendedTotals.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ExerciseKind } from '../../src/data/countTasksInSourceArray.js';
import {
  countTasksInTasksArraySource,
  extractBracketArrayAfterEquals,
  countVerbEntriesInSource,
  inferPrimaryExerciseKindFromTasksBody,
} from '../../src/data/countTasksInSourceArray.js';

const PAGES_DIR = path.join(import.meta.dirname, '../../src/pages');

function analyzeTasksInPage(content: string): { count: number; kind: ExerciseKind } | null {
  if (/\bVERBS\.map\b/.test(content) && /const\s+TASKS/.test(content)) {
    const n = countVerbEntriesInSource(content, 'VERBS');
    if (n > 0) return { count: n, kind: 'matching' };
  }
  const body = extractBracketArrayAfterEquals(content, 'TASKS');
  if (body) {
    const n = countTasksInTasksArraySource(body);
    if (n > 0) return { count: n, kind: inferPrimaryExerciseKindFromTasksBody(body) };
  }
  return null;
}

function main(): void {
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.startsWith('Lesson') && f.endsWith('.tsx'));
  const map = new Map<string, { count: number; kind: ExerciseKind; file: string }>();

  const setRow = (lessonPath: string, taskNumber: number, count: number, kind: ExerciseKind, file: string) => {
    const key = `${lessonPath}:${taskNumber}`;
    const prev = map.get(key);
    if (prev && prev.count !== count) {
      console.error(`Conflict ${key}: ${prev.count} (${prev.file}) vs ${count} (${file})`);
    }
    map.set(key, { count, kind, file });
  };

  for (const file of files) {
    const full = path.join(PAGES_DIR, file);
    const content = fs.readFileSync(full, 'utf8');

    const lp = content.match(/lessonPath="(\/lesson-\d+)"/);
    const tn = content.match(/taskNumber=\{(\d+)\}/);
    if (lp && tn) {
      const a = analyzeTasksInPage(content);
      if (a) setRow(lp[1]!, parseInt(tn[1]!, 10), a.count, a.kind, file);
    }

    const re = /setLessonTaskResult\('(\/lesson-\d+)',\s*(\d+),/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(content)) !== null) {
      const a = analyzeTasksInPage(content);
      if (a) setRow(mm[1]!, parseInt(mm[2]!, 10), a.count, a.kind, file);
      break;
    }
  }

  // Unified lesson 11 practice (mustahkamlash) — file name doesn't match Lesson*
  const u11 = path.join(PAGES_DIR, 'UnifiedLessonElevenPracticePage.tsx');
  if (fs.existsSync(u11)) {
    const c = fs.readFileSync(u11, 'utf8');
    const a = analyzeTasksInPage(c);
    if (a) setRow('/lesson-11', 1, a.count, a.kind, 'UnifiedLessonElevenPracticePage.tsx');
  }

  const rows = [...map.entries()]
    .map(([k, v]) => {
      const [lessonPath, taskStr] = k.split(':');
      return {
        lessonPath: lessonPath!,
        taskNumber: parseInt(taskStr!, 10),
        count: v.count,
        kind: v.kind,
        file: v.file,
      };
    })
    .sort((a, b) => {
      const la = parseInt(a.lessonPath.replace('/lesson-', ''), 10);
      const lb = parseInt(b.lessonPath.replace('/lesson-', ''), 10);
      if (la !== lb) return la - lb;
      return a.taskNumber - b.taskNumber;
    });

  console.log('// lessonPath -> taskNumber -> expected total');
  console.log('export const LESSON_EXTENDED_EXPECTED_TASK_TOTALS: Record<string, Record<number, number>> = {');
  const byLesson = new Map<string, Record<number, number>>();
  for (const r of rows) {
    if (!byLesson.has(r.lessonPath)) byLesson.set(r.lessonPath, {});
    byLesson.get(r.lessonPath)![r.taskNumber] = r.count;
  }
  for (const [lp, tasks] of [...byLesson.entries()].sort(
    (a, b) => parseInt(a[0].replace('/lesson-', ''), 10) - parseInt(b[0].replace('/lesson-', ''), 10)
  )) {
    const nums = Object.keys(tasks)
      .map(Number)
      .sort((a, b) => a - b);
    console.log(`  '${lp}': {`);
    for (const n of nums) {
      console.log(`    ${n}: ${tasks[n]},`);
    }
    console.log('  },');
  }
  console.log('};');

  const byKind = new Map<string, Record<number, ExerciseKind>>();
  for (const r of rows) {
    if (!byKind.has(r.lessonPath)) byKind.set(r.lessonPath, {});
    byKind.get(r.lessonPath)![r.taskNumber] = r.kind;
  }
  console.log('');
  console.log('export const LESSON_EXTENDED_HUB_TASK_KINDS: Record<string, Record<number, ExerciseKind>> = {');
  for (const [lp, tasks] of [...byKind.entries()].sort(
    (a, b) => parseInt(a[0].replace('/lesson-', ''), 10) - parseInt(b[0].replace('/lesson-', ''), 10)
  )) {
    const nums = Object.keys(tasks)
      .map(Number)
      .sort((a, b) => a - b);
    console.log(`  '${lp}': {`);
    for (const n of nums) {
      console.log(`    ${n}: '${tasks[n]}',`);
    }
    console.log('  },');
  }
  console.log('};');

  for (const r of rows) {
    console.error(`${r.lessonPath}\t${r.taskNumber}\t${r.count}\t${r.kind}\t${r.file}`);
  }
}

main();
