'use client';

import { AlertTriangle, BarChart3, Lock, Users } from 'lucide-react';
import type { TaskProgressStat } from '@/types/database';
import type { EditableTaskItem } from './EditTaskModal';
import { getUrgencyKey } from '@/lib/utils/urgency';

interface ClassProgressSummaryProps {
  totalMembers: number;
  activeTasks: EditableTaskItem[];
  statsMap: Record<string, TaskProgressStat>;
}

export function ClassProgressSummary({
  totalMembers,
  activeTasks,
  statsMap,
}: ClassProgressSummaryProps) {
  const activeCount = activeTasks.length;

  const avgCompletion =
    activeCount === 0
      ? 0
      : Math.round(
          activeTasks.reduce(
            (sum, task) => sum + (statsMap[task.id]?.completion_pct ?? 0),
            0
          ) / activeCount
        );

  const needsReminderTasks = activeTasks.filter((task) => {
    const urgency = getUrgencyKey(task.due_date);
    const pct = statsMap[task.id]?.completion_pct ?? 0;
    return (urgency === 'urgent' || urgency === 'overdue') && pct < 50;
  });

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Anggota Kelas</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalMembers}
            <span className="ml-1.5 text-xs font-normal text-slate-400">akun aktif</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Rata-rata Selesai</span>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgCompletion}%
            </p>
            <span className="text-xs text-slate-400">dari {activeCount} tugas</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${avgCompletion}%` }}
            />
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            needsReminderTasks.length > 0
              ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/30'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Perlu Diingatkan</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                needsReminderTasks.length > 0 ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {needsReminderTasks.length}
            <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
              tugas mepet
            </span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {needsReminderTasks.length > 0
              ? 'Deadline mepet & progres di bawah 50%.'
              : 'Progres kelas aman terkendali.'}
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
        <Lock className="h-3 w-3 shrink-0" />
        Statistik dihitung secara agregat anonim di server. Status centang masing-masing siswa tetap bersifat pribadi.
      </p>
    </section>
  );
}
