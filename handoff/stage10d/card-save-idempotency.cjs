// Real Next POST handler; isolated localhost REST/Storage fixtures only.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const {spawn}=require('node:child_process'),{createHmac,randomUUID,randomBytes}=require('node:crypto');
const sharp=require('sharp');
const member=randomUUID(),foreign=randomUUID(),dog=randomUUID(),secret='stage10-local-only-session-secret-0000';
const cards=new Map(),objects=new Map(),results=[];let uploads=0,removed=0,loseInsertResponse=false,failInsert=false;
const reply=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
const cookie=()=>{const p=`v2.${member}.${Math.floor(Date.now()/1000)+300}.abcdefghijklmnop.0`,k=createHmac('sha256',secret).update('baronado-go-session-v1').digest();return 'baronado_go='+p+'.'+createHmac('sha256',k).update(p).digest('base64url');};
(async()=>{
const backend=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');let bytes=[];for await(const part of req)bytes.push(part);const raw=Buffer.concat(bytes);
 if(u.pathname.startsWith('/storage/v1/object/go-cards/')){const key=u.pathname.slice('/storage/v1/object/go-cards/'.length);if(objects.has(key))return reply(res,409,{statusCode:'409',error:'Duplicate',message:'Already exists'});objects.set(key,raw);uploads++;return reply(res,200,{Key:key});}
 if(u.pathname==='/storage/v1/object/go-cards'&&req.method==='DELETE'){for(const key of JSON.parse(raw).prefixes||[]){objects.delete(key);removed++;}return reply(res,200,[]);}
 const body=raw.length?JSON.parse(raw):null;let rows=[];
 if(u.pathname.endsWith('/go_members'))rows=[{id:member,nickname:'검증계정',disabled:false,session_version:0}];
 else if(u.pathname.endsWith('/dogs'))rows=[{id:dog,category:'adoption',adopted:false}];
 else if(u.pathname.endsWith('/go_cards')){
  if(req.method==='POST'){
   if(failInsert)return reply(res,500,{code:'XX000',message:'fixture insert failed'});
   if(cards.has(body.id))return reply(res,409,{code:'23505',message:'duplicate'});
   await new Promise(r=>setTimeout(r,100));const row={...body,captured_at:new Date().toISOString()};cards.set(body.id,row);
   if(loseInsertResponse){loseInsertResponse=false;return reply(res,500,{code:'XX000',message:'fixture response lost after commit'});}rows=[row];
  }else{const row=cards.get((u.searchParams.get('id')||'').slice(3));rows=row?[row]:[];}
 }
 return reply(res,200,req.headers.accept?.includes('vnd.pgrst.object')?rows[0]||null:rows);
});await new Promise(r=>backend.listen(3014,'127.0.0.1',r));
const fd=fs.openSync('handoff/stage10d/card-save-server.log','w');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3013'],{stdio:['ignore',fd,fd],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3014',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-only',SUPABASE_SERVICE_ROLE_KEY:'local-only',ADMIN_SESSION_SECRET:secret}});
try{
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:3013/api/go/session');break;}catch{await new Promise(r=>setTimeout(r,200));}}
 const photo=await sharp(randomBytes(300*300*3),{raw:{width:300,height:300,channels:3}}).png().toBuffer();
 async function save(id,title='검증 사진'){const form=new FormData();form.set('requestId',id);form.set('dogId',dog);form.set('title',title);form.set('photo',new Blob([photo],{type:'image/png'}),'photo.png');const r=await fetch('http://127.0.0.1:3013/api/go/cards',{method:'POST',headers:{origin:'http://localhost:3013',cookie:cookie()},body:form});return {status:r.status,body:await r.json()};}
 let id=randomUUID(),r=await save(id);assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.body.id,id);const first={...cards.get(id)};
 r=await save(id,'새 제목');assert.equal(r.status,200);assert.deepEqual(cards.get(id),first);assert.equal(uploads,1);results.push('response retry retains one card, one image and original ratings/title');
 id=randomUUID();const pair=await Promise.all([save(id),save(id)]);assert(pair.some(r=>r.status===201));assert(pair.every(r=>[200,201,409].includes(r.status)));r=await save(id);assert.equal(r.status,200);assert.equal(cards.size,2);assert.equal(uploads,2);results.push('concurrent same-ID saves converge to one card without deleting another upload');
 id=randomUUID();loseInsertResponse=true;r=await save(id);assert.equal(r.status,200);assert(cards.has(id));assert(objects.has(member+'/'+id+'.webp'));assert.equal(removed,0);results.push('committed insert with lost response preserves image and replays success');
 id=randomUUID();failInsert=true;r=await save(id);assert.equal(r.status,500);assert(!cards.has(id));assert(!objects.has(member+'/'+id+'.webp'));assert.equal(removed,1);failInsert=false;results.push('confirmed insert failure cleans only its own image');
 id=randomUUID();cards.set(id,{id,member_id:foreign,dog_id:dog});const before=uploads;r=await save(id);assert.equal(r.status,409);assert.equal(uploads,before);results.push('another owner request ID is rejected without upload');
 r=await save('not-a-uuid');assert.equal(r.status,400);results.push('malformed request ID rejected');
 console.log(results.length+' card-save idempotency scenarios passed');
}finally{fs.writeFileSync('handoff/stage10d/card-save-results.json',JSON.stringify({syntheticBackend:true,results},null,2));server.kill();await new Promise(r=>backend.close(r));fs.closeSync(fd);}
})().catch(e=>{console.error(e);process.exitCode=1;});
