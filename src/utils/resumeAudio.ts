/** Safari may leave resume() pending without a current user gesture. */
export async function resumeAudio(context: AudioContext, timeoutMs = 5000): Promise<void> {
  if (context.state === 'running') return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Ovoz ochilmadi. Suhbatni boshlash tugmasini qayta bosing.')), timeoutMs);
      }),
    ]);
    if (String(context.state) !== 'running') throw new Error('Ovoz to‘xtatilgan. Suhbatni qayta boshlang.');
  } finally { clearTimeout(timer); }
}
