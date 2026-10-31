export const ELEMENT_CYCLE=Object.freeze(['햇살','숲','물결','별빛','온기','꿈결']);
export function battleScore(a,b){
 const scoreOf=x=>Number(x.power)+Number(x.charm);
 const aElement=ELEMENT_CYCLE.indexOf(a.element),bElement=ELEMENT_CYCLE.indexOf(b.element);
 if(aElement<0||bElement<0)throw Error('지원되지 않는 카드 속성이에요.');
 for(const c of [a,b])if(!Number.isInteger(Number(c.power))||!Number.isInteger(Number(c.charm))||Number(c.power)<1||Number(c.power)>5||Number(c.charm)<1||Number(c.charm)>5)throw Error('카드 능력치를 확인해주세요.');
 const bonusA=ELEMENT_CYCLE[(aElement+1)%6]===b.element?2:0;
 const bonusB=ELEMENT_CYCLE[(bElement+1)%6]===a.element?2:0;
 const scoreA=scoreOf(a)+bonusA,scoreB=scoreOf(b)+bonusB;
 return {bonusA,bonusB,scoreA,scoreB,winner:scoreA===scoreB?'draw':scoreA>scoreB?'first':'second'};
}
