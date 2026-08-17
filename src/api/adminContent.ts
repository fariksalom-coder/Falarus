/**
 * adminContent.ts — admin panelidan kunlik kurs kontentini boshqarish.
 *
 * Maydonlar ro'yxati (sxema) SERVERDAN keladi: yangi maydon qo'shilsa,
 * frontendni o'zgartirmasdan avtomatik chiqadi.
 */
import { adminApi } from '../lib/adminApi';

export type FieldType = 'text' | 'textarea' | 'int' | 'select' | 'stringArray';

export type ContentField = {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string | number; label: string }[];
  inTable?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
};

export type ContentResource = {
  key: string;
  label: string;
  dayScoped: boolean;
  orderable: boolean;
  singleton: boolean;
  pk: string;
  fields: ContentField[];
};

export type ContentRow = Record<string, unknown>;

export async function getContentSchema(): Promise<{ resources: ContentResource[] }> {
  return adminApi<{ resources: ContentResource[] }>('/content/schema');
}

export async function getDayOverview(day: number): Promise<Record<string, number>> {
  return adminApi<Record<string, number>>(`/content/overview?day=${day}`);
}

export async function listContent(
  resource: string,
  params: { day?: number; q?: string } = {},
): Promise<ContentRow[]> {
  const qs = new URLSearchParams();
  if (params.day != null) qs.set('day', String(params.day));
  if (params.q) qs.set('q', params.q);
  const res = await adminApi<{ rows: ContentRow[] }>(`/content/${resource}?${qs.toString()}`);
  return res.rows;
}

export async function createContent(
  resource: string,
  day: number | null,
  values: Record<string, unknown>,
): Promise<ContentRow> {
  return adminApi<ContentRow>(`/content/${resource}`, {
    method: 'POST',
    body: JSON.stringify({ day, values }),
  });
}

export async function updateContent(
  resource: string,
  id: string | number,
  values: Record<string, unknown>,
): Promise<ContentRow> {
  return adminApi<ContentRow>(`/content/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ values }),
  });
}

export async function deleteContent(resource: string, id: string | number): Promise<void> {
  await adminApi(`/content/${resource}/${id}`, { method: 'DELETE' });
}

export async function moveContent(
  resource: string,
  id: string | number,
  dir: 'up' | 'down',
): Promise<{ moved: boolean }> {
  return adminApi<{ moved: boolean }>(`/content/${resource}/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ dir }),
  });
}
