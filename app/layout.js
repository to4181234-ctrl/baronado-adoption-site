import './globals.css';
import './v3.css';
import './v3-camera.css';
import './figma-accuracy.css';
import './figma-accuracy-details.css';
import './figma-annotations-patch.css';

export const metadata = {
  metadataBase: new URL('https://baronado-adoption-site-8sm2.vercel.app'),
  title: '바로나도',
  description: '바로나도 애견카페 임시보호 강아지 입양 안내 사이트'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/subsets/GmarketSans-dynamic-subset.css"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/MonadABXY/mona-font/web/monas.css"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri/dist/galmuri.css"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
