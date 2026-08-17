/**
 * Konsol skriptni o'zi tranzaksiyaga o'raydi. Kun kontenti skriptlari esa odatda
 * `BEGIN; ... COMMIT;` bilan yoziladi — skriptdagi COMMIT konsolnikini yopib
 * qo'yardi va "Tekshirish" o'zgarishlarni bekor qila olmasdi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { neutralizeTransactionControl } from '../server/services/sqlConsole.service.ts';

test('BEGIN va COMMIT bo\'sh joyga almashtiriladi', () => {
  const sql = "BEGIN;\nDELETE FROM daily_vocab_words WHERE day_number = 110;\nCOMMIT;";
  const { text, ignored } = neutralizeTransactionControl(sql);

  assert.deepEqual(ignored, ['BEGIN;', 'COMMIT;']);
  assert.ok(!/\bBEGIN\b/i.test(text));
  assert.ok(!/\bCOMMIT\b/i.test(text));
  assert.ok(text.includes('DELETE FROM daily_vocab_words WHERE day_number = 110;'));
  // Belgilar soni va qatorlar saqlanadi — Postgres xatosidagi joy raqami to'g'ri qolsin.
  assert.equal(text.length, sql.length);
  assert.equal(text.split('\n').length, sql.split('\n').length);
});

test("matn ichidagi nuqtali vergul buyruqni bo'lmaydi", () => {
  const sql =
    "INSERT INTO daily_reading_lexemes (word_ru, translation_uz, text_id, word_ru_normalized)\n" +
    "VALUES ('семьи','oila uchun; oilasiz','kunlik-oqish-110','семьи');\nCOMMIT;";
  const { text, ignored } = neutralizeTransactionControl(sql);

  assert.deepEqual(ignored, ['COMMIT;']);
  assert.ok(text.includes("'oila uchun; oilasiz'"));
  assert.ok(text.trimEnd().endsWith("'семьи');"));
});

test("izoh ichidagi COMMIT va ustun nomidagi so'zlar tegilmaydi", () => {
  const sql =
    "-- COMMIT; bu shunchaki izoh\n" +
    "UPDATE daily_grammar_mcqs SET question_text = 'end; begin' WHERE id = 1;\n" +
    "END;";
  const { text, ignored } = neutralizeTransactionControl(sql);

  assert.deepEqual(ignored, ['END;']);
  assert.ok(text.includes('-- COMMIT; bu shunchaki izoh'));
  assert.ok(text.includes("'end; begin'"));
});

test('tranzaksiya buyruqlari yo\'q bo\'lsa skript o\'zgarmaydi', () => {
  const sql = 'SELECT count(*) FROM daily_vocab_words WHERE day_number = 1;';
  const { text, ignored } = neutralizeTransactionControl(sql);

  assert.equal(text, sql);
  assert.deepEqual(ignored, []);
});

test("SAVEPOINT va ROLLBACK TO saqlanadi (ular konsol tranzaksiyasini yopmaydi)", () => {
  const sql = 'SAVEPOINT a;\nUPDATE daily_vocab_words SET word_ru = word_ru;\nROLLBACK TO a;';
  const { text, ignored } = neutralizeTransactionControl(sql);

  assert.deepEqual(ignored, []);
  assert.equal(text, sql);
});
