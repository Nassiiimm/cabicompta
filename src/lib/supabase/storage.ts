import { createClient } from "@supabase/supabase-js";

function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const supabase = getStorageClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: false });

  if (error) {
    throw new Error(`Erreur upload: ${error.message}`);
  }

  return path;
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = getStorageClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Erreur URL signée: ${error?.message ?? "URL introuvable"}`);
  }

  return data.signedUrl;
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = getStorageClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Erreur suppression: ${error.message}`);
  }
}
