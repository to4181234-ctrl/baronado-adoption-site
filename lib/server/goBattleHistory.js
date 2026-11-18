// One canonical cumulative source for home, battle landing and public profiles.
export async function loadBattleHistory(db,memberId){
 const {data,error}=await db.rpc('go_dog_battle_totals',{p_member:memberId});
 if(error)throw error;
 return Object.fromEntries((data||[]).map(row=>[row.dog_id,{wins:Number(row.wins),draws:Number(row.draws),losses:Number(row.losses),total:Number(row.wins)+Number(row.draws)+Number(row.losses)}]));
}
