'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import type { Subject, TaskWithRelations } from '@/types/database';
import { getUrgencyKey, URGENCY_CONFIG, type UrgencyKey } from '@/lib/utils/urgency';
import { toggleTaskCompletion } from '@/actions/task-actions';
import { TaskCard } from './TaskCard';

interface TaskListBoardProps {
  initialTasks: TaskWithRelations[];
  subjects: Subject[];
}

const URGENCY_ORDER: UrgencyKey[] = ['overdue', 'urgent', 'this_week', 'later'];

export function TaskListBoard({ initialTasks, subjects }: TaskListBoardProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticTasks, setOptimisticTask] = useOptimistic(
    initialTasks,
    (currentTasks, update: { taskId: string; is_completed: boolean }) =>
      currentTasks.map((t) =>
        t.id === update.taskId ? { ...t, is_completed: update.is_completed } : t
      )
  );

  const handleToggle = (taskId: string, currentStatus: boolean) => {
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticTask({ taskId, is_completed: !currentStatus });
      try {
        await toggleTaskCompletion(taskId, currentStatus);
      } catch {
        setErrorMsg('Gagal menyinkronkan status centang. Periksa koneksi internetmu.');
      }
    });
  };

  const totalCount = optimisticTasks.length;
  const completedCount = optimisticTasks.filter((t) => t.is_completed).length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const groupedTasks = useMemo(() => {
    const filtered = optimisticTasks.filter((task) => {
      if (selectedSubject !== 'all' && task.subject_id !== selectedSubject) return false;
      if (hideCompleted && task.is_completed) return false;
      return true;
    });

    const groups: Record<UrgencyKey, TaskWithRelations[]> = {
      overdue: [],
      urgent: [],
      this_week: [],
      later: [],
    };

    for (const task of filtered) {
      groups[getUrgencyKey(task.due_date)].push(task);
    }

    for (const key of URGENCY_ORDER) {
      groups[key].sort((a, b) => Number(a.is_completed) - Number(b.is_completed));
    }

    return groups;
  }, [optimisticTasks, selectedSubject, hideCompleted]);

  const hasVisibleTasks = URGENCY_ORDER.some((key) => groupedTasks[key].length > 0);

  return (
    <div className="space-y-6">
      {/* Progress Bar Card */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-md dark:from-indigo-950 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Progres Tugas Aktif
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {completedCount}{' '}
              <span className="text-base font-normal text-slate-400">
                dari {totalCount} selesai
              </span>
            </h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
            {progressPercent}%
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {totalCount > 0 && completedCount === totalCount && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <Sparkles className="h-4 w-4" /> Semua tugas beres! Waktunya istirahat atau kejar materi lain.
          </p>
        )}
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Filter Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Filter Mapel
          </span>
          <button
            type="button"
            onClick={() => setHideCompleted((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {hideCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {hideCompleted ? 'Tampilkan yang selesai' : 'Sembunyikan selesai'}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              selectedSubject === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Semua Mapel
          </button>

          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => setSelectedSubject(subject.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                selectedSubject === subject.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: subject.color_hex }}
              />
              {subject.name}
            </button>
          ))}
        </div>
      </section>

      {/* Daftar Tugas Dikelompokkan per Urgensi */}
      {!hasVisibleTasks ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-slate-700">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Tidak ada tugas yang perlu ditampilkan
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Coba ubah filter mata pelajaran atau santai dulu—tidak ada antrean tugas!
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {URGENCY_ORDER.map((key) => {
            const list = groupedTasks[key];
            if (list.length === 0) return null;
            const meta = URGENCY_CONFIG[key];

            return (
              <section key={key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {meta.label}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta.badgeClass}`}>
                    {list.length}
                  </span>
                </div>

                <div className="grid gap-3">
                  {list.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={handleToggle} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
