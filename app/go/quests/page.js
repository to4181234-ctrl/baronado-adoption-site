import Link from 'next/link';
import GoShell from '../../../components/GoShell.js';
import GoQuests from '../../../components/GoQuests.js';

export const metadata = { title: '오늘의 퀘스트 | 멍멍GO!' };
export default function Page() {
  return <GoShell active="quests"><div className="go-quest-page">
    <Link href="/go" className="v3-back">‹ 내 도감으로</Link>
    <GoQuests />
  </div></GoShell>;
}
