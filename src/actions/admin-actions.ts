'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi tidak valid. Silakan login kembali.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Akses ditolak. Hanya Admin yang dapat melakukan tindakan ini.');
  }

  return { supabase, adminId: user.id };
}

export async function createSubject(payload: {
  name: string;
  teacher_name?: string;
  color_hex: string;
}) {
  const { supabase } = await requireAdmin();

  const cleanName = payload.name.trim();
  if (!cleanName) throw new Error('Nama mata pelajaran wajib diisi.');

  const { error } = await supabase.from('subjects').insert({
    name: cleanName,
    teacher_name: payload.teacher_name?.trim() || null,
    color_hex: payload.color_hex || '#3B82F6',
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Mata pelajaran "${cleanName}" sudah terdaftar.`);
    }
    throw new Error('Gagal menambahkan mata pelajaran.');
  }

  revalidatePath('/admin');
  revalidatePath('/manage');
  revalidatePath('/');
  return { success: true };
}

export async function deleteSubject(subjectId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId);

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Mata pelajaran ini tidak bisa dihapus karena masih terhubung dengan tugas yang sudah dibuat.'
      );
    }
    throw new Error('Gagal menghapus mata pelajaran.');
  }

  revalidatePath('/admin');
  revalidatePath('/manage');
  revalidatePath('/');
  return { success: true };
}

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
  const { supabase, adminId } = await requireAdmin();

  if (targetUserId === adminId) {
    throw new Error('Kamu tidak dapat mengubah role akunmu sendiri dari panel ini.');
  }

  if (!['student', 'sub_admin'].includes(newRole)) {
    throw new Error('Role tujuan tidak valid.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (error) {
    throw new Error('Gagal memperbarui role pengguna.');
  }

  revalidatePath('/admin');
  return { success: true };
}
