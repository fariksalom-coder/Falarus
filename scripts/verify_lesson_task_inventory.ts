/**
 * Inventorydagi har bir (lessonPath, taskNumber) guruhidagi savollar sonini
 * `getExpectedLessonTaskCount` bilan solishtiradi.
 * Standart: faqat ogohlantirish (extract va statik reestr farq qilishi mumkin).
 * `npm run verify:lesson-task-inventory -- --strict` — ziddiyatda exit 1.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getExpectedLessonTaskCount } from '../src/data/unifiedLessonVazifaRegistry';

type Inventory = {
  lessons: Array<{
    lessonPath: string;
    taskNumber: number;
    tasks: unknown[];
  }>;
};

async function main() {
  const strict = process.argv.includes('--strict');
  const invPath = path.resolve(process.cwd(), 'scripts/generated/lesson_tasks_inventory.json');
  const text = await fs.readFile(invPath, 'utf8');
  const inventory: Inventory = JSON.parse(text);

  const mismatches: string[] = [];
  for (const g of inventory.lessons) {
    const expected = getExpectedLessonTaskCount(g.lessonPath, g.taskNumber);
    const actual = g.tasks.length;
    if (expected != null && expected !== actual) {
      mismatches.push(`${g.lessonPath} task=${g.taskNumber}: inventory=${actual} registry=${expected}`);
    }
  }

  if (mismatches.length > 0) {
    console.warn(`Ogohlantirish: ${mismatches.length} ta ziddiyat (extract vs static registry):`);
    for (const m of mismatches) console.warn(`  ${m}`);
    if (strict) process.exit(1);
  } else {
    console.log(`OK: ${inventory.lessons.length} guruh — registry bilan ziddiyat yo‘q (yoki expected=null).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
