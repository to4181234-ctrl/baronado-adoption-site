// A result contributes once to each dog's own perspective.
export function summarizeBattles(rows){
 const result={};
 for(const row of rows){
  if(!['first','second','draw'].includes(row.winner))continue;
  for(const side of ['first','second']){
   const dogId=row[side+'_dog_id'];if(!dogId)continue;
   const stats=result[dogId]||=( {wins:0,draws:0,losses:0,total:0} );
   stats.total++;stats[row.winner==='draw'?'draws':row.winner===side?'wins':'losses']++;
  }
 }
 return result;
}
