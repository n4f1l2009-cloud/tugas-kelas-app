import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'task-attachments';

export async function uploadTaskAttachment(file: File): Promise<{
  publicUrl: string;
  storagePath: string;
}> {
  const supabase = createClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `tasks/${year}/${month}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error('Gagal mengunggah lampiran. Pastikan akunmu memiliki akses Sub-Admin.');
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}

export async function deleteTaskAttachment(storagePath: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
}

export function extractStoragePathFromUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;

  const rawPath = publicUrl.slice(idx + marker.length).split('?')[0];
  return decodeURIComponent(rawPath);
}
