import type { SupabaseClient } from '@supabase/supabase-js';

const PATENT_SELECT =
  'variant_number, correct_count, total_count, score_percent, passed, completed_at';

export type PatentVariantResultRow = {
  variant_number: number;
  correct_count: number;
  total_count: number;
  score_percent: number;
  passed: boolean;
  completed_at: string;
};

/** List saved patent exam rows for a user (GET /api/patent/results). */
export function listPatentVariantResults(supabase: SupabaseClient, userId: number) {
  const uid = Number(userId);
  return supabase
    .from('patent_variant_results')
    .select(PATENT_SELECT)
    .eq('user_id', uid)
    .order('variant_number', { ascending: true });
}

/**
 * Insert or update one variant result. Uses UPDATE then INSERT so we do not rely on
 * PostgREST upsert + .single() (which can return PGRST116 when no row is echoed).
 */
export async function persistPatentVariantResult(
  supabase: SupabaseClient,
  userId: number,
  variantNumber: number,
  correctCount: number,
  totalCount: number
): Promise<{ data: PatentVariantResultRow | null; error: { message: string; code?: string } | null }> {
  const uid = Number(userId);
  const scorePercent = Math.max(0, Math.min(100, Math.round((correctCount / totalCount) * 100)));
  const completedAt = new Date().toISOString();
  const passed = correctCount >= 19;
  const metrics = {
    correct_count: correctCount,
    total_count: totalCount,
    score_percent: scorePercent,
    passed,
    completed_at: completedAt,
    updated_at: completedAt,
  };

  const updated = await supabase
    .from('patent_variant_results')
    .update(metrics)
    .eq('user_id', uid)
    .eq('variant_number', variantNumber)
    .select(PATENT_SELECT)
    .maybeSingle();

  if (updated.error) {
    return { data: null, error: { message: updated.error.message, code: updated.error.code } };
  }
  if (updated.data) {
    return { data: updated.data as PatentVariantResultRow, error: null };
  }

  const inserted = await supabase
    .from('patent_variant_results')
    .insert({
      user_id: uid,
      variant_number: variantNumber,
      ...metrics,
    })
    .select(PATENT_SELECT)
    .maybeSingle();

  if (!inserted.error && inserted.data) {
    return { data: inserted.data as PatentVariantResultRow, error: null };
  }

  if (
    inserted.error &&
    (inserted.error.code === '23505' ||
      /duplicate key|already exists|unique constraint/i.test(inserted.error.message ?? ''))
  ) {
    const retry = await supabase
      .from('patent_variant_results')
      .update(metrics)
      .eq('user_id', uid)
      .eq('variant_number', variantNumber)
      .select(PATENT_SELECT)
      .maybeSingle();
    if (retry.error) {
      return { data: null, error: { message: retry.error.message, code: retry.error.code } };
    }
    if (retry.data) {
      return { data: retry.data as PatentVariantResultRow, error: null };
    }
    return { data: null, error: { message: 'Yozuv yangilab bo‘lmadi' } };
  }

  return {
    data: null,
    error: inserted.error
      ? { message: inserted.error.message, code: inserted.error.code }
      : { message: 'Patent natijasi saqlanmadi' },
  };
}
