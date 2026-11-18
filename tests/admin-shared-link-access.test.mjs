import test from 'node:test';
import assert from 'node:assert/strict';
import {adminAccess,adminAuthMode,adminReady,hasAdminSession,validPassword,adminPasswordlessPreview,sameOrigin} from '../lib/server/adminSession.js';

const names=['ADMIN_AUTH_MODE','ADMIN_MEMBER_IDS','ADMIN_PASSWORD','ADMIN_SESSION_SECRET','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL','NODE_ENV','VERCEL_ENV'];
function withEnv(t, values){
 const originals=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 t.after(()=>{for(const k of names){if(originals[k]===undefined)delete process.env[k];else process.env[k]=originals[k];}});
 for(const k of names)delete process.env[k];
 Object.assign(process.env,values);
}
const anonRequest={cookies:{get:()=>undefined},headers:{get:()=>null},url:'https://test.example/admin'};

test('explicit shared_link mode opens admin APIs without login, password, or cookies',async t=>{
 withEnv(t,{ADMIN_AUTH_MODE:'shared_link',SUPABASE_SERVICE_ROLE_KEY:'isolated-test-key',NEXT_PUBLIC_SUPABASE_URL:'http://localhost:54321',NODE_ENV:'production',VERCEL_ENV:'production'});
 assert.equal(adminAuthMode(),'shared_link');
 assert.equal(adminReady(),true);
 assert.equal(adminPasswordlessPreview(),false);
 assert.equal(validPassword('anything'),false);
 assert.deepEqual(await adminAccess(anonRequest),{mode:'shared_link',authenticated:true,signedIn:false});
 assert.equal(await hasAdminSession(anonRequest),true);
});

test('shared_link requires explicit server mode and backend connection, never implies a default public admin',async t=>{
 withEnv(t,{NODE_ENV:'production',VERCEL_ENV:'production'});
 assert.equal(adminAuthMode(),'member');
 assert.equal(adminReady(),false);
 assert.equal(await hasAdminSession(anonRequest),false);
 process.env.ADMIN_AUTH_MODE='shared_link';
 assert.equal(adminReady(),false);
 assert.equal(await hasAdminSession(anonRequest),false);
 process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-test-key';
 assert.equal(adminReady(),false);
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://localhost:54321';
 assert.equal(adminReady(),true);
 process.env.ADMIN_AUTH_MODE='wrong';
 assert.equal(adminReady(),false);
 assert.equal(await hasAdminSession(anonRequest),false);
});

test('shared-link writes still reject a foreign Origin (basic CSRF guard)',()=>{
 const url='https://baronado-adoption-site-8sm2.vercel.app/api/admin/dogs';
 assert.equal(sameOrigin({url,headers:{get:()=>null}}),false);
 assert.equal(sameOrigin({url,headers:{get:()=> 'https://external.invalid'}}),false);
 assert.equal(sameOrigin({url,headers:{get:()=> 'https://baronado-adoption-site-8sm2.vercel.app'}}),true);
});
