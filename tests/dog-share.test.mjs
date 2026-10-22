import test from 'node:test';
import assert from 'node:assert/strict';
import { publicDogImage } from '../lib/dogShare.js';

test('uses the representative photo only from the public dog storage bucket', () => {
  const url = 'https://sample.supabase.co/storage/v1/object/public/dog-images/dogs/one.jpg';
  assert.equal(publicDogImage({ images: [url] }, 'https://sample.supabase.co'), url);
  assert.equal(publicDogImage({ images: ['https://other.example/dog.jpg'] }, 'https://sample.supabase.co'), null);
  assert.equal(publicDogImage({ images: [] }, 'https://sample.supabase.co'), null);
});
