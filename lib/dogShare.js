export const SITE_URL = 'https://baronado-adoption-site-8sm2.vercel.app';

export function publicDogImage(dog, supabaseUrl) {
  const raw = dog?.images?.[0];
  if (typeof raw !== 'string' || !supabaseUrl) return null;
  try {
    const photo = new URL(raw);
    const storage = new URL(supabaseUrl);
    if (photo.protocol !== 'https:' || photo.origin !== storage.origin
      || !photo.pathname.startsWith('/storage/v1/object/public/dog-images/')
      || photo.username || photo.password) return null;
    return photo.href;
  } catch {
    return null;
  }
}
