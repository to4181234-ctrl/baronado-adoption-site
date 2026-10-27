import test from 'node:test';
import assert from 'node:assert/strict';
import {packGoogle,unpackGoogle,newGoogleFlow,googleAuthorize} from '../lib/server/goGoogle.js';
process.env.ADMIN_SESSION_SECRET='test-only-google-state-secret-32-chars';
process.env.GOOGLE_CLIENT_ID='test-client';
test('OAuth state and join proof are scoped, signed, expire and resist tampering',()=>{
 const value=packGoogle({sub:'123'},'google-join');assert.equal(unpackGoogle(value,'google-join').sub,'123');assert.equal(unpackGoogle(value,'google-delete'),null);assert.equal(unpackGoogle(value+'x','google-join'),null);
 const original=Date.now;Date.now=()=>original()+601000;try{assert.equal(unpackGoogle(value,'google-join'),null);}finally{Date.now=original;}
});
test('Google flow requests identity only with independent random state and PKCE',()=>{
 const a=newGoogleFlow(null),b=newGoogleFlow(null);assert.notEqual(a.state,b.state);assert.notEqual(a.verifier,b.verifier);const url=new URL(googleAuthorize(a));assert.equal(url.searchParams.get('scope'),'openid email');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('state'),a.state);assert.equal(url.searchParams.has('client_secret'),false);
});
