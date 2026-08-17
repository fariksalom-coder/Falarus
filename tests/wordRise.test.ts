import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MISTAKES,
  TARGET_SHARE,
  WORD_RISE_GENDERS,
  WORD_RISE_GENDER_META,
  WRONG_PENALTY,
  genderOf,
  genderWords,
  isTargetWord,
  pickNextWord,
  spawnDelayMs,
  travelMs,
  wordScore,
} from '../shared/wordRise';

const VOWELS = 'аеёиоуыэюя';

/** Qoidaga bo'ysunmaydigan, lekin to'g'ri klassik istisnolar. */
const KNOWN_EXCEPTIONS: Record<string, string> = {
  папа: 'm', дядя: 'm', дедушка: 'm', мужчина: 'm', юноша: 'm', староста: 'm',
  время: 'n', имя: 'n', племя: 'n', семя: 'n', знамя: 'n', пламя: 'n', бремя: 'n',
};

test('«ь» bilan tugagan so‘z hech bir rodda yo‘q', () => {
  for (const g of WORD_RISE_GENDERS) {
    const bad = genderWords(g).filter((w) => w.endsWith('ь'));
    assert.deepEqual(bad, [], `${g} rodida «ь» bilan tugagan so‘z bor`);
  }
});

test('har bir so‘z oxirgi harf qoidasiga mos (istisnolardan tashqari)', () => {
  const wrong: string[] = [];
  for (const g of WORD_RISE_GENDERS) {
    for (const w of genderWords(g)) {
      if (KNOWN_EXCEPTIONS[w]) {
        if (KNOWN_EXCEPTIONS[w] !== g) wrong.push(`${w}: istisno ${KNOWN_EXCEPTIONS[w]} ≠ ${g}`);
        continue;
      }
      const last = w.at(-1) as string;
      const expected =
        last === 'а' || last === 'я'
          ? 'f'
          : last === 'о' || last === 'е' || last === 'ё'
            ? 'n'
            : VOWELS.includes(last)
              ? null
              : 'm';
      if (expected !== g) wrong.push(`${w}: kutilgan ${expected}, bazada ${g}`);
    }
  }
  assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} ta so‘z rodi qoidaga zid`);
});

test('rodlar bo‘sh emas, takrorsiz va bir-biriga kesishmaydi', () => {
  const seen = new Map<string, string>();
  for (const g of WORD_RISE_GENDERS) {
    const words = genderWords(g);
    assert.ok(words.length > 300, `${g} rodida so‘z juda kam: ${words.length}`);
    assert.equal(new Set(words).size, words.length, `${g} rodida takror bor`);
    for (const w of words) {
      assert.ok(!seen.has(w), `«${w}» ikki rodda: ${seen.get(w)} va ${g}`);
      seen.set(w, g);
      assert.ok(/^[а-яё]+$/.test(w), `«${w}» tozalanmagan`);
    }
  }
});

test('har bir rod uchun izoh va nomi bor', () => {
  for (const g of WORD_RISE_GENDERS) {
    const m = WORD_RISE_GENDER_META[g];
    assert.equal(m.gender, g);
    assert.ok(m.ru.length > 0 && m.uz.length > 0 && m.hint.length > 0);
  }
});

test('so‘zning rodi to‘g‘ri aniqlanadi', () => {
  assert.equal(genderOf('стол'), 'm');
  assert.equal(genderOf('СТОЛ'), 'm');
  assert.equal(genderOf(' мама '), 'f');
  assert.equal(genderOf('окно'), 'n');
  assert.equal(genderOf('быстро'), null, 'ravish o‘yinda bo‘lmasligi kerak');
  assert.equal(isTargetWord('мама', 'f'), true);
  assert.equal(isTargetWord('мама', 'm'), false);
  assert.equal(isTargetWord('быстро', 'm'), false);
});

test('uzun so‘zga ko‘proq vaqt beriladi, o‘yin esa tezlashadi', () => {
  assert.ok(travelMs('библиотека', { caught: 0 }) > travelMs('дом', { caught: 0 }));
  const fresh = travelMs('работа', { caught: 0 });
  assert.ok(travelMs('работа', { caught: 30 }) < fresh);
  assert.ok(travelMs('работа', { caught: 10_000 }) >= Math.round(fresh * 0.55) - 1);
});

test('so‘z chiqish oralig‘i qisqaradi, lekin 850 ms dan pastga tushmaydi', () => {
  assert.ok(spawnDelayMs({ caught: 0 }) > spawnDelayMs({ caught: 20 }));
  assert.ok(spawnDelayMs({ caught: 10_000 }) >= 850);
});

test('ball uzunlikka qarab beriladi, jarima va xato chegarasi belgilangan', () => {
  assert.equal(wordScore('дом'), 10);
  assert.equal(wordScore('стол'), 12);
  assert.ok(wordScore('библиотека') > wordScore('стол'));
  assert.equal(MAX_MISTAKES, 3);
  assert.equal(WRONG_PENALTY, 5);
});

test('so‘zlar aralash chiqadi: tanlangan rod ham, begonalari ham', () => {
  const hit = pickNextWord('f', new Set(), [], () => 0);
  assert.equal(hit?.gender, 'f');
  const miss = pickNextWord('f', new Set(), [], () => 0.99);
  assert.ok(miss && miss.gender !== 'f', 'begona rod chiqishi kerak');
  assert.equal(genderOf(miss!.word), miss!.gender, 'qaytgan rod so‘zga mos bo‘lishi kerak');
});

test('aralashma taxminan TARGET_SHARE nisbatida bo‘ladi', () => {
  let i = 0;
  // 0, 0.1, … 0.9 — teng taqsimlangan «tasodif»
  const seq = () => {
    const v = (i % 10) / 10;
    i += 1;
    return v;
  };
  let target = 0;
  const total = 400;
  for (let k = 0; k < total; k += 1) {
    if (pickNextWord('m', new Set(), [], seq)?.gender === 'm') target += 1;
  }
  const share = target / total;
  assert.ok(
    Math.abs(share - TARGET_SHARE) < 0.15,
    `tanlangan rod ulushi ${share}, kutilgan ~${TARGET_SHARE}`,
  );
});

test('ekrandagi so‘z qayta chiqmaydi', () => {
  const onScreen = genderWords('f').slice(0, 3);
  for (let k = 0; k < 50; k += 1) {
    const picked = pickNextWord('f', new Set(), onScreen);
    assert.ok(picked && !onScreen.includes(picked.word), 'ekrandagi so‘z qayta chiqdi');
  }
});

test('rod tugasa tarix tozalanadi va o‘yin to‘xtamaydi', () => {
  const all = genderWords('n');
  const used = new Set(all);
  const picked = pickNextWord('n', used, [], () => 0);
  assert.ok(picked, 'so‘z topilishi kerak');
  assert.ok(used.size < all.length, 'tarix tozalanishi kerak');
});
