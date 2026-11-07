/**
 * teacherChat.test.ts — ustoz ↔ o'quvchi chati: tartib, `after` kursori, o'qilganlik.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasUnreadFor,
  lastChatMessageId,
  mergeChatMessages,
  parseChatAfterId,
  toChronological,
} from '../shared/teacherChat';

const msg = (id: number, sender: number, minute: number, read = false) => ({
  id,
  sender_user_id: sender,
  created_at: new Date(Date.UTC(2026, 0, 1, 10, minute)).toISOString(),
  read_at: read ? '2026-01-01T12:00:00.000Z' : null,
});

describe('parseChatAfterId', () => {
  it('musbat butun sonni qabul qiladi', () => {
    assert.strictEqual(parseChatAfterId('42'), 42);
    assert.strictEqual(parseChatAfterId(7), 7);
    assert.strictEqual(parseChatAfterId(['9', '10']), 9);
  });
  it('yaroqsiz qiymat — birinchi yuklash (null)', () => {
    for (const v of [undefined, '', 'abc', '0', '-3', '1.5', null, {}]) assert.strictEqual(parseChatAfterId(v), null);
  });
});

describe('toChronological', () => {
  it('serverdan kelgan eng yangi-birinchi roʻyxatni eskidan yangiga aylantiradi', () => {
    const newestFirst = [msg(3, 1, 3), msg(2, 2, 2), msg(1, 1, 1)];
    assert.deepStrictEqual(toChronological(newestFirst).map((m) => m.id), [1, 2, 3]);
  });
  it('bir xil vaqtda id boʻyicha tartiblaydi', () => {
    assert.deepStrictEqual(toChronological([msg(5, 1, 1), msg(4, 2, 1)]).map((m) => m.id), [4, 5]);
  });
});

describe('hasUnreadFor', () => {
  it('faqat suhbatdoshdan kelgan oʻqilmagan xabar hisoblanadi', () => {
    assert.strictEqual(hasUnreadFor([msg(1, 10, 1)], 10), false, 'oʻzimning xabarim');
    assert.strictEqual(hasUnreadFor([msg(1, 20, 1, true)], 10), false, 'allaqachon oʻqilgan');
    assert.strictEqual(hasUnreadFor([msg(1, 20, 1)], 10), true);
    assert.strictEqual(hasUnreadFor([], 10), false);
  });
});

describe('mergeChatMessages', () => {
  it('yuborilgan xabar polling bilan qayta kelsa takrorlanmaydi', () => {
    const prev = [msg(1, 1, 1), msg(3, 1, 3)];
    const merged = mergeChatMessages(prev, [msg(2, 2, 2), msg(3, 1, 3)]);
    assert.deepStrictEqual(merged.map((m) => m.id), [1, 2, 3]);
  });
  it('yangi xabar boʻlmasa oʻsha massivni qaytaradi (qayta render yoʻq)', () => {
    const prev = [msg(1, 1, 1)];
    assert.strictEqual(mergeChatMessages(prev, []), prev);
  });
  it('kursor — eng katta id', () => {
    assert.strictEqual(lastChatMessageId([msg(4, 1, 1), msg(9, 1, 2), msg(7, 1, 3)]), 9);
    assert.strictEqual(lastChatMessageId([]), null);
  });
});
