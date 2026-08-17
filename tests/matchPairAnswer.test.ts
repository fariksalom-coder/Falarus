/**
 * matchPairAnswer.test.ts — "juftlikni top" mashqida javob taqqoslash.
 *
 * Asosiy holat: bir blokda bir nechta juft BIR XIL o'ng tomonga ega bo'lishi
 * mumkin (26-kun: Мы/Вы/Они -> были). Ilgari tekshiruv juft indeksiga qarardi
 * va o'quvchi to'g'ri kartani tanlasa ham "noto'g'ri" olardi.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normMatchText, sameMatchText } from '../shared/matchPairAnswer';

describe('sameMatchText', () => {
  it('bir xil matnni qabul qiladi', () => {
    assert.ok(sameMatchText('были', 'были'));
  });

  it('registrni hisobga olmaydi', () => {
    assert.ok(sameMatchText('Были', 'были'));
  });

  it('tinish belgilarini hisobga olmaydi', () => {
    assert.ok(sameMatchText('… они вышли на улицу.', '… они вышли на улицу'));
    assert.ok(sameMatchText('пять домов', 'пять домов.'));
  });

  it('ё va е ni tenglashtiradi', () => {
    assert.ok(sameMatchText('её', 'ее'));
  });

  it('haqiqiy farqni saqlaydi', () => {
    assert.ok(!sameMatchText('был', 'была'));
    assert.ok(!sameMatchText('меня', 'тебя'));
  });

  it("bo'sh matn hech qachon mos kelmaydi", () => {
    assert.ok(!sameMatchText('', ''));
    assert.ok(!sameMatchText('   ', 'были'));
  });

  it('normallashtirish natijasi kutilganidek', () => {
    assert.strictEqual(normMatchText('  Пять,  ДОМОВ.  '), 'пять домов');
  });
});

describe('26-kun holati: uchta bir xil "были" kartasi', () => {
  // Blok: Мы->были, Вы->были, Они->были, Он->был
  const pairs = [
    { left: 'Мы', right: 'были' },
    { left: 'Вы (вежливо / мн.)', right: 'были' },
    { left: 'Они', right: 'были' },
    { left: 'Он (еркак)', right: 'был' },
  ];

  it("o'quvchi ISTALGAN \"были\" kartasini tanlasa to'g'ri bo'ladi", () => {
    const left = pairs[0]; // Мы
    for (const right of pairs.filter((p) => p.right === 'были')) {
      assert.ok(sameMatchText(left.right, right.right), `"${right.right}" qabul qilinishi kerak`);
    }
  });

  it("noto'g'ri shakl baribir rad etiladi", () => {
    assert.ok(!sameMatchText(pairs[0].right, pairs[3].right)); // были != был
  });

  it("hamma juft yopilganda blok tugaydi (2 karta x 4 juft)", () => {
    // Chapdan har biri o'ziga mos matnli o'ngni topadi — 4 juft, 8 karta.
    const matched: string[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const right = pairs.findIndex((p) => sameMatchText(pairs[i].right, p.right) && !matched.includes(`r${p.left}`));
      assert.notStrictEqual(right, -1);
      matched.push(`l${i}`, `r${pairs[right].left}`);
    }
    assert.strictEqual(matched.length, pairs.length * 2);
  });
});
