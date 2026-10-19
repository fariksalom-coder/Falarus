import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createLessonSession, readLessonSession } from '../server/services/lessonConversationSession.js';

process.env.JWT_SECRET = 'lesson-session-test-secret';
test('lesson session shares a five-minute deadline across transports', () => {
  const start = Date.now();
  const session = createLessonSession(12, 5);
  const live = readLessonSession(session.lessonSession, 12);
  const fallback = readLessonSession(session.lessonSession, 12);
  assert.deepEqual(live, fallback);
  assert.equal(live.day, 5);
  assert.equal(live.expiresAt, session.expiresAt);
  assert.ok(session.expiresAt - start > 299_000 && session.expiresAt - start <= 300_000);
});
test('another student and a normal login token cannot bypass the quota', () => {
  const session = createLessonSession(12, 5);
  assert.throws(() => readLessonSession(session.lessonSession, 13), { status: 403 });
  const login = jwt.sign({ id: 12 }, process.env.JWT_SECRET!);
  assert.throws(() => readLessonSession(login, 12), { status: 403 });
  assert.throws(() => readLessonSession(session.lessonSession + 'x', 12), { status: 403 });
});
test('expired session ends the exercise without an hours-long block', () => {
  const expired = jwt.sign({ purpose: 'lesson-conversation', userId: 12, day: 5, exp: Math.floor(Date.now() / 1000) - 1 }, process.env.JWT_SECRET!);
  assert.throws(() => readLessonSession(expired, 12), { status: 410, message: 'Suhbat yakunlandi.' });
});
