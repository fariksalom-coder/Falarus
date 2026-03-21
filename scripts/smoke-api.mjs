import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function parseEnvFile(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

const envFromFile = parseEnvFile(resolve(process.cwd(), '.env'));
const env = { ...envFromFile, ...process.env };

const baseUrl =
  env.SMOKE_BASE_URL ||
  env.VITE_API_URL ||
  env.APP_URL;

if (!baseUrl) {
  console.error('test:smoke requires SMOKE_BASE_URL, VITE_API_URL, or APP_URL');
  process.exit(1);
}

function toUrl(path) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

async function request(path, init = {}) {
  const res = await fetch(toUrl(path), init);
  const body = await res.json().catch(() => null);
  return { res, body };
}

async function requireOk(path, init = {}, label = path) {
  const { res, body } = await request(path, init);
  if (!res.ok) {
    throw new Error(`${label} failed with ${res.status}: ${JSON.stringify(body)}`);
  }
  console.log(`[OK] ${label}`);
  return body;
}

async function getToken() {
  if (env.SMOKE_BEARER_TOKEN) return env.SMOKE_BEARER_TOKEN;
  if (!env.SMOKE_EMAIL || !env.SMOKE_PASSWORD) {
    throw new Error('Provide SMOKE_BEARER_TOKEN or SMOKE_EMAIL + SMOKE_PASSWORD');
  }
  const body = await requireOk(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: env.SMOKE_EMAIL,
        password: env.SMOKE_PASSWORD,
      }),
    },
    'POST /api/auth/login'
  );
  if (!body?.token) {
    throw new Error('Login succeeded without token');
  }
  return body.token;
}

try {
  const token = await getToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const me = await requireOk('/api/user/me', { headers: authHeaders }, 'GET /api/user/me');
  const access = await requireOk('/api/user/access', { headers: authHeaders }, 'GET /api/user/access');
  const lessons = await requireOk('/api/lessons', { headers: authHeaders }, 'GET /api/lessons');

  if (Array.isArray(lessons) && lessons.length > 0) {
    const firstLesson = lessons[0];
    const firstId = Number(firstLesson.id);
    if (!Number.isFinite(firstId)) {
      throw new Error('GET /api/lessons returned invalid id');
    }
    await requireOk(
      `/api/lessons/preview?lesson_id=${encodeURIComponent(String(firstId))}`,
      { headers: authHeaders },
      'GET /api/lessons/preview?lesson_id='
    );
    if (!firstLesson.locked) {
      await requireOk(
        `/api/lessons/${firstId}`,
        { headers: authHeaders },
        'GET /api/lessons/:id'
      );
    }

    const lockedLesson = lessons.find((lesson) => lesson.locked);
    if (lockedLesson) {
      const lid = Number(lockedLesson.id);
      if (Number.isFinite(lid)) {
        await requireOk(
          `/api/lessons/preview?lesson_id=${encodeURIComponent(String(lid))}`,
          { headers: authHeaders },
          'GET locked lesson preview (query)'
        );
      }
    }
  }

  const topics = await requireOk('/api/vocabulary/topics', { headers: authHeaders }, 'GET /api/vocabulary/topics');
  const topicId =
    access.subscription_active
      ? topics?.[0]?.id
      : access.vocabulary_free_topic_id || topics?.[0]?.id;

  if (!topicId) {
    throw new Error('No vocabulary topic available for smoke test');
  }

  const subtopics = await requireOk(
    `/api/vocabulary/subtopics?topic=${encodeURIComponent(topicId)}`,
    { headers: authHeaders },
    'GET /api/vocabulary/subtopics?topic='
  );

  const openSubtopic =
    subtopics.find((subtopic) => !subtopic.locked) ||
    subtopics[0];

  if (!openSubtopic?.id) {
    throw new Error('No vocabulary subtopic available for smoke test');
  }

  await requireOk(
    `/api/vocabulary/subtopic/${openSubtopic.id}/preview`,
    { headers: authHeaders },
    'GET /api/vocabulary/subtopic/:subtopicId/preview'
  );

  const subtopicParam = encodeURIComponent(openSubtopic.slug ?? openSubtopic.id);
  const groups = await requireOk(
    `/api/vocabulary/word-groups?subtopic=${subtopicParam}`,
    { headers: authHeaders },
    'GET /api/vocabulary/word-groups?subtopic='
  );

  if (Array.isArray(groups) && groups.length > 0) {
    const group = groups[0];
    await requireOk(
      `/api/vocabulary/tasks/${group.id}`,
      { headers: authHeaders },
      'GET /api/vocabulary/tasks/:wordGroupId'
    );
    await requireOk(
      `/api/vocabulary/word-groups/${group.id}/steps`,
      { headers: authHeaders },
      'GET /api/vocabulary/word-groups/:wordGroupId/steps'
    );
  }

  await requireOk('/api/vocabulary/progress', { headers: authHeaders }, 'GET /api/vocabulary/progress');
  await requireOk(
    '/api/vocabulary/daily-word-stats',
    { headers: authHeaders },
    'GET /api/vocabulary/daily-word-stats'
  );

  console.log(`Smoke API check passed for user ${me?.email ?? me?.id ?? 'unknown'}.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Smoke API check failed: ${message}`);
  process.exit(1);
}
