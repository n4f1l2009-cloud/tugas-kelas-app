'use client';

import { useState, useTransition } from 'react';
import {
  Archive,
  FileImage,
  Inbox,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { TaskProgressStat } from '@/types/database';
import { archiveTask, deleteTask, restoreTask } from '@/actions/task-actions';
import { formatDeadlineID } from '@/lib/utils/urgency';
import { CopyWhatsAppButton } from './CopyWhatsAppButton';
import type { EditableTaskItem } from './EditTaskModal';

interface ManagedTaskTabsProps {
  activeTasks: EditableTaskItem[];
  archivedTasks: EditableTaskItem[];
  statsMap: Record<string, TaskProgressStat>;
  totalMembers: number;
  onEdit: (task: EditableTaskItem) => void;
  onNotice: (message: string) => void;
  onError: (message: string | null) => void;
}

function getProgressBarColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-sky-500';
  return 'bg-amber-500';
}

export function ManagedTaskTabs({
  activeTasks,
  archivedTasks,
  statsMap,
  totalMembers,
  onEdit,
  onNotice,
  onError,
}: ManagedTaskTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleArchive = (task: EditableTaskItem) => {
    if (!confirm(`Arsipkan "${task.title}"? Tugas ini akan disembunyikan dari beranda siswa.`)) {
      return;
    }

    onError(null);
    setBusyTaskId(task.id);
    startTransition(async () => {
      try {
        await archiveTask(task.id);
        onNotice(`Tugas "${task.title}" dipindahkan ke Arsip.`);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Gagal mengarsipkan tugas.');
      } finally {
        setBusyTaskId(null);
      }
    });
  };

  const handleRestore = (task: EditableTaskItem) => {
    onError(null);
    setBusyTaskId(task.id);
    startTransition(async () => {
      try {
        await restoreTask(task.id);
        onNotice(`Tugas "${task.title}" berhasil dipulihkan ke daftar aktif.`);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Gagal memulihkan tugas.');
      } finally {
        setBusyTaskId(null);
      }
    });
  };

  const handlePermanentDelete = (task: EditableTaskItem) => {
    const attachmentWarning = task.attachment_url
      ? ' beserta foto/PDF lampirannya'
      : '';
    const confirmed = confirm(
      `HAPUS PERMANEN "${task.title}"?\n\nRiwayat centang siswa${attachmentWarning} akan dihapus selamanya dan tidak bisa dikembalikan.`
    );
    if (!confirmed) return;

    onError(null);
    setBusyTaskId(task.id);
    startTransition(async () => {
      try {
        await deleteTask(task.id);
        onNotice(`Tugas "${task.title}" telah dihapus permanen.`);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Gagal menghapus tugas secara permanen.');
      } finally {
        setBusyTaskId(null);
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
            activeTab === 'active'
              ? 'bg-slate-900 text-white dark:bg-indigo-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <span>Tugas Aktif</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              activeTab === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {activeTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archived')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
            activeTab === 'archived'
              ? 'bg-slate-900 text-white dark:bg-indigo-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          <span>Diarsipkan</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              activeTab === 'archived'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {archivedTasks.length}
          </span>
        </button>
      </div>

      {activeTab === 'active' ? (
        activeTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
            <Inbox className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Belum ada tugas aktif
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Gunakan formulir di atas untuk menambahkan tugas baru.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => {
              const rowBusy = isPending && busyTaskId === task.id;
              const stat = statsMap[task.id];
              const completed = stat?.completed_count ?? 0;
              const members = stat?.total_members ?? totalMembers;
              const pct = stat?.completion_pct ?? 0;

              return (
                <div
                  key={task.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: task.subject_color }}
                      >
                        {task.subject_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDeadlineID(task.due_date)}
                      </span>
                      {task.attachment_url && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <FileImage className="h-3 w-3" /> Lampiran
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {task.title}
                    </p>

                    <div className="max-w-xs pt-1.5">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          Progres kelas:{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {completed}/{members}
                          </strong>{' '}
                          selesai
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {pct}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap shrink-0 items-center gap-2">
                    <CopyWhatsAppButton
                      title={task.title}
                      subjectName={task.subject_name}
                      dueDate={task.due_date}
                      type={task.type}
                      description={task.description}
                    />
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-950/60"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(task)}
                      disabled={isPending}
                      title="Arsipkan tugas"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      {rowBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                      Arsipkan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
            Tugas di sini tidak tampil di beranda siswa. Kamu bisa memulihkannya kembali atau menghapusnya secara permanen untuk menghemat kuota penyimpanan foto.
          </p>

          {archivedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
              <Archive className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Arsip masih kosong
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Tugas lama yang kamu arsipkan akan muncul di sini.
              </p>
            </div>
          ) : (
            archivedTasks.map((task) => {
              const rowBusy = isPending && busyTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white opacity-80"
                        style={{ backgroundColor: task.subject_color }}
                      >
                        {task.subject_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        Deadline: {formatDeadlineID(task.due_date)}
                      </span>
                      {task.attachment_url && (
                        <a
                          href={task.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:underline dark:bg-slate-800 dark:text-slate-300"
                        >
                          <FileImage className="h-3 w-3" /> Ada Lampiran
                        </a>
                      )}
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {task.title}
                    </p>
                  </div>

                  <div className="flex flex-wrap shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(task)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                      {rowBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Pulihkan
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(task)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                    >
                      {rowBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Hapus Permanen
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
