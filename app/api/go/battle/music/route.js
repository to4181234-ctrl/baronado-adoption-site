export const runtime='nodejs';
export const dynamic='force-dynamic';
const URL='https://opengameart.org/sites/default/files/8bit_action_boss_battle_bpm145.mp3';
// MintoDog, CC0: https://opengameart.org/content/8bit-action-boss-battle
export async function GET(){
 try{
  const remote=await fetch(URL,{headers:{'User-Agent':'Mozilla/5.0 (MeongGO; CC0 audio)',Accept:'audio/mpeg'} ,signal:AbortSignal.timeout(20000)});
  if(!remote.ok||!remote.body)throw Error('Music unavailable');
  return new Response(remote.body,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=604800, s-maxage=604800','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('음원을 가져오지 못했습니다.',{status:502,headers:{'Cache-Control':'no-store'}});}
}
