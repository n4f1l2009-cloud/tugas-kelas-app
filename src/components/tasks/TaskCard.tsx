'use client';

import { BookOpen, Check, Clock, ExternalLink, FileImage, Globe } from 'lucide-react';
import type { TaskWithRelations } from '@/types/database';
import {
  formatDeadlineID,
  formatRelativeTime,
  getUrgencyKey,
  URGENCY_CONFIG,
} from '@/lib/utils/urgency';

interface TaskCardProps {
  task: TaskWithRelations;
  onToggle: (taskId: string, currentStatus: boolean) => void;
}

export function TaskCard({ task, onToggle }: TaskCardProps) {
  const urgency = URGENCY_CONFIG[getUrgencyKey(task.due_date)];

  return (
    <article
      className={`group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 border-l-4 ${
        task.is_completed
          ? 'border-l-emerald-500 opacity-65 bg-slate-50/70 dark:bg-slate-900/50'
          : urgency.accentBorder
      }`}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => onToggle(task.id, task.is_completed)}
          aria-label={task.is_completed ? 'Tandai belum selesai' : 'Tandai selesai'}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          style={{
            borderColor: task.is_completed ? '#10B981' : '#CBD5E1',
            backgroundColor: task.is_completed ? '#10B981' : 'transparent',
          }}
        >
          {task.is_completed && <Check className="h-4 w-4 text-white stroke-[3]" />}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: task.subjects.color_hex }}
            >
              {task.subjects.name}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {task.type === 'online' ? (
                <>
                  <Globe className="h-3 w-3" /> Online
                </>
              ) : (
                <>
                  <BookOpen className="h-3 w-3" /> Offline
                </>
              )}
            </span>
          </div>

          <h3
            className={`text-base font-semibold leading-snug text-slate-900 dark:text-slate-100 ${
              task.is_completed ? 'line-through text-slate-500 dark:text-slate-400' : ''
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
              {task.description}
            </p>
          )}

          {(task.attachment_url || task.external_link) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {task.attachment_url && (
                <a
                  href={task.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileImage className="h-3.5 w-3.5 text-indigo-500" />
                  Foto Papan / Lampiran
                </a>
              )}
              {task.external_link && (
                <a
                  href={task.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-sky-500" />
                  Buka Link Tugas
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${urgency.badgeClass}`}>
              <Clock className="h-3.5 w-3.5" />
              {formatDeadlineID(task.due_date)}
            </span>

            {task.updater?.full_name && (
              <span className="text-[11px] text-slate-400">
                Diperbarui {task.updater.full_name} &bull; {formatRelativeTime(task.updated_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
