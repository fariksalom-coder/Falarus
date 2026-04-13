/**
 * `src/pages` dan `TASKS` massivlarini o‘qiydi va `lesson_tasks_inventory.json` ni yangilaydi.
 * Standart: mavjud inventar bilan **merge** (boshqa guruhlar o‘chmaydi). To‘liq qayta yozish: `tsx ... --fresh`.
 * `/lesson-1` barcha 3 vazifa `src/data/lessonOneTasks.ts` dan (eski MatchingPairs/Sentence sahifalar emas).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { getLessonOneInventoryGroups } from './_lib/lessonOneVazifaOneInventory.js';

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

type ConstScope = Map<string, Json[]>;

function asJson(node: ts.Expression, scope?: ConstScope): Json | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (scope && ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.argumentExpression && ts.isNumericLiteral(node.argumentExpression)) {
    const arr = scope.get(node.expression.text);
    if (arr) {
      const idx = Number(node.argumentExpression.text);
      if (idx >= 0 && idx < arr.length) return arr[idx];
    }
  }
  if (ts.isArrayLiteralExpression(node)) {
    const arr: Json[] = [];
    for (const el of node.elements) {
      if (!ts.isExpression(el)) return undefined;
      const parsed = asJson(el, scope);
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
      const parsed = asJson(prop.initializer, scope);
      if (parsed === undefined) return undefined;
      obj[key] = parsed;
    }
    return obj;
  }
  return undefined;
}

function asJsonWithIdentScope(node: ts.Expression, scope: ConstScope, identScope: Map<string, Json>): Json | undefined {
  if (ts.isIdentifier(node)) {
    const val = identScope.get(node.text);
    if (val !== undefined) return val;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) {
    const arr: Json[] = [];
    for (const el of node.elements) {
      if (!ts.isExpression(el)) return undefined;
      const parsed = asJsonWithIdentScope(el, scope, identScope);
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
      const parsed = asJsonWithIdentScope(prop.initializer, scope, identScope);
      if (parsed === undefined) return undefined;
      obj[key] = parsed;
    }
    return obj;
  }
  if (ts.isAsExpression(node)) return asJsonWithIdentScope(node.expression, scope, identScope);
  return asJson(node, scope);
}

function extractTasksFromText(sourceText: string): ExtractedTask[] {
  const sourceFile = ts.createSourceFile('x.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tasks: ExtractedTask[] = [];

  function parseTaskObject(raw: Record<string, Json>): ExtractedTask | null {
    let type = typeof raw.type === 'string' ? raw.type : null;
    if (!type) {
      if (Array.isArray(raw.pairs)) type = 'matching';
      else if (Array.isArray(raw.words) && typeof raw.correct === 'string') type = 'sentence';
      else if (Array.isArray(raw.options) && typeof raw.correct === 'string') type = 'choice';
      else return null;
    }
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

  const constScope: ConstScope = new Map();

  function collectConsts(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      const name = node.name.text;
      if (name !== 'TASKS') {
        const arr = asJson(node.initializer) as Json[] | undefined;
        if (arr && Array.isArray(arr)) constScope.set(name, arr);
      }
    }
    ts.forEachChild(node, collectConsts);
  }
  collectConsts(sourceFile);

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'TASKS' && node.initializer) {
      if (ts.isArrayLiteralExpression(node.initializer)) {
        for (const el of node.initializer.elements) {
          if (!ts.isObjectLiteralExpression(el)) continue;
          const parsed = asJson(el, constScope);
          if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') continue;
          const mapped = parseTaskObject(parsed);
          if (mapped) tasks.push(mapped);
        }
      } else if (ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression) && node.initializer.expression.name.text === 'map') {
        const srcIdent = node.initializer.expression.expression;
        if (ts.isIdentifier(srcIdent)) {
          const srcArr = constScope.get(srcIdent.text);
          const mapFn = node.initializer.arguments[0];
          if (srcArr && mapFn && (ts.isArrowFunction(mapFn) || ts.isFunctionExpression(mapFn))) {
            const params = mapFn.parameters;
            if (params.length >= 1 && ts.isObjectBindingPattern(params[0].name)) {
              const bindings = params[0].name.elements;
              const paramNames = bindings.map(b => ts.isIdentifier(b.name) ? b.name.text : '');
              const body = ts.isBlock(mapFn.body) ? null : mapFn.body;
              if (body && ts.isParenthesizedExpression(body) && ts.isObjectLiteralExpression(body.expression) || body && ts.isObjectLiteralExpression(body)) {
                const objExpr = ts.isParenthesizedExpression(body) ? body.expression as ts.ObjectLiteralExpression : body as ts.ObjectLiteralExpression;
                for (const srcItem of srcArr) {
                  if (!srcItem || typeof srcItem !== 'object' || Array.isArray(srcItem)) continue;
                  const itemScope: ConstScope = new Map(constScope);
                  for (const pName of paramNames) {
                    const val = (srcItem as Record<string, Json>)[pName];
                    if (typeof val === 'string') itemScope.set(pName, [val]);
                  }
                  const fnScope = new Map<string, Json>();
                  for (const pName of paramNames) {
                    const val = (srcItem as Record<string, Json>)[pName];
                    if (val !== undefined) fnScope.set(pName, val);
                  }
                  const resolved = asJsonWithIdentScope(objExpr, itemScope, fnScope);
                  if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
                    const mapped = parseTaskObject(resolved);
                    if (mapped) tasks.push(mapped);
                  }
                }
              }
            }
          }
        }
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
      }
      const byCode =
        src.match(/lessonPath="([^"]+)"/) ||
        src.match(/navigate\('([^']*\/lesson-\d+)'\)/);
      const taskByCode = src.match(/taskNumber=\{(\d+)\}/);
      if (byCode) lessonPath = byCode[1];
      if (taskByCode) taskNumber = Number(taskByCode[1]);
    }

    byKey.set(inventoryKey(lessonPath, taskNumber), {
      lessonPath,
      taskNumber,
      sourceFile: path.relative(ROOT, abs),
      tasks,
    });
  }

  for (const g of getLessonOneInventoryGroups()) {
    byKey.set(inventoryKey(g.lessonPath, g.taskNumber), g as ExtractedLesson);
  }

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
