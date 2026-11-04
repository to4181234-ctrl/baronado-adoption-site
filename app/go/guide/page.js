import Link from 'next/link';
import GoShell from '../../../components/GoShell.js';
import {ELEMENTS} from '../../../lib/goV3Game.js';

export const metadata={title:'게임 안내 | 멍멍GO!'};

// Original Figma 173:9115 pixel effects. Every SVG matches the Figma export bytes.
const elementIcons=['sun','forest','wave','starlight','warmth','dream'];
const steps=[
 ['01 만나기','힌트에서 강아지의 이야기를 살펴봐요.'],
 ['02 기록하기','직접 촬영하면 새로운 카드를 얻어요.'],
 ['03 교감하기','간식·칭찬·놀이로 친밀도를 쌓아요.'],
 ['04 멍배틀','내 카드를 고르고 다른 멍기록가에게 도전해요.']
];
export default function Page(){
 return <GoShell active="guide"><article className="v3-guide v3-guide-figma">
  <Link href="/go" className="v3-back">‹ 뒤로</Link>
  <h1>게임 안내</h1>
  <div className="v3-guide-steps">{steps.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div>
  <h2 className="v3-guide-elements-title">05 속성과 상성</h2>
  <div className="v3-guide-element-grid">{ELEMENTS.map((name,i)=><div key={name} className="v3-guide-element">
   <img src={'/figma-guide/'+elementIcons[i]+'.svg'} alt="" width="64" height="64"/>
   <span>{name}</span>
  </div>)}</div>
  <p className="v3-guide-cycle">햇살 → 숲 → 물결 → 별빛 → 온기 → 꿈결 → 햇살</p>
  <p className="v3-guide-rules">화살표 앞 속성이 바로 다음 속성에 유리해요.<br/>기본 점수 = 파워 + 애교 · 상성 우위 +2점<br/>그 외 조합은 보너스 없이 기본 점수로 대결해요.<br/>최종 점수가 같으면 무승부, 두 카드 모두 유지해요.</p>
  <p className="v3-guide-footnote">강아지의 우열이 아닌 게임 카드의 대결이에요.<br/>속성은 강아지별 고정 · 능력치는 카드 발급 시 결정돼요.</p>
  <h2 className="v3-guide-affinity-title">06 능력치와 교감</h2>
  <p className="v3-guide-affinity-text">파워·애교는 각각 1~5로 무작위 발급돼요.<br/>확률: 1점 10% · 2점 20% · 3점 40% · 4점 20% · 5점 10%<br/>교감은 버튼별 하루 2회, 사용 후 30분 기다려요.<br/>친밀도는 하루 최대 +3, 총 10이며 카드 능력치는 바뀌지 않아요.</p>
 </article></GoShell>;
}
