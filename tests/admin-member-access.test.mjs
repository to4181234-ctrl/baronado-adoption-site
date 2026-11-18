import test from 'node:test';
import assert from 'node:assert/strict';
import {adminMemberIds,isAllowedAdminMember} from '../lib/adminAccessPolicy.js';
import {adminReady,adminAuthMode,adminPasswordlessPreview,validPassword,hasAdminSession} from '../lib/server/adminSession.js';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('admin membership uses exact immutable IDs, not a matching editable name or email',()=>{
 const ids=adminMemberIds(A);
 assert.equal(isAllowedAdminMember({id:B,nickname:A,email:A},ids),false);
 assert.equal(isAllowedAdminMember({id:A,disabled:true},ids),false);
 assert.equal(isAllowedAdminMember(null,ids),false);
 assert.equal(isAllowedAdminMember({id:A,disabled:false},ids),true);
});
test('malformed or empty admin configuration fails closed rather than accepting partial IDs',()=>{
 assert.deepEqual(adminMemberIds(''),[]);assert.deepEqual(adminMemberIds(A+',*'),[]);
 assert.deepEqual(adminMemberIds('prefix'+A),[]);
 assert.deepEqual(adminMemberIds(A+'\n'+A+','+B),[A,B]);
});
test('member mode defaults on, needs an allowlist, and cannot fall back to development/password bypass',async()=>{
 const names=['ADMIN_AUTH_MODE','ADMIN_MEMBER_IDS','ADMIN_PASSWORD','ADMIN_SESSION_SECRET','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL','NODE_ENV','ADMIN_PASSWORDLESS_PREVIEW','VERCEL_ENV'];
 const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{
  delete process.env.ADMIN_AUTH_MODE;delete process.env.ADMIN_MEMBER_IDS;
  Object.assign(process.env,{NODE_ENV:'development',VERCEL_ENV:'preview',ADMIN_PASSWORDLESS_PREVIEW:'1',ADMIN_PASSWORD:'old-test-only',ADMIN_SESSION_SECRET:'qa-only-secret-thirty-two-characters',SUPABASE_SERVICE_ROLE_KEY:'qa-only',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:55435'});
  assert.equal(adminAuthMode(),'member');assert.equal(adminReady(),false);assert.equal(adminPasswordlessPreview(),false);assert.equal(validPassword('old-test-only'),false);
  assert.equal(await hasAdminSession({cookies:{get:()=>null}}),false);
  process.env.ADMIN_MEMBER_IDS=A;assert.equal(adminReady(),true);
  process.env.ADMIN_AUTH_MODE='typo';assert.equal(adminReady(),false);
 }finally{for(const n of names){if(saved[n]===undefined)delete process.env[n];else process.env[n]=saved[n];}}
});
