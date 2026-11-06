/** Bound the entire request, including JSON and native HTTP implementations
 * that do not honour AbortSignal. Never retry an AI evaluation automatically. */
export async function voiceRequest<T>(url: string, init: RequestInit, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const signal = init.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new DOMException('Request aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Javob kelmadi. Internetni tekshirib, qayta urinib ko‘ring.'));
    }, timeoutMs);
  });
  try {
    if (signal?.aborted) return await interrupted;
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'So‘rov bajarilmadi. Qayta urinib ko‘ring.');
        if (data === null) throw new Error('Server javobi o‘qilmadi. Qayta urinib ko‘ring.');
        return data as T;
      })(),
      interrupted,
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}
