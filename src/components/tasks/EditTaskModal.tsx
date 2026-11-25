'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  ExternalLink,
  FileImage,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import type { Subject, TaskType } from '@/types/database';
import { updateTask } from '@/actions/task-actions';
import {
  formatFileSize,
  prepareAttachmentFile,
  type CompressionResult,
} from '@/lib/utils/image-compress';
import {
  deleteTaskAttachment,
  extractStoragePathFromUrl,
  uploadTaskAttachment,
} from '@/lib/supabase/storage';

export interface EditableTaskItem {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  type: TaskType;
  due_date: string;
  external_link: string | null;
  attachment_url: string | null;
  subject_name: string;
  subject_color: string;
}

interface EditTaskModalProps {
  task: EditableTaskItem;
  subjects: Subject[];
  onClose: () => void;
  onSaved: (updated: {
    title: string;
    subjectName: string;
    dueDate: string;
    type: TaskType;
    description: string;
  }) => void;
}

function toDateTimeLocalValue(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditTaskModal({ task, subjects, onClose, onSaved }: EditTaskModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjectId, setSubjectId] = useState(task.subject_id);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [type, setType] = useState<TaskType>(task.type);
  const [dueDateLocal, setDueDateLocal] = useState(() => toDateTimeLocalValue(task.due_date));
  const [externalLink, setExternalLink] = useState(task.external_link ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keptOldUrl, setKeptOldUrl] = useState<string | null>(task.attachment_url);
  const [newAttachment, setNewAttachment] = useState<CompressionResult | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);

  const isBusy = isPending || isCompressing || isUploading;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  useEffect(() => {
    return () => {
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    };
  }, [newPreviewUrl]);

  const clearNewAttachment = () => {
    if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    setNewPreviewUrl(null);
    setNewAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setError(null);
    setIsCompressing(true);

    try {
      const result = await prepareAttachmentFile(rawFile);
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);

      if (result.file.type.startsWith('image/')) {
        setNewPreviewUrl(URL.createObjectURL(result.file));
      } else {
        setNewPreviewUrl(null);
      }

      setNewAttachment(result);
    } catch (err) {
      clearNewAttachment();
      setError(err instanceof Error ? err.message : 'Gagal memproses file baru.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subjectId || !title.trim() || !dueDateLocal) {
      setError('Mata pelajaran, judul tugas, dan deadline wajib diisi.');
      return;
    }

    const isoDueDate = new Date(dueDateLocal).toISOString();
    const chosenSubject = subjects.find((s) => s.id === subjectId);

    let finalAttachmentUrl: string | null = keptOldUrl;
    let newlyUploadedPath: string | null = null;

    if (newAttachment) {
      setIsUploading(true);
      try {
        const uploaded = await uploadTaskAttachment(newAttachment.file);
        finalAttachmentUrl = uploaded.publicUrl;
        newlyUploadedPath = uploaded.storagePath;
      } catch (err) {
        setIsUploading(false);
        setError(err instanceof Error ? err.message : 'Gagal mengunggah lampiran baru.');
        return;
      }
      setIsUploading(false);
    }

    startTransition(async () => {
      try {
        await updateTask(task.id, {
          subject_id: subjectId,
          title: title.trim(),
          description: description.trim() || null,
          type,
          due_date: isoDueDate,
          external_link: externalLink.trim() || null,
          attachment_url: finalAttachmentUrl,
        });

        const oldWasRemovedOrReplaced =
          task.attachment_url && task.attachment_url !== finalAttachmentUrl;
        if (oldWasRemovedOrReplaced) {
          const oldPath = extractStoragePathFromUrl(task.attachment_url);
          if (oldPath) {
            await deleteTaskAttachment(oldPath).catch(() => {});
          }
        }

        onSaved({
          title: title.trim(),
          subjectName: chosenSubject?.name ?? task.subject_name,
          dueDate: isoDueDate,
          type,
          description: description.trim(),
        });
        onClose();
      } catch (err) {
        if (newlyUploadedPath) {
          await deleteTaskAttachment(newlyUploadedPath).catch(() => {});
        }
        setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan tugas.');
      }
    });
  };

  const isOldPdf = keptOldUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={() => {
        if (!isBusy) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <div>
            <h2 id="edit-task-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Edit Tugas
            </h2>
            <p className="text-xs text-slate-500">
              Perubahan langsung terlihat oleh seluruh siswa secara real-time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Tutup modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mata Pelajaran *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipe Pengumpulan *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['offline', 'online'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-colors ${
                      type === option
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Tugas *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Detail / Instruksi Guru
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kosongkan jika tidak ada catatan tambahan..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deadline *
              </label>
              <input
                type="datetime-local"
                value={dueDateLocal}
                onChange={(e) => setDueDateLocal(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Link Google Classroom / Form
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://classroom.google.com/..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Foto Papan Tulis / Lampiran PDF
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="edit-task-attachment-input"
            />

            {newAttachment ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
                <div className="flex min-w-0 items-center gap-3">
                  {newPreviewUrl ? (
                    <img
                      src={newPreviewUrl}
                      alt="Pratinjau lampiran baru"
                      className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Baru: {newAttachment.file.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                      {newAttachment.wasCompressed
                        ? `Dikompresi: ${formatFileSize(newAttachment.originalSize)} menjadi ${formatFileSize(newAttachment.compressedSize)}`
                        : `Ukuran: ${formatFileSize(newAttachment.compressedSize)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearNewAttachment}
                  disabled={isBusy}
                  title="Batalkan file pengganti"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : keptOldUrl ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  {isOldPdf ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                      <FileText className="h-5 w-5" />
                    </div>
                  ) : (
                    <img
                      src={keptOldUrl}
                      alt="Lampiran saat ini"
                      className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Lampiran terpasang saat ini
                    </p>
                    <a
                      href={keptOldUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <ExternalLink className="h-3 w-3" /> Lihat ukuran penuh
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="edit-task-attachment-input"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <FileImage className="h-3.5 w-3.5" />
                    Ganti
                  </label>
                  <button
                    type="button"
                    onClick={() => setKeptOldUrl(null)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="edit-task-attachment-input"
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-4 text-center hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950/60"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Mengompresi gambar ke WebP...
                    </span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Unggah foto papan tulis atau PDF baru
                    </span>
                  </>
                )}
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isUploading
                ? 'Mengunggah...'
                : isPending
                  ? 'Menyimpan...'
                  : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
