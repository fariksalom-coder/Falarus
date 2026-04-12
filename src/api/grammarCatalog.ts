import { apiUrl } from '../api';

export type GrammarCatalogTask = { taskNumber: number; questionCount: number };

export type GrammarCatalogLesson = {
  id: number;
  path: string;
  title: string;
  titleUz: string;
  titleRu: string;
  locked: boolean;
  exercisesTotal: number;
  tasks: GrammarCatalogTask[];
};

export async function getGrammarCatalog(token: string): Promise<{ lessons: GrammarCatalogLesson[] }> {
  const res = await fetch(apiUrl('/api/grammar/catalog'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error || 'Katalog yuklanmadi');
  }
  return body as { lessons: GrammarCatalogLesson[] };
}
