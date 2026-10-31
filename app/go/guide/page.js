import Link from 'next/link';
import GoShell from '../../../components/GoShell.js';
import {ELEMENTS} from '../../../lib/goV3Game.js';
export const metadata={title:'게임 안내 | 멍멍GO!'};
export default function Page(){
 const steps=[['01 만나기','현장에서 강아지의 이야기를 살펴봐요.'],['02 기록하기','직접 촬영한 사진으로 카드를 만들어요.'],['03 교감하기','간식·칭찬·놀이로 친밀도를 쌓아요.'],['04 멍배틀','다른 강아지 카드 2장으로 대결해요.']];
 return <GoShell active="guide"><article className="v3-guide"><Link href="/go" className="v3-back">‹ 뒤로</Link><h1>게임 안내</h1>
 <div className="v3-guide-steps">{steps.map(([heading,body])=><section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</div>
 <h2 className="v3-guide-heading">05 속성과 상성</h2>
 <div className="v3-elements">{ELEMENTS.map((name,i)=><div key={name}><span style={{background:['#ffd045','#b9db71','#8dd4cc','#8fb2f4','#f79d95','#dd9be8'][i]}}>✦</span><b>{name}</b></div>)}</div>
 <p className="v3-guide-text">햇살 → 숲 → 물결 → 별빛 → 온기 → 꿈결 → 햇살<br/>화살표 앞 속성이 바로 다음 속성에 유리해요.<br/>기본 점수 = 파워 + 애교 · 상성 우위 +2점<br/>점수가 같으면 무승부, 두 카드는 그대로 유지해요.</p>
 <h2 className="v3-guide-heading">06 능력치와 교감</h2>
 <p className="v3-guide-text">카드의 파워·애교는 각각 1~5점으로 발급돼요.<br/>발급 확률은 1점 10% · 2점 20% · 3점 40% · 4점 20% · 5점 10%예요.<br/>교감 버튼은 각각 하루 2회, 사용 후 30분을 기다려요.<br/>친밀도는 하루 최대 +3, 총 10까지 올라가며 카드 능력치는 바뀌지 않아요.</p>
 <Link href="/go/battle" className="v3-yellow-btn v3-guide-cta">멍배틀 하러가기</Link></article></GoShell>;
}
