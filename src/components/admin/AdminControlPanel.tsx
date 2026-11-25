'use client';

import { useMemo, useState, useTransition } from 'react';
import { BookOpen, Plus, Search, Trash2, Users } from 'lucide-react';
import type { Profile, Subject, UserRole } from '@/types/database';
import { createSubject, deleteSubject, updateUserRole } from '@/actions/admin-actions';
import { RoleBadge } from '@/components/ui/RoleBadge';

const COLOR_PRESETS = [
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#475569',
];

interface AdminControlPanelProps {
  currentAdminId: string;
  subjects: Subject[];
  users: Profile[];
}

export function AdminControlPanel({
  currentAdminId,
  subjects,
  users,
}: AdminControlPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [colorHex, setColorHex] = useState(COLOR_PRESETS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      try {
        await createSubject({
          name: subjectName,
          teacher_name: teacherName,
          color_hex: colorHex,
        });
        setSubjectName('');
        setTeacherName('');
        setFeedback({ type: 'success', text: 'Mata pelajaran berhasil ditambahkan.' });
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Gagal menambah mata pelajaran.',
        });
      }
    });
  };

  const handleDeleteSubject = (subject: Subject) => {
    if (!confirm(`Hapus mata pelajaran "${subject.name}"?`)) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        await deleteSubject(subject.id);
        setFeedback({ type: 'success', text: `Mata pelajaran "${subject.name}" dihapus.` });
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Gagal menghapus mata pelajaran.',
        });
      }
    });
  };

  const handleRoleChange = (user: Profile, nextRole: UserRole) => {
    setFeedback(null);

    startTransition(async () => {
      try {
        await updateUserRole(user.id, nextRole);
        setFeedback({
          type: 'success',
          text: `Role ${user.full_name ?? user.email} diubah menjadi ${
            nextRole === 'sub_admin' ? 'Sub-Admin' : 'Siswa'
          }.`,
        });
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Gagal memperbarui role.',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Manajemen Mata Pelajaran */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Mata Pelajaran ({subjects.length})
        </h2>

        <form onSubmit={handleAddSubject} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nama Mata Pelajaran *
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Contoh: Administrasi Infrastruktur Jaringan"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nama Guru (Opsional)
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Contoh: Pak Budi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Warna Label:
              </span>
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColorHex(hex)}
                    aria-label={`Pilih warna ${hex}`}
                    className={`h-6 w-6 rounded-full transition-transform ${
                      colorHex === hex
                        ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900'
                        : ''
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Tambah Mapel
            </button>
          </div>
        </form>

        <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {subjects.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              Belum ada mata pelajaran. Tambahkan minimal satu agar Sub-Admin bisa mulai mengisi tugas.
            </p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color_hex }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {subject.name}
                    </p>
                    {subject.teacher_name && (
                      <p className="text-xs text-slate-500">{subject.teacher_name}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSubject(subject)}
                  disabled={isPending}
                  title="Hapus mapel"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Manajemen Role Pengguna */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-indigo-500" />
            Daftar Pengguna ({users.length})
          </h2>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none sm:w-56 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Siswa akan muncul di daftar ini otomatis setelah login pertama kali pakai Google.
        </p>

        <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentAdminId;
            const isOtherAdmin = user.role === 'admin';

            return (
              <div
                key={user.id}
                className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name ?? user.email}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {(user.full_name ?? user.email).slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {user.full_name ?? 'Tanpa Nama'}
                      </p>
                      <RoleBadge role={user.role} />
                    </div>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelf || isOtherAdmin ? (
                    <span className="text-xs font-medium text-slate-400">
                      {isSelf ? 'Akun Kamu' : 'Admin Sistem'}
                    </span>
                  ) : (
                    <div className="inline-flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
                      <button
                        type="button"
                        disabled={isPending || user.role === 'student'}
                        onClick={() => handleRoleChange(user, 'student')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          user.role === 'student'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Siswa
                      </button>
                      <button
                        type="button"
                        disabled={isPending || user.role === 'sub_admin'}
                        onClick={() => handleRoleChange(user, 'sub_admin')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          user.role === 'sub_admin'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400'
                        }`}
                      >
                        Sub-Admin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
