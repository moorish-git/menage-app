const BUCKET = 'property-photos';

export function publicPhotoUrl(storagePath) {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

export const PHOTO_BUCKET = BUCKET;
