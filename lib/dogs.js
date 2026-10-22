import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getDogProfile } from './dogProfile';
import { resolveImageOrder } from './photoOrder';

const BUCKET = 'dog-images';
export const CATEGORY_ADOPTION = 'adoption';
export const CATEGORY_RESIDENT = 'resident';

export const CATEGORY_LABELS = {
  [CATEGORY_ADOPTION]: '가족을 찾아요',
  [CATEGORY_RESIDENT]: '상주견 소개'
};

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수를 확인해주세요.');
  }
}

export function getEmptyDog(category = CATEGORY_ADOPTION) {
  return {
    name: '',
    gender: '여자',
    neutered: false,
    age: '',
    description: '',
    images: [],
    category,
    adopted: false,
    arrived_at: '',
    adopted_at: '',
    profile: {}
  };
}

export function normalizeCategory(category) {
  return category === CATEGORY_RESIDENT ? CATEGORY_RESIDENT : CATEGORY_ADOPTION;
}

function normalizeImages(images) {
  if (Array.isArray(images)) return images.filter(Boolean).slice(0, 3);
  if (!images) return [];
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).slice(0, 3);
    } catch {}

    const trimmed = images.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^\"|\"$/g, ''))
        .filter(Boolean)
        .slice(0, 3);
    }

    return images.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3);
  }
  return [];
}

function normalizeDogRow(row) {
  if (!row) return row;
  return {
    ...row,
    images: normalizeImages(row.images),
    category: normalizeCategory(row.category),
    adopted: Boolean(row.adopted),
    profile: row.category === CATEGORY_RESIDENT ? (row.profile || {}) : getDogProfile(row)
  };
}

export async function fetchDogs(category = CATEGORY_ADOPTION) {
  requireSupabase();
  let query = supabase
    .from('dogs')
    .select('*')
    .order('adopted', { ascending: true })
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', normalizeCategory(category));

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeDogRow);
}

export async function fetchDog(id) {
  requireSupabase();
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return normalizeDogRow(data);
}

async function adminRequest(path, method, data) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '관리자 요청에 실패했습니다.');
  return result.data;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function uploadDogImages(files) {
  requireSupabase();
  const selected = Array.from(files || []);
  if (selected.length > 3) throw new Error('사진은 3장까지 등록할 수 있습니다.');
  const urls = [];
  for (const file of selected) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > 10 * 1024 * 1024 || file.size <= 0) {
      throw new Error('JPG, PNG, WEBP, GIF, AVIF 사진만 파일당 10MB 이하로 업로드할 수 있습니다.');
    }

    // Server authenticates the password session and signs a one-time upload.
    // File bytes go straight to Supabase Storage, never through Vercel.
    const ticket = await adminRequest('/api/admin/uploads', 'POST', {
      name: file.name, type: file.type, size: file.size
    });
    const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(
      ticket.path, ticket.token, file, { contentType: file.type, cacheControl: '3600' }
    );
    if (error) throw new Error('사진을 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.');
    urls.push(ticket.publicUrl);
  }
  return urls;
}

async function orderedImages(items) {
  if (!Array.isArray(items) || items.length > 3) throw new Error('사진은 3장까지 등록할 수 있습니다.');
  const uploaded = await uploadDogImages(items.filter(item => item.file).map(item => item.file));
  return resolveImageOrder(items, uploaded);
}

export async function createDog(form, items = []) {
  const images = await orderedImages(items);
  const payload = normalizeDogPayload({ ...form, images });
  return normalizeDogRow(await adminRequest('/api/admin/dogs', 'POST', payload));
}

export async function updateDog(id, form, items = []) {
  const images = await orderedImages(items);
  const payload = normalizeDogPayload({ ...form, images });
  return normalizeDogRow(await adminRequest('/api/admin/dogs/' + encodeURIComponent(id), 'PATCH', payload));
}

export async function deleteDog(id) {
  await adminRequest('/api/admin/dogs/' + encodeURIComponent(id), 'DELETE');
}

function normalizeDogPayload(form) {
  return {
    name: form.name?.trim() || '이름 미정',
    gender: form.gender || '여자',
    neutered: Boolean(form.neutered),
    age: form.age?.trim() || '나이 미정',
    description: form.description?.trim() || '',
    images: normalizeImages(form.images),
    category: normalizeCategory(form.category),
    adopted: Boolean(form.adopted),
    arrived_at: form.arrived_at || null,
    adopted_at: form.adopted && form.adopted_at ? form.adopted_at : null,
    profile: normalizeCategory(form.category) === CATEGORY_ADOPTION ? (form.profile || {}) : {}
  };
}
