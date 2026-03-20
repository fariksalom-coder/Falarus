import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiHandler from '../api/[...path].ts';
import authHandler from '../api/auth/[...path].ts';

type InvokeOptions = {
  method: string;
  url: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
};

type MockResponse = VercelResponse & {
  statusCode: number;
  body: unknown;
  headersSentMap: Record<string, string>;
};

function buildQueryString(query: InvokeOptions['query']) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      continue;
    }
    if (typeof value === 'string') params.set(key, value);
  }
  const raw = params.toString();
  return raw ? `?${raw}` : '';
}

function createMockResponse(resolve: (value: MockResponse) => void): MockResponse {
  const res = {
    statusCode: 200,
    body: undefined,
    headersSentMap: {},
    setHeader(name: string, value: string) {
      this.headersSentMap[name.toLowerCase()] = String(value);
      return this;
    },
    getHeader(name: string) {
      return this.headersSentMap[name.toLowerCase()];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      resolve(this as MockResponse);
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      resolve(this as MockResponse);
      return this;
    },
    end(payload?: unknown) {
      this.body = payload;
      resolve(this as MockResponse);
      return this;
    },
  } as MockResponse;

  return res;
}

async function invoke(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown,
  options: InvokeOptions
) {
  return await new Promise<MockResponse>((resolve, reject) => {
    const url = `${options.url}${buildQueryString(options.query)}`;
    const req = {
      method: options.method,
      url,
      query: options.query ?? {},
      headers: options.headers ?? {},
      body: options.body,
    } as VercelRequest;
    const res = createMockResponse(resolve);
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

function assertOk(
  response: MockResponse,
  label: string
): asserts response is MockResponse & { statusCode: 200 } {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `${label} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`
    );
  }
}

function authHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
}

async function requestAuth(path: string, body: Record<string, unknown>) {
  const segments = path.split('/').filter(Boolean).slice(2);
  const res = await invoke(authHandler, {
    method: 'POST',
    url: path,
    query: { path: segments },
    headers: { 'content-type': 'application/json' },
    body,
  });
  assertOk(res, `POST ${path}`);
  console.log(`[OK] POST ${path}`);
  return res.body as Record<string, any>;
}

async function requestApi(
  method: string,
  path: string,
  token: string,
  query?: Record<string, string | string[] | undefined>,
  body?: unknown
) {
  const segments = path.split('/').filter(Boolean).slice(1);
  const mergedQuery = { path: segments, ...(query ?? {}) };
  const res = await invoke(apiHandler, {
    method,
    url: path,
    query: mergedQuery,
    headers: authHeaders(token),
    body,
  });
  assertOk(res, `${method} ${path}`);
  console.log(`[OK] ${method} ${path}`);
  return res.body as any;
}

async function main() {
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `catchall_${nonce}@example.com`;
  const password = 'Catchall123!';

  const register = await requestAuth('/api/auth/register', {
    firstName: 'Catchall',
    lastName: 'Smoke',
    email,
    password,
  });
  const token = register.token as string;
  if (!token) throw new Error('Register succeeded without token');

  await requestApi('POST', '/api/user/onboard', token, undefined, { level: 'A0' });
  await requestApi('GET', '/api/user/me', token);
  const access = await requestApi('GET', '/api/user/access', token);
  await requestApi('GET', '/api/user/payments', token);
  await requestApi('GET', '/api/leaderboard', token, { period: 'all' });
  await requestApi('GET', '/api/lesson-task-results', token);

  const lessons = await requestApi('GET', '/api/lessons', token);
  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new Error('GET /api/lessons returned no lessons');
  }
  const firstLesson = lessons.find((lesson: any) => !lesson.locked) ?? lessons[0];
  await requestApi('GET', `/api/lessons/${firstLesson.id}/preview`, token);
  if (!firstLesson.locked) {
    await requestApi('GET', `/api/lessons/${firstLesson.id}`, token);
    await requestApi('POST', `/api/lessons/${firstLesson.id}/complete`, token);
  }

  await requestApi('GET', '/api/vocabulary', token);
  await requestApi('POST', '/api/vocabulary', token, undefined, {
    word_ru: `слово-${nonce}`,
    translation_uz: `tarjima-${nonce}`,
    example_ru: 'Пример',
  });
  const topics = await requestApi('GET', '/api/vocabulary/topics', token);
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error('GET /api/vocabulary/topics returned no topics');
  }

  const topicId =
    access.subscription_active === true
      ? topics[0]?.id
      : access.vocabulary_free_topic_id || topics[0]?.id;
  if (!topicId) {
    throw new Error('No topic available for catch-all smoke test');
  }

  const subtopics = await requestApi(
    'GET',
    `/api/vocabulary/subtopics/${topicId}`,
    token
  );
  if (!Array.isArray(subtopics) || subtopics.length === 0) {
    throw new Error('GET /api/vocabulary/subtopics/:topicId returned no subtopics');
  }

  const openSubtopic =
    subtopics.find((subtopic: any) => !subtopic.locked) ?? subtopics[0];
  await requestApi(
    'GET',
    `/api/vocabulary/subtopic/${openSubtopic.id}/preview`,
    token
  );
  const wordGroups = await requestApi(
    'GET',
    `/api/vocabulary/word-groups/${openSubtopic.id}`,
    token
  );
  await requestApi('GET', '/api/vocabulary/progress', token);
  await requestApi('GET', '/api/vocabulary/daily-word-stats', token);

  if (Array.isArray(wordGroups) && wordGroups.length > 0) {
    const firstGroup = wordGroups[0];
    await requestApi('GET', `/api/vocabulary/tasks/${firstGroup.id}`, token);
    await requestApi(
      'GET',
      `/api/vocabulary/word-groups/${firstGroup.id}/steps`,
      token
    );
    if (firstGroup.part_id) {
      await requestApi('POST', '/api/vocabulary/progress', token, undefined, {
        topic_id: topicId,
        subtopic_id: openSubtopic.id,
        part_id: firstGroup.part_id,
        result_count: 0,
      });
    }
  }

  console.log(`Catch-all smoke passed for ${email}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Catch-all smoke failed: ${message}`);
  process.exit(1);
});
