// Synthetic, local-only UI checks. Never connects to a real account or database.
const {spawn}=require('node:child_process'),fs=require('node:fs'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BARONADO_PLAYWRIGHT_MODULE||'playwright');
const binary=process.env.BARONADO_CHROMIUM_MODULE?require(process.env.BARONADO_CHROMIUM_MODULE).default:null;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const names=['깡지','버디','뽀실','구름','오레오'];
const dogs=names.map((name,i)=>({id:id(i+1),name,category:'adoption',gender:'여자',age:'2살 추정',description:'로컬 검증용 가상 강아지입니다.',images:[],adopted:false,created_at:'2026-10-30T00:00:00Z',profile:{}}));
// Neutral SVG fixture; never used as a camera background or production asset.
const photo='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#e9e0d3"/><text x="150" y="400" font-size="60">LOCAL TEST</text></svg>');
const member={id:id(90),nickname:'검증계정',avatarDog:'깡지',profileBio:'로컬 UI 검증용 가상 계정'};
const cards=Array.from({length:8},(_,i)=>({id:id(100+i),dogId:dogs[i%5].id,dogName:names[i%5],ownerId:member.id,nickname:member.nickname,title:'가상 카드 '+i,status:'approved',imageUrl:photo,capturedAt:'2026-10-30T00:00:00Z',createdAt:'2026-10-30T00:00:00Z',likeCount:1,shareCount:0,battle:{power:3,charm:4,element:'숲'},ratings:{cuteness:3,charm:4,affection:4}}));
(async()=>{
 const testPhoto=await require('sharp')(Buffer.from(decodeURIComponent(photo.split(',')[1]))).png().toBuffer();cards.forEach(card=>card.imageUrl='data:image/png;base64,'+testPhoto.toString('base64'));
 const mock=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let data=dogs;if(u.searchParams.get('id')?.startsWith('eq.'))data=dogs.filter(d=>d.id===u.searchParams.get('id').slice(3));if(u.searchParams.get('category')?.startsWith('eq.'))data=data.filter(d=>d.category===u.searchParams.get('category').slice(3));if(req.headers.accept?.includes('vnd.pgrst.object'))data=data[0]||null;res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*','content-range':'0-4/5'});res.end(JSON.stringify(data));});await new Promise(r=>mock.listen(3002,'127.0.0.1',r));
 const log=fs.openSync('handoff/stage10d/fixture-server.log','w');
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3001'],{stdio:['ignore',log,log],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3002',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-test-only'}});
 let browser;const results=[],mutations=[];
 try{
  for(let i=0;i<80;i++){try{await fetch('http://127.0.0.1:3001/go');break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:binary?await binary.executablePath():undefined,args:[...(binary?.args||[]),'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const ctx=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']});
  cards[0].reportCount=1;let logged=true,battlePostCount=0,reportRequests=0,titleRequests=0,shortage=false;
  let banners=[{id:id(801),title:'기본 바로나도 배너',image_alt:'바로나도 로고와 강아지 캐릭터',image_url:'/figma-v3/hero-logo.svg',target_type:'none',enabled:true,sort_order:0}];
  await ctx.route('https://**/*',r=>r.abort());
  await ctx.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}}));
  await ctx.route('**/api/**',async route=>{
   const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();let data={ok:true};
   if(method!=='GET')mutations.push({path,method});
   if(path.endsWith('/image-source')){return route.fulfill({status:200,contentType:'image/png',body:testPhoto});}
   if(path.endsWith('/report')&&method==='POST'){reportRequests++;return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});}
   if(path==='/api/go/session')data={member:logged?member:null};
   else if(path==='/api/go/collection')data={counts:Object.fromEntries(dogs.map(d=>[d.id,2])),covers:{},progress:{complete:true,total:5,collected:5},standing:{rank:1,participants:5}};
   else if(path==='/api/go/settings')data={popupEnabled:false};
   else if(path==='/api/go/profile')data={...member};
   else if(path==='/api/go/interaction')data={owned:true,level:5,remaining:1,actions:Object.fromEntries(['snack','praise','play'].map(a=>[a,{remaining:2,nextAt:null}]))};
   else if(path==='/api/go/cards'&&method==='POST')data={id:cards[0].id,capturedAt:cards[0].capturedAt,status:'approved'};
   else if(path==='/api/go/cards'){
    const found=u.searchParams.get('q')==='없음'?[]:cards;const offset=Number(u.searchParams.get('page')||0)*4;data={cards:found.slice(offset,offset+4),total:found.length,hasMore:offset+4<found.length};
   }else if(/^\/api\/go\/cards\/[^/]+$/.test(path)){const card=cards.find(c=>path.endsWith(c.id))||cards[0];if(method==='PATCH'){const body=req.postDataJSON();assert.deepEqual(Object.keys(body),['title']);card.title=body.title;titleRequests++;}data={card};}
   else if(path.endsWith('/like'))data={liked:true,likeCount:2};
   else if(path.startsWith('/api/go/recorders/'))data={profile:{...member,dogs:5,publicCards:8,bio:member.profileBio},cards:cards.slice(0,4),total:8,hasMore:true};
   else if(path==='/api/go/battle'){
    if(method==='POST'){battlePostCount++;data={battle:{winner:'first',first_score:8,second_score:7,first_bonus:1,second_bonus:0}};}
    else data=shortage?{cards:[],total:0,hasMore:false,eligibleDogKinds:1}:{cards:cards.slice(0,4),total:8,hasMore:true,eligibleDogKinds:2};
   }else if(path==='/api/admin/session')data={configured:true,authenticated:true,setupProblems:[]};
   else if(path==='/api/admin/go/reports')data=method==='GET'?{reports:[{member_id:id(91),reason:'other',reason_detail:'가상 신고 상세 사유입니다',status:'pending',created_at:'2026-11-02T00:00:00Z'}]}:{ok:true};
   else if(path==='/api/admin/go/dogs')data={dogs:dogs.map(d=>({id:d.id,name:d.name}))};
   else if(path==='/api/admin/go/cards')data={cards:cards.slice(0,4),total:8,hasMore:true};
   else if(path==='/api/admin/go/picks')data={cards:[]};
   else if(path==='/api/admin/go/stats')data={totals:{posts:8,published:8,rejected:0,likes:8},dogs:[],topPosts:[]};
   else if(path==='/api/admin/banners/order'){
    const input=req.postDataJSON();banners=input.ids.map((id,i)=>({...banners.find(b=>b.id===id),sort_order:i,enabled:input.enabledIds.includes(id)}));data={ok:true};
   }else if(path==='/api/admin/banners'){
    if(method==='PATCH'){const input=req.postDataJSON();banners=banners.map(b=>b.id===input.id?{...b,...input}:b);data={banner:banners.find(b=>b.id===input.id)};}else data={banners};
   }else if(path==='/api/banners')data={banners:banners.filter(b=>b.enabled).map(b=>({id:b.id,alt:b.image_alt,image:b.image_url,isLogo:b.image_url==='/figma-v3/hero-logo.svg'}))};
   else if(path.includes('analytics'))data={totals:{},daily:[],pages:[],referrers:[]};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const p=await ctx.newPage();let pageErrors=[];p.on('pageerror',e=>pageErrors.push(e.message));
  async function capture(label,path){if(path)await p.goto('http://127.0.0.1:3001'+path,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.addStyleTag({content:'nextjs-portal{display:none!important}'});await p.screenshot({path:`handoff/stage10d/fixture-${label}.png`,fullPage:true});const info=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src'))}));results.push({label,path:p.url().replace('http://127.0.0.1:3001',''),errors:pageErrors.splice(0),...info});console.log(label,info.scrollWidth);}

  const metrics=[];
  for(const width of [320,390,1440]){
   await p.setViewportSize({width,height:1000});
   await capture('admin-list-'+width,'/admin/go');
   await p.locator('.v10-admin-card-row').first().click();await p.getByRole('heading',{name:'카드 게시물 상세',exact:true}).waitFor();await capture('admin-detail-'+width);
   await capture('banner-list-'+width,'/admin/banners');
   metrics.push({width,screen:'banner-list',geometry:await p.evaluate(()=>['h1','.v3-admin-banner-summary','.v10-banner-art'].map(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return {selector:s,x:r.x,y:r.y,width:r.width,height:r.height,font:getComputedStyle(el).fontFamily};}))});
   await p.getByRole('button',{name:'수정',exact:true}).click();await capture('banner-editor-'+width);
   await p.getByRole('button',{name:'모바일 미리보기',exact:true}).click();await p.getByRole('dialog',{name:'배너 모바일 미리보기'}).waitFor();await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog').count(),0);
   shortage=true;await capture('battle-shortage-'+width,'/go/battle');await p.getByRole('heading',{name:'새로운 멍멍이를 만나볼까요?',exact:true}).waitFor();
   metrics.push({width,screen:'shortage',geometry:await p.evaluate(()=>['h1','.meong-battle-shortage>img','.meong-battle-shortage>p','.meong-battle-primary','.meong-battle-secondary'].map(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return {selector:s,x:r.x,y:r.y,width:r.width,height:r.height};}))});
  }
  await p.setViewportSize({width:390,height:1000});await p.goto('http://127.0.0.1:3001/admin/banners',{waitUntil:'networkidle'});
  const before=mutations.length;await p.getByRole('button',{name:'노출 끄기',exact:true}).click();assert.equal(mutations.length,before);await p.getByRole('button',{name:'순서·노출 저장',exact:true}).click();await p.getByText('순서·노출을 저장했어요.',{exact:true}).waitFor();assert.equal(banners[0].enabled,false);
  await p.goto('http://127.0.0.1:3001/',{waitUntil:'networkidle'});assert.equal(await p.locator('.v3-hero').count(),0);results.push({label:'all-hidden-banners-collapse-after-atomic-save',passed:true});
  await p.goto('http://127.0.0.1:3001/admin/banners',{waitUntil:'networkidle'});await p.getByRole('button',{name:'수정',exact:true}).click();await p.getByRole('textbox',{name:'이미지 설명 *',exact:true}).fill('검증용 이미지 설명');await p.getByRole('button',{name:'배너 저장',exact:true}).click();await p.getByText('배너를 저장했어요.',{exact:true}).waitFor();assert.equal(banners[0].image_alt,'검증용 이미지 설명');results.push({label:'banner-image-description-persists',passed:true});
  banners.push({...banners[0],id:id(802),title:'검증 배너 2'}, {...banners[0],id:id(803),title:'검증 배너 3'});
  await p.reload({waitUntil:'networkidle'});assert.equal(await p.getByRole('button',{name:'+ 배너 등록',exact:true}).isDisabled(),true);
  await p.getByRole('button',{name:'아래로 이동',exact:true}).first().click();await p.getByRole('button',{name:'순서·노출 저장',exact:true}).click();await p.getByText('순서·노출을 저장했어요.',{exact:true}).waitFor();assert.equal(banners[0].id,id(802));results.push({label:'three-record-limit-and-saved-reorder',passed:true});
  for(const r of results.filter(x=>x.scrollWidth!==undefined)){assert.deepEqual(r.errors,[]);assert.deepEqual(r.brokenImages,[]);assert.equal(r.width,r.scrollWidth);}
  fs.writeFileSync('handoff/stage10d/ui-results.json',JSON.stringify({syntheticBackend:true,results,metrics},null,2));
  console.log(results.length+' additional UI checks passed');
 }finally{await browser?.close();server.kill();await new Promise(r=>mock.close(r));fs.closeSync(log);}
})().catch(e=>{console.error(e);process.exitCode=1});
