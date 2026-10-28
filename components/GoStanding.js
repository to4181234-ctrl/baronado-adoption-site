'use client';
export default function GoStanding({standing,dogName}){
 if(!standing)return null;
 if(!standing.collected)return <section className="go-standing"><strong>첫 도감을 기다리고 있어요</strong></section>;
 return <section className="go-standing" aria-label={`${dogName} 도감 수집 현황`}><strong>{standing.percentile!=null?`${dogName} 도감 상위 ${standing.percentile}%`:'수집 순위 집계 중'}</strong><p>공개 카드 {standing.collected}장 · {standing.rank}위 / {standing.participants}명</p><small>이 멍멍이의 승인된 카드 수 기준 · 동점 공동 순위{standing.participants<10?' · 10명부터 % 표시':''}</small></section>;
}
