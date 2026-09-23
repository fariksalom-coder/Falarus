import { apiUrl } from '../api';

export type WelcomeVideoOfferState = {
  mode: 'sequence' | 'standard' | 'offer';
  nextVideoIndex: number | null;
  offerExpiresAt: string | null;
  offerUsed: boolean;
};

async function request(token: string, path: string, init?: RequestInit): Promise<WelcomeVideoOfferState> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Welcome video state unavailable');
  return payload as WelcomeVideoOfferState;
}

export function getWelcomeVideoOffer(token: string): Promise<WelcomeVideoOfferState> {
  return request(token, '/api/welcome-video-offer');
}

export function startWelcomeVideoOffer(token: string): Promise<WelcomeVideoOfferState> {
  return request(token, '/api/welcome-video-offer/start', { method: 'POST' });
}

export function completeWelcomeVideo(token: string, videoIndex: number): Promise<WelcomeVideoOfferState> {
  return request(token, '/api/welcome-video-offer/video-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoIndex }),
  });
}
