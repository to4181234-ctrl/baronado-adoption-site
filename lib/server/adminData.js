import { createClient } from '@supabase/supabase-js';
import { PROFILE_FIELDS } from '../dogProfile.js';

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

export function imageUrl(value) {
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
  const ageDetails = form.profile && typeof form.profile === 'object' && !Array.isArray(form.profile) ? form.profile : {};
  if (ageDetails.age_kind !== undefined) {
    if (!['exact', 'estimated'].includes(ageDetails.age_kind)) throw new Error('나이 종류를 확인해주세요.');
    const years = Number(ageDetails.age_years);
    const months = Number(ageDetails.age_months);
    if (ageDetails.age_years === '' || ageDetails.age_years == null || !Number.isInteger(years) || years < 0 || years > 30 ||
        ageDetails.age_months === '' || ageDetails.age_months == null || !Number.isInteger(months) || months < 0 || months > 11) {
      throw new Error('나이는 0~30살, 0~11개월 중에서 선택해주세요.');
    }
    profile.age_kind = ageDetails.age_kind;
    profile.age_years = years;
    profile.age_months = months;
    profile.birth_date = dateInput(ageDetails.birth_date);
    profile.age_auto_update = Boolean(ageDetails.age_auto_update);
    if (profile.age_kind === 'exact' && !profile.birth_date) throw new Error('정확한 생년월일을 입력해주세요.');
    const todayParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const todayPart = type => todayParts.find(part => part.type === type)?.value;
    const today = `${todayPart('year')}-${todayPart('month')}-${todayPart('day')}`;
    if (profile.birth_date && profile.birth_date > today) {
      throw new Error('생년월일은 오늘 이후로 설정할 수 없습니다.');
    }
    if (profile.age_kind === 'estimated' && profile.age_auto_update && !dateInput(form.arrived_at)) {
      throw new Error('추정 나이 자동 계산에는 바로나도에 온 날이 필요합니다.');
    }
  }
  if (category === 'adoption' && form.profile && typeof form.profile === 'object' && !Array.isArray(form.profile)) {
    for (const field of PROFILE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(form.profile, field.key)) {
        profile[field.key] = shortText(form.profile[field.key], 3500);
      }
    }
    const details = form.profile;
    profile.age_reference_date_none = Boolean(details.age_reference_date_none);
    profile.age_reference_date = profile.age_reference_date_none ? null : dateInput(details.age_reference_date);
    profile.age_reference_years = details.age_reference_years === '' || details.age_reference_years == null
      ? null : Number(details.age_reference_years);
    if (profile.age_reference_years !== null && (!Number.isInteger(profile.age_reference_years) || profile.age_reference_years < 0 || profile.age_reference_years > 30)) {
      throw new Error('추정 나이를 확인해주세요.');
    }
    profile.age_auto_update = Boolean(details.age_auto_update);
    if (!profile.age_kind && profile.age_auto_update && ((!profile.age_reference_date && !dateInput(form.arrived_at)) || profile.age_reference_years === null)) {
      throw new Error('자동 나이 업데이트에는 추정 나이와 안내받은 날짜 또는 바로나도에 온 날이 필요합니다.');
    }
    profile.shelter_name = shortText(details.shelter_name || '', 200);
    profile.shelter_url = shortText(details.shelter_url || '', 1024);
    if (profile.shelter_url) {
      try {
        const url = new URL(profile.shelter_url);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
        profile.shelter_url = url.href;
      } catch { throw new Error('보호소 홈페이지 주소를 확인해주세요.'); }
    }
    if (details.extra_questions !== undefined) {
      if (!Array.isArray(details.extra_questions) || details.extra_questions.length > 20) throw new Error('추가 소개는 20개까지 입력할 수 있습니다.');
      profile.extra_questions = details.extra_questions.map(entry => ({
        question: shortText(entry?.question || '', 200),
        answer: shortText(entry?.answer || '', 3500)
      })).filter(entry => entry.question && entry.answer);
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
