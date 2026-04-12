/**
 * Faqat `lesson_tasks_inventory.json` ichida `/lesson-1` + task 1 blokini yangilaydi (qolgan guruhlarga tegmaydi).
 * To‘liq extract: `npm run extract:lesson-tasks` (merge rejimi).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getLessonOneVazifaOneInventoryGroup } from './_lib/lessonOneVazifaOneInventory.js';

const ROOT = process.cwd();
const INV_PATH = path.join(ROOT, 'scripts/generated/lesson_tasks_inventory.json');

type Inv = { generatedAt: string; lessons: Array<{ lessonPath: string; taskNumber: number; sourceFile?: string; tasks: unknown[] }> };

async function main() {
  const raw = await fs.readFile(INV_PATH, 'utf8');
  const inv = JSON.parse(raw) as Inv;

  const block = getLessonOneVazifaOneInventoryGroup();
  const rest = inv.lessons.filter((l) => !(l.lessonPath === '/lesson-1' && l.taskNumber === 1));
  inv.lessons = [...rest, block].sort((a, b) => {
    if (a.lessonPath !== b.lessonPath) return a.lessonPath.localeCompare(b.lessonPath);
    return a.taskNumber - b.taskNumber;
  });
  inv.generatedAt = new Date().toISOString();
  await fs.writeFile(INV_PATH, JSON.stringify(inv, null, 2));
  console.log(`Patched ${INV_PATH}: /lesson-1 task 1 -> ${block.tasks.length} savol`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
