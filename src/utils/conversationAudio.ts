/** While a spoken lesson owns audio, notification/effect sounds stay silent. */
const owners = new Set<symbol>();
const listeners = new Set<() => void>();
export const isConversationAudioActive = () => owners.size > 0;
export function subscribeConversationAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function acquireConversationAudio(): () => void {
  const owner = Symbol();
  owners.add(owner);
  listeners.forEach(listener => listener());
  return () => {
    if (!owners.delete(owner)) return;
    listeners.forEach(listener => listener());
  };
}

/** The played response, plus its acoustic tail, cannot become a new mic input. */
export class ConversationMicGate {
  private blockedUntil = 0;
  filter(pcm: string, speaking: boolean, now: number): string {
    if (speaking) this.blockedUntil = now + 400;
    if (speaking || now < this.blockedUntil) return SILENT_PCM;
    return pcm;
  }
}
// Live capture sends 1600 PCM16 samples = 3200 bytes every 100 ms.
const SILENT_PCM = 'A'.repeat(4267) + '=';
