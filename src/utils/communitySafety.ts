export function readPersonalChatBlocks(storage: Pick<Storage, 'getItem'>, userId: number): number[] {
  try {
    const values = JSON.parse(storage.getItem(`community-blocks:${userId}`) || '[]');
    return Array.isArray(values) ? [...new Set(values.filter(id => Number.isSafeInteger(id) && id > 0 && id !== userId))] : [];
  } catch { return []; }
}
export function savePersonalChatBlocks(storage: Pick<Storage, 'setItem'>, userId: number, ids: number[]): number[] {
  const values = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0 && id !== userId))];
  storage.setItem(`community-blocks:${userId}`, JSON.stringify(values));
  return values;
}
export function communityReportText(message: { id: number; sender_name: string; sender_user_id: number; created_at: string; content: string }, reason: string, groupLabel = 'Savol-javob guruhi'): string {
  if (!reason.trim() || reason.trim().length > 500) throw new Error('Shikoyat sababini kiriting (500 belgigacha)');
  return [ `${groupLabel}dagi xabar ustidan shikoyat`, `Xabar ID: ${message.id}`,
    `Muallif: ${message.sender_name.slice(0, 100)} (ID: ${message.sender_user_id})`,
    `Vaqt: ${message.created_at}`, `Sabab: ${reason.trim()}`,
    `Xabar: ${message.content.slice(0, 700) || 'Media xabar'}` ].join('\n');
}
