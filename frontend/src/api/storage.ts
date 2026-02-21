import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okqslsrnowidxclqxcdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcXNsc3Jub3dpZHhjbHF4Y2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTk0ODMsImV4cCI6MjA4NjgzNTQ4M30.lcBL8AHF293YR3g2QLSEppPeeJooz5tDr7TxxVZjMJ0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = 'task-attachments';

/**
 * Upload a file to Supabase Storage and return its public URL.
 * The bucket must be public (or you should generate a signed URL instead).
 */
export async function uploadTaskAttachment(
    file: File,
    taskId: number
): Promise<{ path: string; publicUrl: string }> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const storagePath = `tasks/${taskId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { upsert: false });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

    return { path: storagePath, publicUrl: data.publicUrl };
}

export async function removeTaskAttachment(storagePath: string): Promise<void> {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
}
