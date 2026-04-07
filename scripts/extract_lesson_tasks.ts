import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

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

async function main() {
  const names = await fs.readdir(PAGES_DIR);
  const lessons: ExtractedLesson[] = [];

  for (const name of names) {
    if (!name.endsWith('.tsx')) continue;
    const abs = path.join(PAGES_DIR, name);
    const src = await fs.readFile(abs, 'utf8');
    const tasks = extractTasksFromText(src);
    if (tasks.length === 0) continue;

    let lessonPath = '/lesson-1';
    let taskNumber = 1;
    const byFile = parseLessonRefFromFile(abs);
    if (byFile) {
      lessonPath = byFile.lessonPath;
      taskNumber = byFile.taskNumber;
    } else {
      const byCode =
        src.match(/lessonPath="([^"]+)"/) ||
        src.match(/setLessonTaskResult\(\s*'([^']+)'/) ||
        src.match(/navigate\('([^']*\/lesson-\d+)'\)/);
      const taskByCode =
        src.match(/taskNumber=\{(\d+)\}/) ||
        src.match(/setLessonTaskResult\(\s*'[^']+'\s*,\s*(\d+)/);
      if (byCode) lessonPath = byCode[1];
      if (taskByCode) taskNumber = Number(taskByCode[1]);
    }

    lessons.push({
      lessonPath,
      taskNumber,
      sourceFile: path.relative(ROOT, abs),
      tasks,
    });
  }

  lessons.sort((a, b) => (a.lessonPath === b.lessonPath ? a.taskNumber - b.taskNumber : a.lessonPath.localeCompare(b.lessonPath)));
  const out = {
    generatedAt: new Date().toISOString(),
    lessons,
  };
  const outPath = path.join(ROOT, 'scripts/generated/lesson_tasks_inventory.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${lessons.length} lesson task groups -> scripts/generated/lesson_tasks_inventory.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
