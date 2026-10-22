import test from 'node:test';
import assert from 'node:assert/strict';
import { dogPayload, validateVideoRequest } from '../lib/server/adminData.js';
import { getDogProfile } from '../lib/dogProfile.js';
import { publicDogVideo, orderedDogMedia } from '../lib/dogVideo.js';
import { BASIC_VACCINATION_KEYS, vaccinationLabels } from '../lib/vaccinations.js';

const base = 'https://example.supabase.co';
const video = `${base}/storage/v1/object/public/dog-images/dogs/videos/123e4567-e89b-42d3-a456-426614174000.mp4`;

test('only confirmed vaccines are exposed as labels and legacy prose is retained separately', () => {
  const profile = { vaccinations: '기존 5차 접종 기록', vaccinations_checked: ['rabies', 'parvovirus'] };
  assert.deepEqual(vaccinationLabels(profile), ['파보바이러스', '광견병']);
  assert.deepEqual(vaccinationLabels({ vaccinations: profile.vaccinations }), []);
  const saved = dogPayload({ category: 'adoption', age: '2살', images: [], profile });
  assert.equal(saved.profile.vaccinations, profile.vaccinations);
  assert.deepEqual(saved.profile.vaccinations_checked, ['rabies', 'parvovirus']);
  assert.throws(() => dogPayload({ category: 'adoption', images: [], profile: { vaccinations_checked: ['unknown'] } }), /접종/);
});

test('all five basic vaccines display one summary while optional items remain visible', () => {
  assert.equal(BASIC_VACCINATION_KEYS.length, 5);
  assert.deepEqual(vaccinationLabels({ vaccinations_checked: [...BASIC_VACCINATION_KEYS, 'influenza'] }), ['기본접종 5종 모두 완료', '개 인플루엔자']);
  assert.equal(vaccinationLabels({ vaccinations_checked: BASIC_VACCINATION_KEYS.slice(1) }).includes('기본접종 5종 모두 완료'), false);
});

test('gallery places every photo before videos, including video-only profiles', () => {
  assert.deepEqual(orderedDogMedia(['photo-1', 'photo-2'], ['video-1']).map(item => item.type), ['photo', 'photo', 'video']);
  assert.deepEqual(orderedDogMedia([], ['video-1']), [{ type: 'video', url: 'video-1' }]);
});

test('video upload validates type, size and public storage URL', () => {
  assert.deepEqual(validateVideoRequest({ type: 'video/mp4', size: 20 * 1024 * 1024 }), { extension: 'mp4' });
  assert.throws(() => validateVideoRequest({ type: 'video/mp4', size: 31 * 1024 * 1024 }), /30MB/);
  assert.throws(() => validateVideoRequest({ type: 'application/octet-stream', size: 100 }), /동영상/);
  assert.equal(publicDogVideo(video, base), video);
  assert.equal(publicDogVideo('https://other.example/videos/clip.mp4', base), '');
  assert.equal(publicDogVideo(`${video}?download=1`, base), '');
  const old = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  try {
    const saved = dogPayload({ category: 'resident', images: [], profile: { videos: [video], vaccinations_checked: [] } });
    assert.deepEqual(saved.profile.videos, [video]);
    assert.throws(() => dogPayload({ category: 'resident', images: [], profile: { videos: ['https://other.example/clip.mp4'] } }), /동영상/);
  } finally {
    if (old === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = old;
  }
});

test('unchecked introduction questions remain hidden after saving and reloading', () => {
  const dog = { age: '2살 추정', description: '소개합니다\n[성격] 활발해요\n[좋아하는 것] 산책',
    profile: { __structured: true, personality: '활발해요', likes: '산책', hidden_fields: ['likes'] } };
  assert.equal(getDogProfile(dog).likes, undefined);
  assert.equal(getDogProfile(dog).personality, '활발해요');
  const saved = dogPayload({ category: 'adoption', age: dog.age, images: [], description: dog.description, profile: dog.profile });
  assert.deepEqual(saved.profile.hidden_fields, ['likes']);
  assert.equal(getDogProfile({ ...dog, profile: saved.profile }).likes, undefined);
  assert.equal(saved.profile.likes, '산책');
});
