import test from 'node:test';
import assert from 'node:assert/strict';
import {bannerPayload,bannerHref,BANNER_LIMIT} from '../lib/bannerRules.js';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://sample.supabase.co';
const url='https://sample.supabase.co/storage/v1/object/public/dog-images/dogs/demo.jpg';
test('limit counts hidden records as well',()=>assert.equal(BANNER_LIMIT,3));
test('requires owned uploaded image and title',()=>{
 assert.equal(bannerPayload({title:' 기본 ',image_url:url,target_type:'none',enabled:false}).title,'기본');
 assert.throws(()=>bannerPayload({title:'x',image_url:'https://other.test/a.jpg'}));
 assert.throws(()=>bannerPayload({title:'',image_url:url}));
});
test('external links accept only HTTP(S)',()=>{
 assert.throws(()=>bannerPayload({title:'x',image_url:url,target_type:'external',target_url:'javascript:alert(1)'}));
 assert.throws(()=>bannerPayload({title:'x',image_url:url,target_type:'external',target_url:'https://user:pw@example.org'}));
 assert.equal(bannerHref(bannerPayload({title:'x',image_url:url,target_type:'resident'})),'/residents');
 assert.equal(bannerHref(bannerPayload({title:'x',image_url:url,target_type:'external',target_url:'https://example.com'})),'https://example.com');
});
