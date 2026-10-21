import { createClient } from '@supabase/supabase-js';
import { PROFILE_FIELDS } from '../dogProfile';

const BUCKET = 'dog-images';
const ALLOWED_MIMES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function adminDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error('서버의 Supabase 관리 키 설정이 필요합니다.');
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function validId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

function shortText(value, limit) {
  if (typeof value !== 'string') throw new Error('입력 형식이 올바르지 않습니다.');
  const text = value.trim();
  if (text.length > limit) throw new Error('글자 수 제한을 확인해주세요.');
  return text;
}

function dateInput(value) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('날짜 형식을 확인해주세요.');
  }
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0,10) !== value) {
    throw new Error('존재하지 않는 날짜입니다.');
  }
  return value;
}

function imageUrl(value) {
  if (typeof value !== 'string' || value.length > 1024) return false;
  try {
    const image = new URL(value);
    const expected = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    return image.origin === expected.origin &&
      !image.username && !image.password &&
      !image.search && !image.hash &&
      image.pathname.startsWith('/storage/v1/object/public/' + BUCKET + '/dogs/');
  } catch {
    return false;
  }
}

export function dogPayload(form) {
  if (!form || typeof form !== 'object' || Array.isArray(form)) throw new Error('게시글 형식을 확인해주세요.');
  const category = form.category === 'resident' ? 'resident' : 'adoption';
  const name = shortText(form.name || '이름 미정', 80);
  const age = shortText(form.age || '나이 미정', 80);
  const description = shortText(form.description || '', 16000);
  const gender = form.gender === '남자' ? '남자' : '여자';
  const adopted = Boolean(form.adopted);
  if (!Array.isArray(form.images) || form.images.length > 3 || !form.images.every(imageUrl)) {
    throw new Error('등록된 사진 주소나 사진 수를 확인해주세요.');
  }

  const profile = category === 'adoption' ? { __structured: true } : {};
  if (category === 'adoption' && form.profile && typeof form.profile === 'object' && !Array.isArray(form.profile)) {
    for (const field of PROFILE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(form.profile, field.key)) {
        profile[field.key] = shortText(form.profile[field.key], 3500);
      }
    }
  }

  return {
    name, age, gender, description,
    neutered: Boolean(form.neutered),
    adopted,
    category,
    images: form.images,
    arrived_at: category === 'adoption' ? dateInput(form.arrived_at) : null,
    adopted_at: category === 'adoption' && adopted ? dateInput(form.adopted_at) : null,
    profile
  };
}

export function validateImageRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('이미지 정보를 확인해주세요.');
  const extension = ALLOWED_MIMES[body.type];
  if (!extension || !Number.isInteger(body.size) || body.size <= 0 || body.size > 10 * 1024 * 1024) {
    throw new Error('이미지는 JPG, PNG, WEBP, GIF, AVIF 형식으로 파일당 10MB 이하만 등록할 수 있습니다.');
  }
  return { extension };
}

export async function signedImageUpload(info) {
  const { extension } = validateImageRequest(info);
  const admin = adminDatabase();
  const path = 'dogs/' + crypto.randomUUID() + '.' + extension;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error('사진 업로드 권한을 생성하지 못했습니다.');
  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, token: data.token, publicUrl: publicData.publicUrl };
}
