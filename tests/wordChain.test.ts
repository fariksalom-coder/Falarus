/**
 * wordChain.test.ts — "So'z zanjiri" o'yinining qoidalari.
 *
 * Asosiy talab: zanjir ADASHMASLIGI kerak (har so'z oldingisining oxirgi
 * harfidan boshlanadi) va ishlatilgan so'z QAYTA CHIQMASLIGI kerak.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIndex,
  chainLetter,
  checkAnswer,
  normalizeWord,
  pickComputerWord,
  pickStartWord,
  startLetter,
} from '../shared/wordChain';
import { wordsUpToLevel, WORD_CHAIN_WORDS } from '../src/data/wordChainWords';

describe('chainLetter — oxirgi harf qoidasi', () => {
  it('oddiy so\'zda oxirgi harfni oladi', () => {
    assert.strictEqual(chainLetter('автобус'), 'с');
    assert.strictEqual(chainLetter('книга'), 'а');
  });

  it('yumshoq/qattiq belgi hisobga olinmaydi', () => {
    assert.strictEqual(chainLetter('словарь'), 'р');
    assert.strictEqual(chainLetter('подъезд'), 'д');
  });

  it('«ы» va «й» ham o\'tkazib yuboriladi', () => {
    assert.strictEqual(chainLetter('часы'), 'с');
    assert.strictEqual(chainLetter('музей'), 'е');
    assert.strictEqual(chainLetter('красивый'), 'в');
  });

  it('«ё» va «е» bir xil', () => {
    assert.strictEqual(normalizeWord('ёлка'), 'елка');
    assert.strictEqual(chainLetter('её'), 'е');
  });

  it('katta harf va bo\'shliqlarga bog\'liq emas', () => {
    assert.strictEqual(chainLetter('  Автобус '), 'с');
    assert.strictEqual(startLetter(' Книга'), 'к');
  });
});

describe('checkAnswer — o\'yinchi javobi', () => {
  const dictionary = new Set(['автобус', 'слон', 'нос', 'сон']);

  it('to\'g\'ri javobni qabul qiladi', () => {
    const r = checkAnswer({ answer: 'Слон', requiredLetter: 'с', used: new Set() });
    assert.deepStrictEqual(r, { ok: true, word: 'слон' });
  });

  it('LUG\'ATDA YO\'Q so\'zni ham qabul qiladi (bosh harfi to\'g\'ri bo\'lsa)', () => {
    // O'quvchi bilgan istalgan so'zni yozishi mumkin — o'yin uni to'xtatmaydi.
    const r = checkAnswer({ answer: 'самолетик', requiredLetter: 'с', used: new Set() });
    assert.deepStrictEqual(r, { ok: true, word: 'самолетик' });
  });

  it('boshqa harf bilan boshlansa rad etadi', () => {
    const r = checkAnswer({ answer: 'нос', requiredLetter: 'с', used: new Set() });
    assert.strictEqual(r.ok, false);
    assert.strictEqual((r as { reason: string }).reason, 'letter');
  });

  it('ishlatilgan so\'zni rad etadi', () => {
    const r = checkAnswer({ answer: 'слон', requiredLetter: 'с', used: new Set(['слон']) });
    assert.strictEqual((r as { reason: string }).reason, 'used');
  });

  it('bo\'sh yoki bir harfli javobni rad etadi', () => {
    assert.strictEqual(
      (checkAnswer({ answer: '   ', requiredLetter: 'с', used: new Set() }) as { reason: string }).reason,
      'empty',
    );
    assert.strictEqual(
      (checkAnswer({ answer: 'с', requiredLetter: 'с', used: new Set() }) as { reason: string }).reason,
      'empty',
    );
  });

  it('rus harflari bo\'lmasa rad etadi (raqam, lotin yozuvi)', () => {
    for (const bad of ['salom', 'с123', 'с!!']) {
      const r = checkAnswer({ answer: bad, requiredLetter: 'с', used: new Set() });
      assert.strictEqual((r as { reason: string }).reason, 'format', bad);
    }
  });

  it('lug\'at talab qilinsa — eski qoida ham ishlaydi', () => {
    const r = checkAnswer({
      answer: 'сурур',
      requiredLetter: 'с',
      used: new Set(),
      dictionary,
      requireDictionary: true,
    });
    assert.strictEqual((r as { reason: string }).reason, 'unknown');
  });
});

describe('pickComputerWord — kompyuter javobi', () => {
  const index = buildIndex(['слон', 'сон', 'нос', 'носок', 'кот']);

  it('kerakli harfdan boshlanadigan so\'z tanlaydi', () => {
    const w = pickComputerWord({ index, letter: 'с', used: new Set(), random: () => 0 });
    assert.ok(w && startLetter(w) === 'с');
  });

  it('ishlatilgan so\'zni takrorlamaydi', () => {
    const used = new Set(['слон', 'сон']);
    const w = pickComputerWord({ index, letter: 'с', used, random: () => 0 });
    assert.strictEqual(w, null);
  });

  it('o\'yinchiga ko\'proq variant qoldiradigan so\'zni afzal ko\'radi', () => {
    // «сон» -> «н» (2 ta variant: нос, носок), «слон» -> «н» ham.
    // «нос» -> «с», «носок» -> «к» (1 ta: кот). Shuning uchun «н» dan
    // boshlanganda «нос» tanlanishi kerak.
    const w = pickComputerWord({ index, letter: 'н', used: new Set(), random: () => 0 });
    assert.strictEqual(w, 'нос');
  });
});

describe('haqiqiy lug\'at ustida to\'liq o\'yin', () => {
  it('50 ta yurishda zanjir uzilmaydi va so\'z takrorlanmaydi', () => {
    const words = wordsUpToLevel('B2');
    const index = buildIndex(words);
    const dictionary = new Set(words.map(normalizeWord));
    const used = new Set<string>();

    // Takrorlanadigan tasodif — test har safar bir xil kechsin.
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    let current = pickStartWord({ index, used, random });
    assert.ok(current, 'boshlang\'ich so\'z topilishi kerak');
    used.add(current!);

    for (let i = 0; i < 50; i += 1) {
      const letter = chainLetter(current!);
      assert.notStrictEqual(letter, '', `«${current}» dan keyin harf topilmadi`);

      const next = pickComputerWord({ index, letter, used, random });
      assert.ok(next, `«${letter}» harfiga so'z topilmadi (${i}-yurish)`);
      assert.strictEqual(startLetter(next!), letter, 'zanjir uzildi');
      assert.ok(!used.has(next!), 'so\'z takrorlandi');
      assert.ok(dictionary.has(next!), 'lug\'atda yo\'q so\'z tanlandi');

      used.add(next!);
      current = next;
    }
    assert.strictEqual(used.size, 51);
  });

  it('har bir daraja uchun o\'yin boshlanadi va davom etadi', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2'] as const) {
      const words = wordsUpToLevel(level);
      const index = buildIndex(words);
      const used = new Set<string>();
      let current = pickStartWord({ index, used, random: () => 0.5 });
      assert.ok(current, `${level}: boshlang'ich so'z yo'q`);
      used.add(current!);
      for (let i = 0; i < 10; i += 1) {
        const next = pickComputerWord({ index, letter: chainLetter(current!), used, random: () => 0.5 });
        assert.ok(next, `${level}: ${i}-yurishda so'z topilmadi`);
        used.add(next!);
        current = next;
      }
    }
  });

  it('lug\'atda takroriy so\'z yo\'q', () => {
    const all = wordsUpToLevel('B2');
    assert.strictEqual(new Set(all).size, all.length);
  });

  it('darajalar bir-birini takrorlamaydi', () => {
    const seen = new Set<string>();
    for (const level of ['A1', 'A2', 'B1', 'B2'] as const) {
      for (const w of WORD_CHAIN_WORDS[level]) {
        assert.ok(!seen.has(w), `«${w}» ikki darajada takrorlangan`);
        seen.add(w);
      }
    }
  });
});
