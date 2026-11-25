'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TaskType } from '@/types/database';

const ATTACHMENT_BUCKET = 'task-attachments';

function extractAttachmentPath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${ATTACHMENT_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;

  const rawPath = publicUrl.slice(idx + marker.length).split('?')[0];
  return decodeURIComponent(rawPath);
}

export async function toggleTaskCompletion(taskId: string, isCurrentlyCompleted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  if (isCurrentlyCompleted) {
    const { error } = await supabase
      .from('task_completions')
      .delete()
      .match({ user_id: user.id, task_id: taskId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('task_completions')
      .insert({ user_id: user.id, task_id: taskId });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/manage');
  return { success: true };
}

export interface CreateTaskPayload {
  subject_id: string;
  title: string;
  description?: string;
  type: TaskType;
  due_date: string;
  external_link?: string;
  attachment_url?: string;
}

export async function createTask(payload: CreateTaskPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...payload,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id, title, due_date, subjects(name)')
    .single();

  if (error) {
    throw new Error('Gagal menyimpan tugas. Pastikan akunmu memiliki akses Sub-Admin.');
  }

  revalidatePath('/');
  revalidatePath('/manage');
  return data;
}

export interface UpdateTaskPayload {
  subject_id: string;
  title: string;
  description: string | null;
  type: TaskType;
  due_date: string;
  external_link: string | null;
  attachment_url: string | null;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('tasks')
    .update({
      subject_id: payload.subject_id,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      due_date: payload.due_date,
      external_link: payload.external_link,
      attachment_url: payload.attachment_url,
      updated_by: user.id,
    })
    .eq('id', taskId)
    .select('id, title, due_date, subjects(name)')
    .single();

  if (error) {
    throw new Error('Gagal memperbarui tugas. Pastikan akunmu memiliki akses Sub-Admin.');
  }

  revalidatePath('/');
  revalidatePath('/manage');
  return data;
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('tasks')
    .update({ is_archived: true, updated_by: user.id })
    .eq('id', taskId);

  if (error) {
    throw new Error('Gagal mengarsipkan tugas.');
  }

  revalidatePath('/');
  revalidatePath('/manage');
  return { success: true };
}

export async function restoreTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('tasks')
    .update({
      is_archived: false,
      updated_by: user.id,
    })
    .eq('id', taskId);

  if (error) {
    throw new Error('Gagal memulihkan tugas. Pastikan akunmu memiliki akses Sub-Admin.');
  }

  revalidatePath('/');
  revalidatePath('/manage');
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Hapus hanya jika tugas sudah berstatus diarsipkan
  const { data: deletedTask, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('is_archived', true)
    .select('attachment_url')
    .single();

  if (error || !deletedTask) {
    throw new Error(
      'Gagal menghapus tugas permanen. Pastikan tugas sudah diarsipkan dan akunmu memiliki akses Sub-Admin.'
    );
  }

  // Bersihkan lampiran di Supabase Storage
  const storagePath = extractAttachmentPath(deletedTask.attachment_url);
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      console.error('Gagal menghapus file lampiran di Storage:', storageError.message);
    }
  }

  revalidatePath('/');
  revalidatePath('/manage');
  return { success: true };
}
