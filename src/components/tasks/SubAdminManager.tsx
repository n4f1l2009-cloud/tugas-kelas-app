'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  PlusCircle,
  X,
} from 'lucide-react';
import type { Subject, TaskProgressStat, TaskType } from '@/types/database';
import { createTask } from '@/actions/task-actions';
import {
  formatFileSize,
  prepareAttachmentFile,
  type CompressionResult,
} from '@/lib/utils/image-compress';
import { deleteTaskAttachment, uploadTaskAttachment } from '@/lib/supabase/storage';
import { ClassProgressSummary } from './ClassProgressSummary';
import { CopyWhatsAppButton } from './CopyWhatsAppButton';
import { EditTaskModal, type EditableTaskItem } from './EditTaskModal';
import { ManagedTaskTabs } from './ManagedTaskTabs';

interface SubAdminManagerProps {
  subjects: Subject[];
  activeTasks: EditableTaskItem[];
  archivedTasks: EditableTaskItem[];
  statsMap: Record<string, TaskProgressStat>;
  totalMembers: number;
}

export function SubAdminManager({
  subjects,
  activeTasks,
  archivedTasks,
  statsMap,
  totalMembers,
}: SubAdminManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<EditableTaskItem | null>(null);

  const [lastSaved, setLastSaved] = useState<{
    mode: 'created' | 'updated';
    title: string;
    subjectName: string;
    dueDate: string;
    type: TaskType;
    description: string;
  } | null>(null);

  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('offline');
  const [dueDateLocal, setDueDateLocal] = useState('');
  const [externalLink, setExternalLink] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preparedAttachment, setPreparedAttachment] = useState<CompressionResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearAttachment = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreparedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setError(null);
    setIsCompressing(true);

    try {
      const result = await prepareAttachmentFile(rawFile);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (result.file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(result.file));
      } else {
        setPreviewUrl(null);
      }

      setPreparedAttachment(result);
    } catch (err) {
      clearAttachment();
      setError(err instanceof Error ? err.message : 'Gagal memproses file lampiran.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusNotice(null);

    if (!subjectId || !title.trim() || !dueDateLocal) {
      setError('Mata pelajaran, judul tugas, dan deadline wajib diisi.');
      return;
    }

    const isoDueDate = new Date(dueDateLocal).toISOString();
    const chosenSubject = subjects.find((s) => s.id === subjectId);

    let uploadedUrl: string | undefined;
    let uploadedPath: string | undefined;

    if (preparedAttachment) {
      setIsUploading(true);
      try {
        const uploaded = await uploadTaskAttachment(preparedAttachment.file);
        uploadedUrl = uploaded.publicUrl;
        uploadedPath = uploaded.storagePath;
      } catch (err) {
        setIsUploading(false);
        setError(err instanceof Error ? err.message : 'Gagal mengunggah lampiran.');
        return;
      }
      setIsUploading(false);
    }

    startTransition(async () => {
      try {
        await createTask({
          subject_id: subjectId,
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          due_date: isoDueDate,
          external_link: externalLink.trim() || undefined,
          attachment_url: uploadedUrl,
        });

        setLastSaved({
          mode: 'created',
          title: title.trim(),
          subjectName: chosenSubject?.name ?? 'Umum',
          dueDate: isoDueDate,
          type,
          description: description.trim(),
        });

        setTitle('');
        setDescription('');
        setExternalLink('');
        setDueDateLocal('');
        clearAttachment();
      } catch (err) {
        if (uploadedPath) {
          await deleteTaskAttachment(uploadedPath).catch(() => {});
        }
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
      }
    });
  };

  const isBusy = isPending || isCompressing || isUploading;

  return (
    <div className="space-y-8">
      {/* Statistik Progres Kelas (Agregat Anonim) */}
      <ClassProgressSummary
        totalMembers={totalMembers}
        activeTasks={activeTasks}
        statsMap={statsMap}
      />

      {/* Alert Error Global Panel Sub-Admin */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Tutup pesan error"
            className="ml-2 rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Notifikasi Status Arsip / Pulihkan / Hapus */}
      {statusNotice && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
          <span>{statusNotice}</span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Tutup notifikasi"
            className="ml-2 rounded-lg p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Banner Sukses + Tombol Instan Salin ke WA */}
      {lastSaved && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                {lastSaved.mode === 'updated'
                  ? 'Perubahan tugas berhasil disimpan!'
                  : 'Tugas berhasil dipublikasikan!'}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {lastSaved.mode === 'updated'
                  ? 'Salin info terbaru ini ke grup WA agar teman-teman tahu ada revisi.'
                  : 'Bagikan ringkasannya ke grup kelas sekarang agar teman-teman langsung tahu.'}
              </p>
            </div>
          </div>
          <CopyWhatsAppButton
            title={lastSaved.title}
            subjectName={lastSaved.subjectName}
            dueDate={lastSaved.dueDate}
            type={lastSaved.type}
            description={lastSaved.description}
          />
        </div>
      )}

      {/* Form Tambah Tugas */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          <PlusCircle className="h-5 w-5 text-indigo-500" />
          Input Tugas Baru
        </h2>

        {subjects.length === 0 ? (
          <p className="mt-3 text-sm text-amber-600">
            Belum ada mata pelajaran. Minta Admin menambahkan daftar mata pelajaran terlebih dahulu.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                placeholder="Contoh: LKS Bab 3 Hal. 45 Nomor 1-10"
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
                placeholder="Tulis cara pengerjaan, format file, atau catatan khusus..."
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
                  Link Google Classroom / Form (Opsional)
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
                Foto Papan Tulis / Lampiran PDF (Opsional)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="task-attachment-input"
              />

              {!preparedAttachment ? (
                <label
                  htmlFor="task-attachment-input"
                  className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-950/60"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Mengompresi gambar ke WebP...
                      </span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Ketuk untuk ambil foto atau pilih file
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Foto otomatis dikompresi ke WebP &bull; PDF maksimal 5 MB
                      </span>
                    </>
                  )}
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex min-w-0 items-center gap-3">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Pratinjau lampiran"
                        className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {preparedAttachment.file.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {preparedAttachment.wasCompressed ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            Dikompresi: {formatFileSize(preparedAttachment.originalSize)} menjadi{' '}
                            {formatFileSize(preparedAttachment.compressedSize)}
                          </span>
                        ) : (
                          <span>Ukuran: {formatFileSize(preparedAttachment.compressedSize)}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearAttachment}
                    disabled={isBusy}
                    aria-label="Hapus lampiran"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUploading
                ? 'Mengunggah Lampiran...'
                : isPending
                  ? 'Menyimpan Tugas...'
                  : 'Publikasikan Tugas ke Semua Siswa'}
            </button>
          </form>
        )}
      </section>

      {/* Tab Daftar Tugas Aktif & Diarsipkan */}
      <ManagedTaskTabs
        activeTasks={activeTasks}
        archivedTasks={archivedTasks}
        statsMap={statsMap}
        totalMembers={totalMembers}
        onEdit={(task) => setEditingTask(task)}
        onNotice={(msg) => {
          setStatusNotice(msg);
          setLastSaved(null);
        }}
        onError={(msg) => setError(msg)}
      />

      {/* Modal Edit Tugas */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          subjects={subjects}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) => {
            setLastSaved({
              mode: 'updated',
              ...updated,
            });
            setStatusNotice(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
