import './globals.css';
import './v3.css';
import './v3-camera.css';
import './figma-accuracy.css';
import './figma-accuracy-details.css';

export const metadata = {
  metadataBase: new URL('https://baronado-adoption-site-8sm2.vercel.app'),
  title: '바로나도',
  description: '바로나도 애견카페 임시보호 강아지 입양 안내 사이트'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
