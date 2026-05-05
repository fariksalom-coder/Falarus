/** Lowercase, trim, ё→е — tokenizer va daily_reading_lexemes kaliti uchun bir xil qoida. */
export function normalizeRuWord(word: string): string {
  return word.toLowerCase().replace(/ё/g, 'е').trim();
}
