import jwt from 'jsonwebtoken';

export const LESSON_CONVERSATION_MS = 5 * 60_000;

export function createLessonSession(userId: number, day: number) {
  const expiresAt = Date.now() + LESSON_CONVERSATION_MS;
  const lessonSession = jwt.sign({ purpose: 'lesson-conversation', userId, day, exp: Math.floor(expiresAt / 1000) }, String(process.env.JWT_SECRET), { algorithm: 'HS256' });
  return { lessonSession, expiresAt: Math.floor(expiresAt / 1000) * 1000 };
}

export function readLessonSession(token: string, userId: number) {
  try {
    const value = jwt.verify(token, String(process.env.JWT_SECRET), { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (value.purpose !== 'lesson-conversation' || value.userId !== userId || !Number.isInteger(value.day) || !value.exp) throw new Error('invalid');
    return { day: value.day as number, expiresAt: value.exp * 1000 };
  } catch (error) {
    const expired = error instanceof jwt.TokenExpiredError;
    throw Object.assign(new Error(expired ? 'Suhbat yakunlandi.' : 'Suhbat sessiyasi noto‘g‘ri.'), { status: expired ? 410 : 403 });
  }
}
