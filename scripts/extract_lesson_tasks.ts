/**
 * `src/pages` dan `TASKS` massivlarini o‘qiydi va `lesson_tasks_inventory.json` ni yangilaydi.
 * Standart: mavjud inventar bilan **merge** (boshqa guruhlar o‘chmaydi). To‘liq qayta yozish: `tsx ... --fresh`.
 * `/lesson-1` vazifa 1 har doim `src/data/lessonOneTasks.ts` dan qo‘shiladi.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { getLessonOneVazifaOneInventoryGroup } from './_lib/lessonOneVazifaOneInventory.js';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

type ExtractedTask = {
  type: string;
  prompt: string;
  content: Record<string, Json>;
  answer: Record<string, Json>;
  difficulty: number;
  skill: string;
  meta: Record<string, Json>;
};

type ExtractedLesson = {
  lessonPath: string;
  taskNumber: number;
  sourceFile: string;
  tasks: ExtractedTask[];
};

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'src/pages');

function asJson(node: ts.Expression): Json | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) {
    const arr: Json[] = [];
    for (const el of node.elements) {
      if (!ts.isExpression(el)) return undefined;
      const parsed = asJson(el);
      if (parsed === undefined) return undefined;
      arr.push(parsed);
    }
    return arr;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, Json> = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) return undefined;
      const key = ts.isIdentifier(prop.name) ? prop.name.text : ts.isStringLiteral(prop.name) ? prop.name.text : undefined;
      if (!key) return undefined;
      const parsed = asJson(prop.initializer);
      if (parsed === undefined) return undefined;
      obj[key] = parsed;
    }
    return obj;
  }
  return undefined;
}

function extractTasksFromText(sourceText: string): ExtractedTask[] {
  const sourceFile = ts.createSourceFile('x.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tasks: ExtractedTask[] = [];

  function parseTaskObject(raw: Record<string, Json>): ExtractedTask | null {
    const type = typeof raw.type === 'string' ? raw.type : null;
    if (!type) return null;
    const prompt = typeof raw.prompt === 'string' ? raw.prompt : '';
    const base = { difficulty: 1, skill: 'grammar', meta: {} as Record<string, Json> };
    if (type === 'matching') {
      const pairs = Array.isArray(raw.pairs) ? raw.pairs : [];
      return {
        type,
        prompt,
        content: { pairs },
        answer: { type: 'pairs', value: pairs, alternatives: [] },
        ...base,
      };
    }
    if (type === 'sentence') {
      const words = Array.isArray(raw.words) ? raw.words : [];
      const correct = typeof raw.correct === 'string' ? raw.correct : '';
      return {
        type,
        prompt,
        content: { words },
        answer: { type: 'string', value: correct, alternatives: [] },
        ...base,
      };
    }
    if (type === 'choice' || type === 'fill' || type === 'reorder') {
      const options = Array.isArray(raw.options) ? raw.options : [];
      const correct = typeof raw.correct === 'string' ? raw.correct : '';
      return {
        type,
        prompt,
        content: { options },
        answer: { type: 'string', value: correct, alternatives: [] },
        ...base,
      };
    }
    return { type, prompt, content: raw, answer: { type: 'unknown', value: '', alternatives: [] }, ...base };
  }

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'TASKS' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const el of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue;
        const parsed = asJson(el);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') continue;
        const mapped = parseTaskObject(parsed);
        if (mapped) tasks.push(mapped);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return tasks;
}

function parseLessonRefFromFile(filePath: string): { lessonPath: string; taskNumber: number } | null {
  const base = path.basename(filePath);
  const lessonTask = base.match(/^Lesson([A-Za-z]+)Task([A-Za-z0-9]+)Page\.tsx$/);
  if (lessonTask) {
    const content = lessonTask[0];
    const text = content.toLowerCase();
    const ln = text.match(/lesson([a-z]+)task/);
    const tn = text.match(/task([a-z0-9]+)page/);
    if (ln && tn) {
      const mapWord: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
        eighteen: 18, nineteen: 19, twenty: 20, twentyone: 21, twentytwo: 22, twentythree: 23, twentyfour: 24,
      };
      const lessonId = mapWord[ln[1].replace(/[^a-z]/g, '')];
      const taskNumber = mapWord[tn[1].replace(/[^a-z]/g, '')] ?? Number(tn[1].replace(/\D/g, ''));
      if (lessonId && taskNumber) return { lessonPath: `/lesson-${lessonId}`, taskNumber };
    }
  }
  const unified = path.basename(filePath).match(/^UnifiedLesson([A-Za-z0-9]+)PracticePage\.tsx$/);
  if (unified) {
    const key = unified[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const mapWord: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    };
    const lessonId = mapWord[key];
    if (lessonId) return { lessonPath: `/lesson-${lessonId}`, taskNumber: 1 };
  }
  return null;
}

function inventoryKey(lessonPath: string, taskNumber: number): string {
  return `${lessonPath}\0${taskNumber}`;
}

async function loadExistingInventoryMap(outPath: string): Promise<Map<string, ExtractedLesson>> {
  const map = new Map<string, ExtractedLesson>();
  try {
    const raw = await fs.readFile(outPath, 'utf8');
    const data = JSON.parse(raw) as { lessons?: ExtractedLesson[] };
    for (const g of data.lessons ?? []) {
      if (!g?.lessonPath || typeof g.taskNumber !== 'number' || !Array.isArray(g.tasks)) continue;
      map.set(inventoryKey(g.lessonPath, g.taskNumber), g);
    }
  } catch {
    /* fayl yo‘q yoki JSON buzilgan */
  }
  return map;
}

