// Stage-three PvP is a new contract; do not reuse legacy elemental battleScore.
export const FRIEND_PVP_JOIN_MS=30*60*1000;
export const FRIEND_PVP_READY_MS=2*60*1000;
export const FRIEND_PVP_RECONNECT_MS=30*1000;
export const FRIEND_PVP_POLL_MS=2500;
export const FRIEND_PVP_ANIMATION_MS=4280;
export const FRIEND_PVP_DAILY_REWARD=10;
export function friendPvpResult(a,b){
 const valid=v=>Number.isInteger(Number(v?.power))&&Number.isInteger(Number(v?.charm))&&
  Number(v.power)>=1&&Number(v.power)<=5&&Number(v.charm)>=1&&Number(v.charm)<=5;
 if(!valid(a)||!valid(b))throw Error('파워·매력은 각각 1~5 사이여야 해요.');
 const hostScore=Number(a.power)+Number(a.charm);
 const guestScore=Number(b.power)+Number(b.charm);
 return {hostScore,guestScore,winner:hostScore===guestScore?'draw':hostScore>guestScore?'host':'guest'};
}
export function friendPvpOutcome(winner,role){
 if(winner==='draw')return 'draw';
 if(!['host','guest'].includes(winner)||!['host','guest'].includes(role))return null;
 return winner===role?'win':'loss';
}
export function canEnterFriendRoom(room,memberId,now=Date.now()){
 return Boolean(room&&room.status==='waiting'&&!room.guestId&&
   room.hostId!==memberId&&Date.parse(room.inviteExpiresAt)>now);
}
export function roomSecondsRemaining(value,now=Date.now()){
 return value?Math.max(0,Math.ceil((Date.parse(value)-now)/1000)):0;
}
export function formatPvpScore(stats){
 return String(stats?.wins||0)+'승 '+String(stats?.draws||0)+'무 '+String(stats?.losses||0)+'패';
}
