/** Fail closed: no peer communication until age and safety acknowledgement exist. */
export const SOCIAL_SAFETY_VERSION = 1;
export type SocialStage = 'age' | 'blocked' | 'reminder' | 'allowed';

export function socialStage(birthDate: string | null, acknowledgedVersion: number, knownMinor: boolean, today = new Date()): SocialStage {
  if (knownMinor) return 'blocked';
  if (!birthDate) return 'age';
  const birth = parseBirthDate(birthDate, today);
  if (!birth) return 'blocked';
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  if (birth > cutoff) return 'blocked';
  return acknowledgedVersion === SOCIAL_SAFETY_VERSION ? 'allowed' : 'reminder';
}

export function parseBirthDate(value: unknown, today = new Date()): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  if (date > today || date.getUTCFullYear() < today.getUTCFullYear() - 120) return null;
  return date;
}

export function isSocialApi(path: string, method: string): boolean {
  path = path.toLowerCase().replace(/\/+$/, '');
  return /^\/api\/(partner|community|teacher-chat|teacher-trials|teacher|teachers|meet-rooms|meet-sessions|live-streams|help)(\/|$)/.test(path)
    || /^\/api\/(my-meetings|my-meet-lessons|my\/trial-lessons|users\/[^/]+\/public)(\/|$)/.test(path)
    || (path === '/api/user/avatar' && method === 'POST');
}

export const SOCIAL_PAGE_MODULES = new Set([
  './pages/PartnerPage.tsx', './pages/PartnerProfilePage.tsx',
  './pages/TeachersPage.tsx', './pages/TeacherProfilePage.tsx', './pages/TeacherPanelPage.tsx',
  './pages/HelpPage.tsx', './pages/MeetRoomPage.tsx', './pages/LiveStreamPage.tsx',
  './pages/PublicProfilePage.tsx',
]);

/** Old child profiles/matches must not remain discoverable after the rollout. */
export function filterSocialResponse(value: any, eligible: Set<number>): any {
  if (Array.isArray(value)) return value.map(item => filterSocialResponse(item, eligible)).filter(item => item !== null);
  if (!value || typeof value !== 'object') return value;
  for (const key of ['user_id', 'sender_id', 'receiver_id', 'user1_id', 'user2_id']) {
    if (value[key] != null && !eligible.has(Number(value[key]))) return null;
  }
  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, filterSocialResponse(child, eligible)]));
  if (Array.isArray(result.outgoingRequests)) result.outgoingRequestsCount = result.outgoingRequests.length;
  return result;
}

export function privateLeaderboardEntry(value: any, eligible: Set<number>): any {
  if (!value || eligible.has(Number(value.id))) return value;
  return { ...value, firstName: `O‘quvchi #${value.id}`, lastName: '', avatarUrl: null,
    ...(Object.hasOwn(value, 'first_name') ? { first_name: `O‘quvchi #${value.id}`, last_name: '', avatar_url: null } : {}) };
}
