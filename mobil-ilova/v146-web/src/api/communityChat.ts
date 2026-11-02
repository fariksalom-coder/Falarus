import { apiUrl } from '../api';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export type SavolJavobMessage = {
  id: number;
  group_code: string;
  sender_user_id: number;
  sender_name: string;
  /** Yuboruvchining profil surati. Yo'q bo'lsa — bosh harflar chiziladi. */
  sender_avatar_url?: string | null;
  /** Surati yo'qlarda o'rniga qo'yiladigan belgi shunga qarab tanlanadi. */
  sender_gender?: string | null;
  content: string;
  created_at: string;
  /** Moderator tahrirlagan bo'lsa — vaqti. */
  edited_at?: string | null;
  /** Biriktirilgan fayl manzili (/uploads/...). Media yo'q bo'lsa null. */
  media_url?: string | null;
  media_kind?: MediaKind | null;
  /** Ovoz va video uzunligi (ms). Rasmda null. */
  media_ms?: number | null;
  /**
   * Fayl diskdan o'chirilgan vaqt. To'lsa — media endi mavjud emas,
   * chatda uning o'rnida "muddati tugadi" ko'rsatiladi.
   */
  media_deleted_at?: string | null;
  /** Xabarga qo'yilgan reaksiyalar, ko'pdan ozga tartibda. */
  reactions?: MessageReaction[];
  /** Xabar relsga kommentariya bo'lsa — o'sha relsning id si. */
  reel_id?: number | null;
};

/** Bitta emoji bo'yicha yig'ma: nechta odam bosgan va men bosganmanmi. */
export type MessageReaction = {
  /** Unicode belgi ('👍') yoki maxsus rasm kaliti (':falarus:'). */
  emoji: string;
  soni: number;
  meni: boolean;
  /** Maxsus reaksiya rasmi. Unicode emojida null. */
  image_url?: string | null;
};

/** Taklif etiladigan reaksiya turi. */
export type ReactionOption = {
  emoji: string;
  image_url?: string | null;
  label?: string | null;
};

/**
 * `video_note` — Telegramdagi kabi dumaloq video xabar. Oddiy `video` dan
 * faqat ko'rinishi bilan farq qiladi: kvadrat kadr, dumaloq niqob.
 */
export type MediaKind = 'image' | 'video' | 'voice' | 'video_note';

/** O'qish rejimi: chatda yozib bo'lmaydi, faqat Support kanali ochiq. */
export type ChatBlock = {
  id: number;
  user_id: number;
  reason: string | null;
  expires_at: string | null;
  blocked_by_name: string | null;
  created_at: string;
};

export type ChatBlockListItem = ChatBlock & {
  full_name: string;
  phone: string | null;
  active: boolean;
};

export type SavolJavobTypingUser = {
  user_id: number;
  full_name: string;
};

export type SavolJavobMember = {
  user_id: number;
  full_name: string;
};

export type SavolJavobSummary = {
  group_code: string;
  title: string;
  member_count: number;
  online_count: number;
  last_message: {
    id: number;
    content: string;
    sender_user_id: number;
    created_at: string;
  } | null;
  unread_count: number;
  /** Shu foydalanuvchini "@" bilan belgilagan o'qilmagan xabarlar soni. */
  mention_count: number;
  /** Bo'sh bo'lmasa — foydalanuvchi o'qish rejimida. */
  block?: ChatBlock | null;
  /** Moderator huquqi (support hisobi). */
  can_moderate?: boolean;
};

export type SavolJavobLiveState = {
  member_count: number;
  online_count: number;
  typing_users: SavolJavobTypingUser[];
};

