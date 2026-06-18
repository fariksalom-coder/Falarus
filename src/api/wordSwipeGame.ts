import { apiUrl } from '../api';

export type WordSwipeStageWord = {
  id: number;
  uz: string;
  ru: string;
};

export type WordSwipeStageResponse = {
  levelNumber: number;
  stageNumber: number;
  gridRows: number;
  gridCols: number;
  words: WordSwipeStageWord[];
};

export type WordSwipeLevelSummary = {
  levelNumber: number;
  stagesCount: number;
  availableStagesCount: number;
};

export type WordSwipeLevelsResponse = {
  levels: WordSwipeLevelSummary[];
};

export type WordSwipeProgressResponse = {
  levelNumber: number;
  stageNumber: number;
  completedStages: Record<string, number[]>;
  completedAvailableStages: boolean;
};

export type SaveWordSwipeProgressPayload = {
  levelNumber: number;
  stageNumber: number;
  completed: boolean;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchWordSwipeLevels(): Promise<WordSwipeLevelsResponse | null> {
  try {
    const res = await fetch(apiUrl('/api/games/word-swipe/levels'));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchWordSwipeStage(
  token: string | null,
  level: number,
  stage: number,
): Promise<WordSwipeStageResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/games/word-swipe/stage?level=${level}&stage=${stage}`),
      { headers: authHeaders(token) },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchWordSwipeProgress(
  token: string,
): Promise<WordSwipeProgressResponse | null> {
  try {
    const res = await fetch(apiUrl('/api/games/word-swipe/progress'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function saveWordSwipeProgress(
  token: string,
  payload: SaveWordSwipeProgressPayload,
): Promise<WordSwipeProgressResponse | null> {
  try {
    const res = await fetch(apiUrl('/api/games/word-swipe/progress'), {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export type FetchWordSwipeStageResult =
  | { ok: true; data: WordSwipeStageResponse }
  | { ok: false; status: number; error: string };

export async function fetchWordSwipeStageDetailed(
  token: string | null,
  level: number,
  stage: number,
): Promise<FetchWordSwipeStageResult> {
  if (!token) {
    return { ok: false, status: 401, error: 'auth_required' };
  }
  try {
    const res = await fetch(
      apiUrl(`/api/games/word-swipe/stage?level=${level}&stage=${stage}`),
      { headers: authHeaders(token) },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return {
        ok: false,
        status: res.status,
        error: body?.error ?? 'load_failed',
      };
    }
    const data = (await res.json()) as WordSwipeStageResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, error: 'network_error' };
  }
}
