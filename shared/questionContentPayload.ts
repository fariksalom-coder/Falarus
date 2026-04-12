/**
 * PostgREST `questions` ichida `question_content(content,answer)` embed:
 * one-to-one FK uchun javob **obyekt** yoki **bitta elementli massiv** bo‘lishi mumkin.
 * Eski kod faqat `[0]` ni o‘qigan — obyekt kelganda hamma savol bo‘sh `content` bilan ketardi.
 */
function asJsonObject(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v) as unknown;
      return p !== null && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

export function payloadFromQuestionContentEmbed(question_content: unknown): {
  content: Record<string, unknown>;
  answer: Record<string, unknown>;
} {
  if (question_content == null) {
    return { content: {}, answer: {} };
  }
  const row = Array.isArray(question_content) ? question_content[0] : question_content;
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    return { content: {}, answer: {} };
  }
  const r = row as Record<string, unknown>;
  return {
    content: asJsonObject(r.content),
    answer: asJsonObject(r.answer),
  };
}
