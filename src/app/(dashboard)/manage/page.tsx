import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SubAdminManager } from '@/components/tasks/SubAdminManager';
import type { EditableTaskItem } from '@/components/tasks/EditTaskModal';
import type { Subject, TaskProgressStat, TaskType } from '@/types/database';

export const dynamic = 'force-dynamic';

interface RawTaskRow {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  type: TaskType;
  due_date: string;
  external_link: string | null;
  attachment_url: string | null;
  subjects:
    | { name: string; color_hex: string }
    | { name: string; color_hex: string }[]
    | null;
}

function mapTaskRow(t: RawTaskRow): EditableTaskItem {
  const subj = Array.isArray(t.subjects) ? t.subjects[0] : t.subjects;
  return {
    id: t.id,
    subject_id: t.subject_id,
    title: t.title,
    description: t.description,
    type: t.type,
    due_date: t.due_date,
    external_link: t.external_link,
    attachment_url: t.attachment_url,
    subject_name: subj?.name ?? 'Umum',
    subject_color: subj?.color_hex ?? '#64748B',
  };
}

export default async function ManageTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'sub_admin'].includes(profile.role)) {
    redirect('/');
  }

  const taskSelectFields = `
    id, subject_id, title, description, type, due_date,
    external_link, attachment_url,
    subjects ( name, color_hex )
  `;

  const [subjectsRes, activeTasksRes, archivedTasksRes, statsRes, membersCountRes] =
    await Promise.all([
      supabase
        .from('subjects')
        .select('id, name, teacher_name, color_hex')
        .order('name', { ascending: true }),
      supabase
        .from('tasks')
        .select(taskSelectFields)
        .eq('is_archived', false)
        .order('due_date', { ascending: true }),
      supabase
        .from('tasks')
        .select(taskSelectFields)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase.rpc('get_active_task_stats'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
    ]);

  const activeTasks = ((activeTasksRes.data ?? []) as unknown as RawTaskRow[]).map(mapTaskRow);
  const archivedTasks = ((archivedTasksRes.data ?? []) as unknown as RawTaskRow[]).map(mapTaskRow);

  const statsMap: Record<string, TaskProgressStat> = {};
  for (const row of (statsRes.data ?? []) as TaskProgressStat[]) {
    statsMap[row.task_id] = row;
  }

  const totalMembers = membersCountRes.count ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Panel Sub-Admin
        </h1>
        <p className="text-sm text-slate-500">
          Pantau progres anonim kelas, kelola tugas aktif &amp; arsip, serta bagikan ringkasan ke grup WhatsApp.
        </p>
      </div>

      <SubAdminManager
        subjects={(subjectsRes.data ?? []) as Subject[]}
        activeTasks={activeTasks}
        archivedTasks={archivedTasks}
        statsMap={statsMap}
        totalMembers={totalMembers}
      />
    </main>
  );
}
