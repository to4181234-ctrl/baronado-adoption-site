'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoShell, { useGoSession } from './GoShell.js';
import GoCard from './GoCard.js';
function Post({ id }) {
  const { member, ready, openAccount } = useGoSession(); const router = useRouter(); const [card, setCard] = useState(null); const [error, setError] = useState('');
  useEffect(() => { if (!ready) return; fetch(`/api/go/cards/${id}`, { cache: 'no-store' }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setCard(data.card); }).catch(e => setError(e.message)); }, [id, member, ready]);
  return <><Link className="go-home" href="/go/community">← 게시판 목록</Link>{error ? <p className="go-error">{error}</p> : card ? <div className="go-post-detail"><h2>{card.title}</h2><GoCard key={`${card.id}-${member?.id || 'guest'}`} card={card} member={member} onLogin={openAccount} onDelete={() => router.push('/go/community')} /><Link className="go-dog-link" href={`/dogs/${card.dogId}`}>{card.dogName} 소개 보기 →</Link></div> : <p className="go-note">게시물을 불러오는 중이에요.</p>}</>;
}
export default function GoPost({ id }) { return <GoShell active="community" title="모두의 도감" description="바로나도 멍멍이와 함께한 순간을 나눠보세요."><Post id={id} /></GoShell>; }
