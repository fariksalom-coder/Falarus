/**
 * Estimates TASKS.length from page source (same heuristics as dev extract script).
 * Used to align server/localStorage totals for lessons 11+ with hub UI.
 */

export type ExerciseKind = 'choice' | 'matching' | 'sentence';

/** Bir topshiriq kartochkasi uchun: asosan birinchi mashq turi (hub ikonkasi). */
export function inferPrimaryExerciseKindFromTasksBody(body: string): ExerciseKind {
  const firstTyped = body.match(/\btype:\s*'(choice|matching|sentence)'/);
  if (firstTyped?.[1]) return firstTyped[1] as ExerciseKind;

  const head = body.slice(0, Math.min(body.length, 1200));
  if (/\bpairs:\s*\[/.test(head) && !/\boptions:\s*\[/.test(head.split('pairs:')[0] ?? '')) {
    return 'matching';
  }
  if (/\boptions:\s*\[/.test(body)) return 'choice';
  if (/\bwords:\s*\[/.test(body) && /\bprompt:/.test(body)) return 'sentence';
  if (/\bpairs:\s*\[/.test(body)) return 'matching';

  return 'choice';
}

export function countTasksInTasksArraySource(body: string): number {
  const types = body.match(/\btype:\s*'[^']+'/g);
  if (types && types.length > 0) return types.length;

  const singleLinePrompt = body.match(/\{\s*prompt:/g);
  const multiLinePrompt = body.match(/\{\s*\n\s*prompt:/g);
  const promptCount = Math.max(singleLinePrompt?.length ?? 0, multiLinePrompt?.length ?? 0);
  if (promptCount > 0) return promptCount;

  return 0;
}

/**
 * Extract `const TASKS ... = [` ... matching `]` (handles `MatchingTask[]` type).
 */
export function extractBracketArrayAfterEquals(content: string, constName: string): string | null {
  const re = new RegExp(`const\\s+${constName}\\s*[^=]*=\\s*\\[`);
  const m = content.match(re);
  if (!m || m.index === undefined) return null;
  const startIdx = m.index + m[0].length - 1;
  const sub = content.slice(startIdx);
  let depth = 0;
  for (let i = 0; i < sub.length; i += 1) {
    const ch = sub[i]!;
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) return sub.slice(1, i);
    }
  }
  return null;
}

export function countVerbEntriesInSource(content: string, varName: string): number {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\[`);
  const m = content.match(re);
  if (!m || m.index === undefined) return 0;
  const startIdx = m.index + m[0].length - 1;
  const sub = content.slice(startIdx);
  let depth = 0;
  let end = -1;
  for (let i = 0; i < sub.length; i += 1) {
    const ch = sub[i]!;
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return 0;
  const body = sub.slice(1, end);
  const verbs = body.match(/\{\s*verb:/g);
  return verbs?.length ?? 0;
}
