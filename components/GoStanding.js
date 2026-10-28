'use client';
export default function GoStanding({standing,nickname,compact=false}){
 if(!standing)return null;
 return <section className={`go-standing${compact?' compact':''}`} aria-label="멍기록가 수집 현황"><span>{nickname?`${nickname} 멍기록가`:'멍기록가 수집 현황'}</span><strong>{standing.percentile!=null?`수집 상위 ${standing.percentile}%`:standing.collected?'수집 순위 집계 중':'첫 도감을 기다리고 있어요'}</strong><p>{standing.collected}개 도감 · {standing.participants}명의 멍기록가{standing.rank?` · ${standing.rank}위 (동점 공동 순위)`:''}</p><small>공개 승인된 서로 다른 멍멍이 도감 기준 · 입양 완료 포함{standing.participants<10?' · 참여자 10명부터 퍼센트 표시':''}</small></section>;
}
