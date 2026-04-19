import { supabase } from './supabase';

const BUCKET = 'photos';

export function publicImageUrl(path: string): string {
  if (!path) return '';
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPhoto(ownerId: string, blob: Blob): Promise<string> {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deletePhoto(path: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
