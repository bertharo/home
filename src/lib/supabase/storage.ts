/** Public URL for an object in the vacation-photos bucket. */
export function vacationPhotoUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/vacation-photos/${path}`;
}
