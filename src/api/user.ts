import { apiUrl } from '../api';
import type { UserGender } from '../components/UserAvatar';

export type UserMe = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  level: string;
  onboarded: number;
  progress: number;
  totalPoints?: number;
  planName?: string | null;
  planExpiresAt?: string | null;
  billingNoticeUz?: string | null;
  accountType?: string | null;
  avatarUrl?: string | null;
  gender?: UserGender;
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

function validateAvatarFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Faqat JPG, PNG yoki WEBP ruxsat etiladi');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Rasm hajmi 4 MB dan oshmasligi kerak');
  }
}

export async function uploadUserAvatar(token: string, file: File): Promise<UserMe> {
  validateAvatarFile(file);
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(apiUrl('/api/user/avatar'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Rasm yuklanmadi');
  }
  return data as UserMe;
}

export async function patchUserAccount(
  token: string,
  body: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: UserGender;
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }>
): Promise<UserMe> {
  const res = await fetch(apiUrl('/api/user/account'), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Xatolik yuz berdi');
  }
  return data as UserMe;
}

export function bustAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return `${url.split('?')[0]}?v=${Date.now()}`;
}

export async function removeUserAvatar(token: string): Promise<UserMe> {
  const res = await fetch(apiUrl('/api/user/avatar'), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Rasm o‘chirilmadi');
  }
  return data as UserMe;
}
