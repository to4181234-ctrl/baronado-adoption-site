import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'dog-images';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수를 확인해주세요.');
  }
}

export function getEmptyDog() {
  return {
    name: '',
    gender: '여자',
    neutered: false,
    age: '',
    description: '',
    images: []
  };
}

export async function fetchDogs() {
  requireSupabase();
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchDog(id) {
  requireSupabase();
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
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
  return data;
}

export async function updateDog(id, form, newFiles = []) {
  requireSupabase();
  const uploaded = await uploadDogImages(newFiles);
  const nextImages = [...(form.images ?? []), ...uploaded];
  const payload = normalizeDogPayload({ ...form, images: nextImages });

  const { data, error } = await supabase
    .from('dogs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
    images: Array.isArray(form.images) ? form.images : []
  };
}
