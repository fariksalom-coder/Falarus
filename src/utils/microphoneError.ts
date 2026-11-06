export function microphoneError(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Mikrofonga ruxsat berilmadi. Qurilma sozlamalarida ilova uchun mikrofon ruxsatini tekshiring. Simulator ishlatsangiz, Mac sozlamalarida Simulator ruxsatini ham tekshiring.';
  }
  if (name === 'NotFoundError') return 'Mikrofon topilmadi. Qurilmaning ovoz kirishini tekshiring.';
  if (name === 'NotReadableError') return 'Mikrofonni boshqa dastur ishlatayotgan bo‘lishi mumkin. Uni yopib, qayta urining.';
  return 'Mikrofonni ochib bo‘lmadi. Ovoz kirishini tekshirib, qayta urining.';
}
