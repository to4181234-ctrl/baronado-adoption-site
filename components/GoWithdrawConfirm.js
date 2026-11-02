'use client';
import {useState} from 'react';
import Link from 'next/link';
import GoShell,{useGoSession} from './GoShell.js';
function ConfirmContent(){
 const {member,ready,openAccount,openWithdraw}=useGoSession();
 const [ack,setAck]=useState(false);
 return <section className="v3-withdraw-confirm-figma">
  <Link href="/go/settings" className="v3-back">‹ 뒤로</Link>
  <h1><span>멍멍GO!</span> 를 떠나시겠어요?</h1>
  <p className="v3-withdraw-scope">탈퇴 즉시 프로필·카드·게시물·친밀도,<br/>좋아요와 배틀 전적이 삭제돼요.</p>
  <p className="v3-withdraw-unrecoverable">다른 사람이 이미 저장한 이미지는<br/>회수할 수 없어요.</p>
  <p className="v3-withdraw-final">탈퇴 후에는 취소하거나 복구할 수 없어요.</p>
  <label className="v3-withdraw-ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> 삭제 안내를 확인했어요.</label>
  <Link href="/go" className="v3-withdraw-cancel">계속 멍기록하기</Link>
  <button type="button" className="v3-withdraw-confirm-action" disabled={!ready||!ack} onClick={()=>member?openWithdraw():openAccount()}>탈퇴하기</button>
 </section>
}
export default function GoWithdrawConfirm(){return <GoShell active="settings"><ConfirmContent/></GoShell>}
