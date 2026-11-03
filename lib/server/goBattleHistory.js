import {summarizeBattles} from '../goBattleHistory.js';
export async function loadBattleHistory(db,memberId){
 const rows=[];
 // Read every page; the Data API's default row limit must not truncate totals.
 for(let start=0;;start+=500){
  const page=await db.from('go_battles').select('id,first_dog_id,second_dog_id,winner').eq('member_id',memberId).order('created_at').order('id').range(start,start+499);
  if(page.error)throw page.error;
  rows.push(...page.data);if(page.data.length<500)break;
 }
 return summarizeBattles(rows);
}
