/** Shared Sales CRM constants — frontend + backend. */

export const SALES_CRM_STATUSES = [
  'NEW',
  'TO_CALL',
  'CALLED',
  'ANSWERED',
  'FOLLOW_UP',
  'THINKING',
  'PAYMENT_PENDING',
  'PAID',
  'NO_ANSWER',
  'CALLBACK',
  'NOT_INTERESTED',
  'ARCHIVED',
] as const;

export type SalesCrmStatus = (typeof SALES_CRM_STATUSES)[number];

export const SALES_CRM_STATUS_LABELS: Record<SalesCrmStatus, string> = {
  NEW: 'Yangi',
  TO_CALL: 'Qo‘ng‘iroq',
  CALLED: 'Qo‘ng‘iroq qilindi',
  ANSWERED: 'Suhbat',
  FOLLOW_UP: 'Muammo',
  THINKING: 'O‘ylab ko‘radi',
  PAYMENT_PENDING: 'To‘laydi',
  PAID: 'To‘ladi',
  NO_ANSWER: 'Ko‘tarmadi',
  CALLBACK: 'Keyinroq',
  NOT_INTERESTED: 'Rad etdi',
  ARCHIVED: 'Arxiv',
};

/**
 * Operator funnel board.
 * Pass-through statuses (CALLED / ANSWERED) stay in "Yangi" — not separate columns.
 */
export type SalesCrmKanbanColumn = {
  id: string;
  title: string;
  hint: string;
  dropStatus: SalesCrmStatus;
  group: SalesCrmStatus[];
  tone: 'slate' | 'blue' | 'sky' | 'amber' | 'violet' | 'emerald' | 'rose' | 'orange';
  /** Operator must leave a short comment when moving here */
  requireComment: boolean;
  /** Operator must set exact next-contact datetime */
  requireNextContact: boolean;
  commentPlaceholder?: string;
};

export const SALES_CRM_KANBAN_COLUMNS: SalesCrmKanbanColumn[] = [
  {
    id: 'new',
    title: 'Yangi',
    hint: 'Hali ishlangan emas',
    dropStatus: 'NEW',
    group: ['NEW', 'TO_CALL', 'CALLED', 'ANSWERED'],
    tone: 'blue',
    requireComment: false,
    requireNextContact: false,
  },
  {
    id: 'no_answer',
    title: 'Ko‘tarmadi',
    hint: 'Telefonni olmadi',
    dropStatus: 'NO_ANSWER',
    group: ['NO_ANSWER'],
    tone: 'slate',
    requireComment: false,
    requireNextContact: false,
  },
  {
    id: 'later',
    title: 'Keyinroq',
    hint: 'Band — aniq vaqt + izoh',
    dropStatus: 'CALLBACK',
    group: ['CALLBACK'],
    tone: 'orange',
    requireComment: true,
    requireNextContact: true,
    commentPlaceholder: 'Masalan: 18:00 dan keyin bo‘sh…',
  },
  {
    id: 'thinking',
    title: 'O‘ylab ko‘radi',
    hint: 'Qachon javob beradi — aniq vaqt',
    dropStatus: 'THINKING',
    group: ['THINKING'],
    tone: 'violet',
    requireComment: true,
    requireNextContact: true,
    commentPlaceholder: 'Nima deb o‘ylayapti / nima kelishildi…',
  },
  {
    id: 'will_pay',
    title: 'To‘laydi',
    hint: 'Demo / to‘lashga kelishdi — aniq vaqt',
    dropStatus: 'PAYMENT_PENDING',
    group: ['PAYMENT_PENDING'],
    tone: 'amber',
    requireComment: true,
    requireNextContact: true,
    commentPlaceholder: 'Qachon to‘laydi / qaysi tarif…',
  },
  {
    id: 'issue',
    title: 'Muammo',
    hint: 'To‘layman dedi, keyin to‘siq chiqdi',
    dropStatus: 'FOLLOW_UP',
    group: ['FOLLOW_UP'],
    tone: 'rose',
    requireComment: true,
    requireNextContact: true,
    commentPlaceholder: 'Qanday muammo? Keyingi qadam…',
  },
  {
    id: 'paid',
    title: 'To‘ladi',
    hint: 'Sotuv yopildi',
    dropStatus: 'PAID',
    group: ['PAID'],
    tone: 'emerald',
    requireComment: false,
    requireNextContact: false,
  },
  {
    id: 'refused',
    title: 'Rad etdi',
    hint: 'Arxivga — tez yopish',
    dropStatus: 'NOT_INTERESTED',
    group: ['NOT_INTERESTED', 'ARCHIVED'],
    tone: 'rose',
    requireComment: true,
    requireNextContact: false,
    commentPlaceholder: 'Nima uchun rad etdi…',
  },
];

