import Link from 'next/link';
export default function GoSettingsTabs({guide=false}){return <nav className="s1-settings-tabs" aria-label="설정과 게임 안내"><Link href="/go/settings" aria-current={!guide?'page':undefined}>설정</Link><Link href="/go/guide" aria-current={guide?'page':undefined}>게임안내</Link></nav>}