export async function getSavolJavobSummary(token: string): Promise<SavolJavobSummary> {
  const res = await fetch(apiUrl('/api/community/savol-javob/summary'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Guruh yuklanmadi');
  return data;
}

export async function getSavolJavobLiveState(token: string): Promise<SavolJavobLiveState> {
  const res = await fetch(apiUrl('/api/community/savol-javob/live'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Guruh holati yuklanmadi');
  return data;
}

export async function pingSavolJavobPresence(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/community/savol-javob/presence'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Onlayn holat saqlanmadi');
  }
}

export async function setSavolJavobTyping(token: string, typing: boolean): Promise<void> {
  const res = await fetch(apiUrl('/api/community/savol-javob/typing'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ typing }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Yozish holati saqlanmadi');
  }
}

export async function getSavolJavobMessages(token: string, beforeId?: number): Promise<SavolJavobMessage[]> {
  const qs = beforeId ? `?before_id=${beforeId}` : '';
  const res = await fetch(apiUrl(`/api/community/savol-javob/messages${qs}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Xabarlar yuklanmadi');
  return data;
}

/** Pastki menyudagi nishon uchun yengil so'rov. */
export async function getSavolJavobMentionCount(token: string): Promise<number> {
  const res = await fetch(apiUrl('/api/community/savol-javob/mentions'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Belgilashlar yuklanmadi');
  return Number(data?.mention_count ?? 0);
}

/** "@" bilan belgilash uchun odam qidirish. Bo'sh so'rov — yaqinda yozganlar. */
export async function searchSavolJavobMembers(
  token: string,
  query: string,
  signal?: AbortSignal
): Promise<SavolJavobMember[]> {
  const res = await fetch(
    apiUrl(`/api/community/savol-javob/members?q=${encodeURIComponent(query)}`),
    { headers: { Authorization: `Bearer ${token}` }, signal }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Aʼzolar topilmadi');
  return data;
}

export async function sendSavolJavobMessage(token: string, content: string): Promise<SavolJavobMessage> {
  const res = await fetch(apiUrl('/api/community/savol-javob/messages'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Xabar yuborilmadi');
  return data;
}

/**
 * Media xabar yuborish.
 *
 * Matn IXTIYORIY — faqat rasm yoki ovoz yuborish mumkin. `FormData`
 * ishlatilgani uchun `Content-Type` ni QO'LDA qo'ymaymiz: brauzer uni
 * `boundary` bilan birga o'zi yozadi, qo'lda yozilsa server faylni
 * ajrata olmaydi.
 */
export async function sendSavolJavobMedia(
  token: string,
  input: { kind: MediaKind; file: Blob; fileName: string; content?: string; ms?: number | null },
): Promise<SavolJavobMessage> {
  const fd = new FormData();
  fd.append('kind', input.kind);
  fd.append('file', input.file, input.fileName);
  if (input.content) fd.append('content', input.content);
  if (input.ms != null) fd.append('ms', String(Math.round(input.ms)));

  const res = await fetch(apiUrl('/api/community/savol-javob/media'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Xabar yuborilmadi');
  }
  return res.json();
}

/**
 * Reaksiyani qo'yadi yoki olib tashlaydi (toggle).
 *
 * Server yangilangan TO'LIQ yig'mani qaytaradi — klient sonlarni o'zi
 * hisoblab, boshqa odamlarning bosishini sezmay qolmasin.
 */
export async function toggleMessageReaction(
  token: string,
  messageId: number,
  emoji: string,
): Promise<{ message_id: number; reactions: MessageReaction[] }> {
  const res = await fetch(apiUrl(`/api/community/savol-javob/messages/${messageId}/reactions`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Reaksiya saqlanmadi');
  }
  return res.json();
}

/** Chatda taklif etiladigan emojilar — support hisobi boshqaradi. */
export async function getAvailableReactions(
  token: string,
): Promise<{ emojis: ReactionOption[]; max: number }> {
  const res = await fetch(apiUrl('/api/community/savol-javob/reactions/available'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Reaksiyalar yuklanmadi');
  return res.json();
}

/** Support: ro'yxatga yangi emoji qo'shadi. */
export async function addReactionEmoji(token: string, emoji: string): Promise<void> {
  const res = await fetch(apiUrl('/api/community/moderation/reactions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || 'Emoji qo‘shilmadi');
  }
}

/** Support: emojini ro'yxatdan olib tashlaydi (eski reaksiyalar qoladi). */
export async function removeReactionEmoji(token: string, emoji: string): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/community/moderation/reactions/${encodeURIComponent(emoji)}`),
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || 'Emoji o‘chirilmadi');
  }
}

/**
 * Support: galereyadan rasm yuklab, uni reaksiya sifatida qo'shadi.
 *
 * `FormData` ishlatilgani uchun `Content-Type` qo'lda qo'yilmaydi —
 * brauzer uni `boundary` bilan o'zi yozadi.
 */
export async function uploadReactionImage(
  token: string,
  file: Blob,
  name: string,
): Promise<ReactionOption> {
  const fd = new FormData();
  fd.append('file', file, 'reaksiya');
  fd.append('name', name);
  const res = await fetch(apiUrl('/api/community/moderation/reactions/image'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || 'Rasm qo‘shilmadi');
  }
  return res.json();
}

export async function markSavolJavobRead(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/community/savol-javob/read'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'O\'qilgan holat saqlanmadi');
  }
}

/* ------------------------------------------------------------------ *
 * MODERATSIYA — support hisobi chat ichidan boshqaradi.
 * ------------------------------------------------------------------ */

