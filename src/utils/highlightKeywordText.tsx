import type { ReactNode } from 'react';

function normalizeForMatch(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
}

export function splitTextByKeyword(text: string, keyword: string): ReactNode[] | null {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return null;

  const normalizedText = normalizeForMatch(text);
  const normalizedKeyword = normalizeForMatch(trimmedKeyword);
  const matchIndex = normalizedText.indexOf(normalizedKeyword);
  if (matchIndex === -1) return null;

  const parts: ReactNode[] = [];
  if (matchIndex > 0) {
    parts.push(text.slice(0, matchIndex));
  }

  parts.push(
    <strong key="keyword" className="font-bold text-[#1D4ED8]">
      {text.slice(matchIndex, matchIndex + trimmedKeyword.length)}
    </strong>
  );

  const restStart = matchIndex + trimmedKeyword.length;
  if (restStart < text.length) {
    parts.push(text.slice(restStart));
  }

  return parts;
}

export function HighlightKeywordText({
  text,
  keyword,
  className,
}: {
  text: string;
  keyword?: string | null;
  className?: string;
}) {
  const highlighted = keyword ? splitTextByKeyword(text, keyword) : null;

  return (
    <span className={className}>
      {highlighted ?? text}
    </span>
  );
}
