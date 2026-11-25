import { CheckSquare } from 'lucide-react';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasAuthError = params.error === 'auth_failed';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
          <CheckSquare className="h-6 w-6" />
        </div>

        <div className="mt-5 text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Daftar Tugas Kelas
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Satu tempat rapi untuk semua tugas offline &amp; online. Tanpa tertimbun chat grup.
          </p>
        </div>

        {hasAuthError && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-center text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
            Sesi login gagal atau dibatalkan. Silakan masuk kembali.
          </div>
        )}

        <div className="mt-6">
          <GoogleLoginButton />
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
          Status centang tugasmu tersimpan otomatis di akun Google dan sinkron di HP maupun laptop.
        </p>
      </div>
    </main>
  );
}