async function main() {
  const outPath = path.join(ROOT, 'scripts/generated/lesson_tasks_inventory.json');
  const fresh = process.argv.includes('--fresh');
  const byKey = fresh ? new Map<string, ExtractedLesson>() : await loadExistingInventoryMap(outPath);

  const names = await fs.readdir(PAGES_DIR);

  for (const name of names) {
    if (!name.endsWith('.tsx')) continue;
    const abs = path.join(PAGES_DIR, name);
    const src = await fs.readFile(abs, 'utf8');
    const tasks = extractTasksFromText(src);
    if (tasks.length === 0) continue;

    let lessonPath = '/lesson-1';
    let taskNumber = 1;

    const str = src.match(/setLessonTaskResult\(\s*'([^']+)'\s*,\s*(\d+)/);
    if (str) {
      lessonPath = str[1];
      taskNumber = Number(str[2]);
    } else {
      const byFile = parseLessonRefFromFile(abs);
      if (byFile) {
        lessonPath = byFile.lessonPath;
        taskNumber = byFile.taskNumber;
      } else {
        const byCode =
          src.match(/lessonPath="([^"]+)"/) ||
          src.match(/navigate\('([^']*\/lesson-\d+)'\)/);
        const taskByCode2 = src.match(/taskNumber=\{(\d+)\}/);
        if (byCode) lessonPath = byCode[1];
        if (taskByCode2) taskNumber = Number(taskByCode2[1]);
      }
    }

    byKey.set(inventoryKey(lessonPath, taskNumber), {
      lessonPath,
      taskNumber,
      sourceFile: path.relative(ROOT, abs),
      tasks,
    });
  }

  const l1t1 = getLessonOneVazifaOneInventoryGroup() as ExtractedLesson;
  byKey.set(inventoryKey(l1t1.lessonPath, l1t1.taskNumber), l1t1);

  const lessons = [...byKey.values()].sort((a, b) =>
    a.lessonPath === b.lessonPath ? a.taskNumber - b.taskNumber : a.lessonPath.localeCompare(b.lessonPath),
  );
  const out = {
    generatedAt: new Date().toISOString(),
    lessons,
  };
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  const mode = fresh ? 'fresh' : 'merge';
  console.log(`Wrote ${lessons.length} lesson task groups (${mode}) -> scripts/generated/lesson_tasks_inventory.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
