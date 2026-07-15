import { supabase, isSupabaseConfigured } from './supabaseClient';

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
    adopted: false
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
    adopted: Boolean(row.adopted)
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

function sanitizeFileName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export async function uploadDogImages(files) {
  requireSupabase();
  if (!files || files.length === 0) return [];

  const urls = [];
  for (const file of Array.from(files).slice(0, 3)) {
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const filePath = `dogs/${fileName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    urls.push(data.publicUrl);
  }

  return urls;
}

export async function createDog(form, files) {
  requireSupabase();
  const imageUrls = await uploadDogImages(files);
  const payload = normalizeDogPayload({ ...form, images: imageUrls });

  const { data, error } = await supabase
    .from('dogs')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizeDogRow(data);
}

export async function updateDog(id, form, newFiles = []) {
  requireSupabase();
  const uploaded = await uploadDogImages(newFiles);
  const nextImages = [...normalizeImages(form.images), ...normalizeImages(uploaded)].slice(0, 3);
  const payload = normalizeDogPayload({ ...form, images: nextImages });

  const { data, error } = await supabase
    .from('dogs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return normalizeDogRow(data);
}

export async function deleteDog(id) {
  requireSupabase();
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  if (error) throw error;
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
    adopted: Boolean(form.adopted)
  };
}
