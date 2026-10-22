export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export function publicDogVideo(value, supabaseUrl) {
  if (typeof value !== 'string' || value.length > 1024 || !supabaseUrl) return '';
  try {
    const url = new URL(value);
    const storage = new URL(supabaseUrl);
    return url.protocol === 'https:' && url.origin === storage.origin
      && /^\/storage\/v1\/object\/public\/dog-images\/dogs\/videos\/[0-9a-f-]{36}\.(mp4|webm|mov)$/.test(url.pathname)
      && !url.username && !url.password && !url.search && !url.hash ? url.href : '';
  } catch { return ''; }
}

export function dogVideoUrls(profile, supabaseUrl) {
  return Array.isArray(profile?.videos)
    ? profile.videos.map(url => publicDogVideo(url, supabaseUrl)).filter(Boolean).slice(0, 2) : [];
}

export function orderedDogMedia(images = [], videos = []) {
  return [
    ...images.map(url => ({ type: 'photo', url })),
    ...videos.map(url => ({ type: 'video', url }))
  ];
}
