// Confirmed by the site owner on 2026-11-02. Source: Figma 03 멍멍GO!,
// nodes 206:125925 / 206:125952 / 206:125979 / 206:126006 / 206:126033.
// Dialogue only: proposed sound and pose/motion rules are not activated here.
export const GO_CONFIRMED_DIALOGUE = Object.freeze({
  '버디': { bark:'왈왈!', discovery:'가만히 있기엔 심심해! 나랑 놀자!', tiers:[
    {greeting:'왔어? 오늘은 뭐 하고 놀까?',snack:'간식 먹고 바로 한 판 더!',praise:'나 잘했지? 한 번 더 보여줄까?',play:'준비됐지? 내가 먼저 간다!'},
    {greeting:'너 오기만 기다렸어. 오늘도 놀자!',snack:'내가 좋아하는 간식인 거 어떻게 알았어?',praise:'네가 칭찬하면 더 신나!',play:'아직 안 지쳤지? 한 번만 더!'},
    {greeting:'내 놀이 짝꿍 왔다! 같이 가자!',snack:'너랑 먹고 놀면 하루가 금방 가!',praise:'네 앞에서는 더 멋지게 하고 싶어!',play:'오늘도 너랑 노는 시간이 제일 좋아!'}
  ]},
  '깡지': { bark:'멍~', discovery:'나 지금 뒹굴뒹굴 중인데 옆에 앉을래?', tiers:[
    {greeting:'안녕? 나랑 같이 느긋하게 놀자',snack:'누워서 먹으면 더 맛있는데…',praise:'응… 조금 더 칭찬해 줘.',play:'좋아. 천천히 굴려 주면 잡아볼게.'},
    {greeting:'왔네? 내 옆자리에 앉을래?.',snack:'간식 냄새에 눈이 번쩍 떴어.',praise:'네가 그러니까 기분은 좋네 ㅎㅎ',play:'너랑은 조금 움직여 볼까?'},
    {greeting:'오늘도 내 옆에서 같이 뒹굴거리자.',snack:'네가 챙겨주는 간식이 제일 좋아.',praise:'네 손길이면 눈이 저절로 감겨…',play:'한 판 놀고 나면 같이 쉬어야 해.'}
  ]},
  '오레오': { bark:'멍…?', discovery:'조금 무섭지만… 그거 뭐야? 가까이 봐도 돼?',tiers:[
    {greeting:'거기서 잠깐만… 근데 너 누구야?',snack:'킁킁… 처음 보는 간식인데 먹어볼까?',praise:'나 칭찬하는 거 맞아…?',play:'살짝만 굴려 줄래? 먼저 보고 싶어.'},
    {greeting:'너구나! 오늘은 뭘 가져왔어?',snack:'네가 주는 거면 한 입 먹어볼게.',praise:'칭찬받으니까 조금 용기가 나!',play:'이번엔 내가 조금 더 가까이 가볼게.'},
    {greeting:'아직 놀랄 때도 있지만 네 옆은 괜찮아.',snack:'새로운 간식도 너랑 같이 먹어볼래!',praise:'봐, 나 전보다 용감해졌지?',play:'궁금한 게 생기면 너부터 찾아올게.'}
  ]},
  '구름': { bark:'멍…!', discovery:'천천히 와 줄래? 살살 쓰다듬어 주면 좋아.',tiers:[
    {greeting:'살짝만 다가와 줘. 네 손 냄새 맡아볼게.',snack:'조심조심… 손에서 먹어도 괜찮아?',praise:'칭찬해 주면서 살살 만져줄래?',play:'큰 소리는 놀라. 가까이서 살살 놀자.'},
    {greeting:'너구나! 오늘도 쓰다듬어 줄 거지?',snack:'간식도 좋지만 네 손길도 좋아.',praise:'조금만 더 쓰다듬어 줘!',play:'너랑이라면 조금 더 가까이 가볼래.'},
    {greeting:'네가 와서 안심돼. 옆에 꼭 붙어 있을래.',snack:'먹고 나면 네 옆에서 쉬어도 돼?',praise:'계속 네 손 아래 있고 싶어.',play:'한 판 놀고 나면 꼭 쓰다듬어 줘!'}
  ]},
  '뽀실': { bark:'멍멍!', discovery:'다리는 조금 불편해도 놀 준비는 됐어!',tiers:[
    {greeting:'안녕! 자는게 아니라 생각중이었어~',snack:'그거 내가 제일 좋아하는 간식인데!',praise:'나 정말 귀여워?',play:'다리는 불편해도 노는건 엄청 좋아해!'},
    {greeting:'왔구나! 오늘도 같이 놀자.',snack:'이거 먹고 너랑 한 판 더 놀래!',praise:'칭찬받으니까 꼬리가 먼저 신났어!',play:'공을 가까이 굴려줘. 내가 받아볼게!'},
    {greeting:'네가 오면 마음부터 달려가고 싶어!',snack:'간식 먹고 쉬었다가 또 같이 놀자!',praise:'천천히 기다려주는 네가 정말 좋아.',play:'우리 같이 오래오래 같이 놀자!'}
  ]}
});

export function goDialogueTier(level) {
  const value=Number(level);
  if (!Number.isFinite(value) || value<4) return 0;
  return value<8?1:2;
}
export function getGoDialogue(name,level,action='greeting') {
  const dog=GO_CONFIRMED_DIALOGUE[String(name||'').trim()];
  if (!dog) return null;
  const line=action==='discovery'?dog.discovery:dog.tiers[goDialogueTier(level)][action];
  return line?`${dog.bark}\n(${line})`:null;
}
