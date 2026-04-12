/**
 * Task questions without `/api/lessons/.../tasks/...` path shape (no `%2F`, single serverless route).
 */
import './_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';
import { routeLessonsRequest } from './_lib/lessons.js';

function firstQuery(req: VercelRequest, key: string): string {
  const v = req.query[key];
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0].trim();
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const userId = requireAuth(req, res);
  if (userId == null) return;

  const lessonId = Number(firstQuery(req, 'lesson_id'));
  const taskNumber = Number(firstQuery(req, 'task_number'));
  if (!Number.isFinite(lessonId) || lessonId <= 0 || !Number.isFinite(taskNumber) || taskNumber <= 0) {
    return res.status(400).json({ error: 'lesson_id va task_number kerak' });
  }

  return routeLessonsRequest(req, res, userId, [String(lessonId), 'tasks', String(taskNumber)]);
}
