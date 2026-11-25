export type UrgencyKey = 'overdue' | 'urgent' | 'this_week' | 'later';

export interface UrgencyMeta {
  key: UrgencyKey;
  label: string;
  badgeClass: string;
  accentBorder: string;
}

export const URGENCY_CONFIG: Record<UrgencyKey, UrgencyMeta> = {
  overdue: {
    key: 'overdue',
    label: 'Terlewat Deadline',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    accentBorder: 'border-l-rose-500',
  },
  urgent: {
    key: 'urgent',
    label: 'Mepet (Kurang dari 48 Jam)',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    accentBorder: 'border-l-amber-500',
  },
  this_week: {
    key: 'this_week',
    label: 'Minggu Ini',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    accentBorder: 'border-l-sky-500',
  },
  later: {
    key: 'later',
    label: 'Masih Lama',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    accentBorder: 'border-l-slate-400',
  },
};

export function getUrgencyKey(dueDateIso: string): UrgencyKey {
  const now = Date.now();
  const due = new Date(dueDateIso).getTime();
  const diffHours = (due - now) / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';
  if (diffHours <= 48) return 'urgent';
  if (diffHours <= 24 * 7) return 'this_week';
  return 'later';
}

export function formatDeadlineID(dueDateIso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dueDateIso));
}

export function formatRelativeTime(isoDate: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (diffMinutes < 1) return 'baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
}
