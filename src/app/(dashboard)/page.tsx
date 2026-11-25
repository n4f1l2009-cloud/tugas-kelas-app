import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TaskListBoard } from '@/components/tasks/TaskListBoard';
import type { Subject, TaskType, TaskWithRelations } from '@/types/database';

export const dynamic = 'force-dynamic';

interface RawStudentTaskRow {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  type: TaskType;
  attachment_url: string | null;
  external_link: string | null;
  due_date: string;
  is_archived: boolean;
  updated_at: string;
  subjects:
    | { id: string; name: string; color_hex: string }
    | { id: string; name: string; color_hex: string }[]
    | null;
  updater:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
}

export default async function StudentHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [tasksRes, completionsRes, subjectsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select(`
        id, subject_id, title, description, type, attachment_url,
        external_link, due_date, is_archived, updated_at,
        subjects ( id, name, color_hex ),
        updater:profiles!tasks_updated_by_fkey ( full_name )
      `)
      .eq('is_archived', false)
      .order('due_date', { ascending: true }),
    supabase
      .from('task_completions')
      .select('task_id')
      .eq('user_id', user.id),
    supabase
      .from('subjects')
      .select('id, name, teacher_name, color_hex')
      .order('name', { ascending: true }),
  ]);

  const completedSet = new Set((completionsRes.data ?? []).map((c) => c.task_id));

  const rawRows = (tasksRes.data ?? []) as unknown as RawStudentTaskRow[];
  const formattedTasks: TaskWithRelations[] = rawRows.map((row) => {
    const subjectObj = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    const updaterObj = Array.isArray(row.updater) ? row.updater[0] : row.updater;

    return {
      id: row.id,
      subject_id: row.subject_id,
      title: row.title,
      description: row.description,
      type: row.type,
      attachment_url: row.attachment_url,
      external_link: row.external_link,
      due_date: row.due_date,
      is_archived: row.is_archived,
      updated_at: row.updated_at,
      subjects: subjectObj ?? { id: row.subject_id, name: 'Umum', color_hex: '#64748B' },
      updater: updaterObj ?? null,
      is_completed: completedSet.has(row.id),
    };
  });

  const subjects: Subject[] = (subjectsRes.data ?? []) as Subject[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <TaskListBoard initialTasks={formattedTasks} subjects={subjects} />
    </main>
  );
}
