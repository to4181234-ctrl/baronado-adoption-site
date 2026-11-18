// All rewards are authoritative server-side; this module controls visibility only.
export const DAILY_QUESTS=Object.freeze({
 care:Object.freeze({coins:10,title:'강아지 돌보기'}),
 visit:Object.freeze({coins:30,title:'바로나도 방문 인증'}),
 draw:Object.freeze({coins:10,title:'무료 멍카드 뽑기'}),
 battle:Object.freeze({coins:10,title:'친구 멍배틀 참여'})
});
export function isQuestAvailable(name,{draw=false,battle=false}={}){
 if(!Object.hasOwn(DAILY_QUESTS,name))return false;
 if(name==='draw')return Boolean(draw);
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
   careRewardsToday:Math.min(5,count),
   remainingCareRewards:Math.max(0,5-count),
   firstCareQuestDone:transactionEvents.includes('quest_care'),
   maxRewardPerDay:50,
   firstQuestCoins:10,
   affinityAtCap:Number(level)>=10
 };
}

// Preserve the pre-release interaction API while requiring the rewarded DB RPC
// whenever stage 3 coins are enabled on the server.
export function interactionProcedure(coinsEnabled=false){
 return coinsEnabled?'go_do_rewarded_interaction':'go_do_interaction';
}