export function kanbanColumnIdForStatus(status: string): string {
  const col = SALES_CRM_KANBAN_COLUMNS.find((c) =>
    c.group.includes(status as SalesCrmStatus),
  );
  return col?.id ?? 'new';
}

export function kanbanColumnById(id: string): SalesCrmKanbanColumn | undefined {
  return SALES_CRM_KANBAN_COLUMNS.find((c) => c.id === id);
}

/** Statuses that need comment and/or next contact when advancing on the board. */
export function stageMoveRequirements(status: SalesCrmStatus): {
  requireComment: boolean;
  requireNextContact: boolean;
} {
  const col = SALES_CRM_KANBAN_COLUMNS.find((c) => c.dropStatus === status);
  return {
    requireComment: Boolean(col?.requireComment),
    requireNextContact: Boolean(col?.requireNextContact),
  };
}

export const SALES_CRM_ANSWERED_RESULTS = [
  'interested',
  'wants_details',
  'thinking',
  'ready_to_pay',
  'callback_requested',
  'refused',
] as const;

export const SALES_CRM_NO_ANSWER_RESULTS = [
  'no_answer',
  'busy',
  'rejected_call',
  'unavailable',
] as const;

export type SalesCrmCallResult =
  | (typeof SALES_CRM_ANSWERED_RESULTS)[number]
  | (typeof SALES_CRM_NO_ANSWER_RESULTS)[number];

export const SALES_CRM_CALL_RESULT_LABELS: Record<SalesCrmCallResult, string> = {
  interested: 'Qiziqdi',
  wants_details: 'Batafsil bilmoqchi',
  thinking: 'O‘ylab ko‘radi',
  ready_to_pay: 'To‘lashga tayyor',
  callback_requested: 'Qayta chaqirishni so‘radi',
  refused: 'Rad etdi',
  no_answer: 'Ko‘tarmadi',
  busy: 'Band — keyinroq',
  rejected_call: 'Tashlab yubordi',
  unavailable: 'Telefon ochiq emas',
};

export function isSalesCrmStatus(v: unknown): v is SalesCrmStatus {
  return typeof v === 'string' && (SALES_CRM_STATUSES as readonly string[]).includes(v);
}

export function statusAfterCallResult(result: SalesCrmCallResult): SalesCrmStatus {
  switch (result) {
    case 'interested':
    case 'wants_details':
      return 'THINKING';
    case 'thinking':
      return 'THINKING';
    case 'ready_to_pay':
      return 'PAYMENT_PENDING';
    case 'callback_requested':
      return 'CALLBACK';
    case 'refused':
      return 'NOT_INTERESTED';
    case 'no_answer':
    case 'rejected_call':
    case 'unavailable':
      return 'NO_ANSWER';
    case 'busy':
      return 'CALLBACK';
    default:
      return 'TO_CALL';
  }
}

export function digitsOnlyPhone(input: string): string {
  return String(input || '').replace(/\D+/g, '');
}

export function formatSalesPhone(raw: string | null | undefined): string {
  const d = digitsOnlyPhone(String(raw || ''));
  if (d.length === 12 && d.startsWith('998')) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  if (d.length === 11 && d.startsWith('7')) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  if (!d) return String(raw || '').trim() || '—';
  return `+${d}`;
}

/** datetime-local value in local timezone */
export function toDatetimeLocalValue(isoOrDate?: string | Date | null): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
