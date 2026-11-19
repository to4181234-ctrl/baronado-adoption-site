import './figma-local-fonts.css';
import './globals.css';
import './v3.css';
import './v3-camera.css';
import './figma-accuracy.css';
import './figma-accuracy-details.css';
import './figma-annotations-patch.css';
import './figma-album-fidelity.css';
import './figma-public-fidelity.css';
import './figma-meonggo-account.css';
import './figma-stage5-album.css';
import './figma-stage6-public.css';
import './figma-stage7-discovery-camera.css';
import './figma-stage8-battle.css';
import './figma-stage9-admin.css';
import GoAudioFeedback from '../components/GoAudioFeedback.js';

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
      </head>
      <body><GoAudioFeedback/>{children}</body>
    </html>
  );
}

import './figma-stage10-final.css';

import './figma-user-revisions.css';

import './figma-stage1-navigation.css';

import './figma-stage2-official.css';
import './figma-stage4-store.css';
import './figma-stage4-admin.css';
import './figma-stage5-battle.css';
import './figma-prelaunch-quests.css';
import './meonggo-stage1.css';
import './figma-stage11-public-profile.css';
import './meonggo2-pending-revisions.css';
