import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminControlPanel } from '@/components/admin/AdminControlPanel';
import type { Profile, Subject } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    redirect('/');
  }

  const [subjectsRes, usersRes] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, name, teacher_name, color_hex')
      .order('name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role')
      .order('role', { ascending: true })
      .order('full_name', { ascending: true }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Panel Admin
        </h1>
        <p className="text-sm text-slate-500">
          Kelola daftar mata pelajaran dan tunjuk sekretaris kelas sebagai Sub-Admin.
        </p>
      </div>

      <AdminControlPanel
        currentAdminId={user.id}
        subjects={(subjectsRes.data ?? []) as Subject[]}
        users={(usersRes.data ?? []) as Profile[]}
      />
    </main>
  );
}
