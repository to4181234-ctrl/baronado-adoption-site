// All rewards are authoritative server-side; this module controls visibility only.
export const DAILY_QUESTS=Object.freeze({
 care:Object.freeze({coins:10,title:'강아지 돌보기'}),
 visit:Object.freeze({coins:30,title:'바로나도 방문 인증'}),
 battle:Object.freeze({coins:10,title:'첫 멍배틀 완료'})
});
export function isQuestAvailable(name,{draw=false,battle=false}={}){
 if(!Object.hasOwn(DAILY_QUESTS,name))return false;
 if(name==='battle')return Boolean(battle);
 return true;
}
export function visibleQuestRewards(flags={}){
 return Object.entries(DAILY_QUESTS).reduce((sum,[name,q])=>
   sum+(isQuestAvailable(name,flags)?q.coins:0),0);
}
export function summarizeCareRewards(transactionEvents=[],level=0){
 const count=transactionEvents.filter(e=>e==='care').length+Number(transactionEvents.includes('quest_care'));
 return {
   careRewardsToday:Math.min(1,count),
   remainingCareRewards:Math.max(0,1-count),
   firstCareQuestDone:transactionEvents.includes('quest_care'),
   maxRewardPerDay:10,
   firstQuestCoins:10,
   affinityAtCap:Number(level)>=10
 };
}

// Preserve the pre-release interaction API while requiring the rewarded DB RPC
// whenever stage 3 coins are enabled on the server.
export function interactionProcedure(coinsEnabled=false){
 return coinsEnabled?'go_do_rewarded_interaction':'go_do_interaction';
}
