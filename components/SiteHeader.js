import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="top-bar">
      <div className="top-inner">
        <Link href="/" className="brand-link" aria-label="바로나도 홈">
          <img src="/baronado-logo.png" alt="바로나도" className="brand-logo" />
        </Link>
        <nav className="site-nav" aria-label="주요 메뉴">
          <Link href="/">가족을 찾아요</Link>
          <Link href="/residents">상주견 소개</Link>
        </nav>
      </div>
    </header>
  );
}