export async function getChatBlocks(token: string): Promise<ChatBlockListItem[]> {
  const res = await fetch(apiUrl('/api/community/moderation/blocks'), {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Ro'yxat yuklanmadi");
  return data as ChatBlockListItem[];
}

export async function blockChatUser(
  token: string,
  params: { userId: number; reason?: string; days?: number | null }
): Promise<ChatBlock> {
  const res = await fetch(apiUrl('/api/community/moderation/blocks'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ user_id: params.userId, reason: params.reason ?? '', days: params.days ?? null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Blok saqlanmadi');
  return data as ChatBlock;
}

export async function unblockChatUser(token: string, userId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/moderation/blocks/${userId}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || 'Blok olinmadi');
  }
}

export async function editGroupMessage(token: string, id: number, content: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/moderation/messages/${id}`), {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || 'Xabar tahrirlanmadi');
  }
}

export async function deleteGroupMessage(token: string, id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/moderation/messages/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || "Xabar o'chirilmadi");
  }
}

/* ─────────────────────────  RELS  ───────────────────────── */

export type Reel = {
  id: number;
  author_user_id: number;
  author_name: string;
  /** Muallifning profil surati (kichik doira uchun). */
  author_avatar_url?: string | null;
  video_url: string;
  poster_url?: string | null;
  caption: string;
  duration_ms?: number | null;
  created_at: string;
  /** Shu foydalanuvchi o'chira oladimi (muallif yoki support). */
  can_delete: boolean;
  likes_count: number;
  liked_by_me: boolean;
  comments_count: number;
};

export type ReelComment = {
  id: number;
  author_user_id: number;
  author_name: string;
  author_avatar_url?: string | null;
  content: string;
  created_at: string;
};

export async function getReels(token: string, beforeId?: number): Promise<Reel[]> {
  const q = beforeId ? `?before_id=${beforeId}` : '';
  const res = await fetch(apiUrl(`/api/community/reels${q}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Relslar yuklanmadi');
  return res.json();
}

/**
 * Rels joylash.
 *
 * `FormData` — `Content-Type` qo'lda qo'yilmaydi, brauzer uni `boundary`
 * bilan o'zi yozadi.
 */
export async function uploadReel(
  token: string,
  input: { file: Blob; fileName: string; caption?: string; ms?: number | null },
): Promise<Reel> {
  const fd = new FormData();
  fd.append('file', input.file, input.fileName);
  if (input.caption) fd.append('caption', input.caption);
  if (input.ms != null) fd.append('ms', String(Math.round(input.ms)));
  const res = await fetch(apiUrl('/api/community/reels'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || 'Rels joylanmadi');
  }
  return res.json();
}

export async function deleteReel(token: string, id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/reels/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || "Rels o'chirilmadi");
  }
}

/** Layk qo'yish yoki olib tashlash (toggle). */
export async function toggleReelLike(
  token: string,
  id: number,
): Promise<{ reel_id: number; likes_count: number; liked_by_me: boolean }> {
  const res = await fetch(apiUrl(`/api/community/reels/${id}/like`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || 'Layk saqlanmadi');
  }
  return res.json();
}

export async function getReelComments(token: string, id: number): Promise<ReelComment[]> {
  const res = await fetch(apiUrl(`/api/community/reels/${id}/comments`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Kommentariyalar yuklanmadi');
  return res.json();
}

/**
 * Kommentariya qoldirish.
 *
 * Server uni GURUH XABARI sifatida saqlaydi, ya'ni yozilgan matn
 * savol-javob guruhida ham ko'rinadi.
 */
export async function addReelComment(
  token: string,
  id: number,
  content: string,
): Promise<ReelComment> {
  const res = await fetch(apiUrl(`/api/community/reels/${id}/comments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || 'Kommentariya yuborilmadi');
  }
  return res.json();
}

/**
 * FOYDALANUVCHI KARTASI — faqat support hisobiga ochiq.
 *
 * Parol maydoni ataylab yo'q: u bazada bcrypt xeshi bo'lib yotadi,
 * ya'ni asl matn hech qayerda saqlanmagan va uni ko'rsatib bo'lmaydi.
 */
export type UserCard = {
  id: number;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  account_type: string | null;
  level: string | null;
  learning_goal: string | null;
  onboarding_completed: boolean;
  registered_at: string | null;
  plan_name: string | null;
  plan_expires_at: string | null;
  is_golden: boolean;
  last_seen_at: string | null;
  last_seen_chat: string | null;
  last_seen_platform: string | null;
  points: number;
  total_points: number;
  best_streak_days: number;
  total_time_seconds: number;
  message_count: number;
  recent_activity: Array<{ day_number: number; block_kind: string; done_at: string }>;
  active_dates: string[];
  block: { id: number; reason: string | null; expires_at: string | null; blocked_by_name: string | null; created_at: string } | null;
  password_note: string;
};

export async function getUserCard(token: string, userId: number): Promise<UserCard> {
  const res = await fetch(apiUrl(`/api/community/moderation/users/${userId}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Ma'lumot yuklanmadi");
  return data as UserCard;
}
