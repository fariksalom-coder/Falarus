import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { buildPraiseInstruction, findUsedPraise, PRAISE_BANKS } from '../server/services/liveLessonPraise';

test('transcribed praise tolerates apostrophes and punctuation, without matching partial words', () => {
  assert.deepEqual(findUsedPraise('Ko’zim quvondi! Oxirini to‘g‘ri aytdingiz.'), ["Ko'zim quvondi"]);
  assert.deepEqual(findUsedPraise('Sabringizga balli!'), ['Sabringizga balli']);
  assert.deepEqual(findUsedPraise('Mening shogirdim, boshlaymiz.'), ['Mening shogirdim']);
  assert.deepEqual(findUsedPraise('Akam bilan gaplashdim. Barakallaxon.'), []);
  assert.deepEqual(findUsedPraise('Bara' + 'kalla!'), ['Barakalla!']);
});

test('seven-day phrases are excluded, including equivalent transcription spelling', () => {
  const prompt = buildPraiseInstruction({ used_praise_phrases: ['Barakalla!', 'Ko’zim quvondi', ...PRAISE_BANKS[5]] });
  assert.ok(!prompt.includes('Barakalla!'));
  assert.ok(!prompt.includes("Ko'zim quvondi"));
  for (const phrase of PRAISE_BANKS[5]) assert.ok(!prompt.includes(phrase));
  assert.ok(prompt.includes('Bank 6: (ishlatilmagan ibora qolmadi)'));
});

test('addresses respect known relative age and gender, with no age inference', () => {
  const addresses = (profile: Parameters<typeof buildPraiseInstruction>[0]) =>
    buildPraiseInstruction(profile).split('\n').find(line => line.startsWith('Murojaat:'));
  assert.equal(addresses({ gender: 'male', age_group: 'older' }), 'Murojaat: Aka.');
  assert.equal(addresses({ gender: 'female', age_group: 'older' }), 'Murojaat: Opa.');
  assert.ok(addresses({ gender: 'male' })?.includes('Shogirdim'));
  assert.ok(!addresses({ gender: 'male' })?.includes('Ukam'));
  assert.ok(addresses({ gender: 'female', age_group: 'younger' })?.includes('Singlijon'));
  assert.equal(addresses({ gender: 'male', age_group: 'older', used_praise_phrases: ['Aka'] }), 'Murojaat: (qolmadi; faqat siz).');
});

test('five-day streak gets one explicit recognition instruction', () => {
  assert.ok(buildPraiseInstruction({ streak_days: 5 }).includes('aynan bir marta qayd et: 5 kun'));
  assert.ok(!buildPraiseInstruction({ streak_days: 4 }).includes('aynan bir marta qayd et:'));
});

test('migration and history upsert preserve per-student rolling seven-day history', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE users (id SERIAL PRIMARY KEY); INSERT INTO users DEFAULT VALUES; INSERT INTO users DEFAULT VALUES;');
    const migration = await readFile(new URL('../db/migrations/184_live_lesson_praise.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(`INSERT INTO live_lesson_praise_usage VALUES
      (1, 'Barakalla!', now() - interval '8 days'),
      (1, 'Ofarin!', now() - interval '6 days'),
      (2, 'Balli!', now());`);
    const recent = () => db.query<{ phrase: string }>(`SELECT phrase FROM live_lesson_praise_usage
      WHERE user_id = $1 AND used_at > now() - interval '7 days' ORDER BY phrase`, [1]);
    assert.deepEqual((await recent()).rows, [{ phrase: 'Ofarin!' }]);
    await db.query(`INSERT INTO live_lesson_praise_usage (user_id, phrase)
      SELECT $1, unnest($2::text[]) ON CONFLICT (user_id, phrase) DO UPDATE SET used_at = now()`, [1, ['Barakalla!']]);
    assert.deepEqual((await recent()).rows, [{ phrase: 'Barakalla!' }, { phrase: 'Ofarin!' }]);
    await db.exec('DELETE FROM users WHERE id = 1');
    assert.deepEqual((await recent()).rows, []);
  } finally { await db.close(); }
});
