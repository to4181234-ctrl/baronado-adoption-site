'use client';
import GoGoogleAccount from './GoGoogleAccount.js';
import Link from 'next/link';

export default function GoAccount({member,onChange}) {
 return <div className="go-account-box"><h2>{member?'멍멍GO! 계정':'멍멍GO! 회원가입/로그인'}</h2>{member&&<p><b>{member.nickname} 멍기록가</b><br/><Link className="go-recorder-profile-link" href={`/go/recorders/${member.id}`}>내 멍기록가 프로필 보기 →</Link></p>}<GoGoogleAccount member={member} onChange={onChange}/></div>;
}
