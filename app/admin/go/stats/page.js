'use client';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
import GoAdminStats from '../../../../components/GoAdminStats.js';

/** Dedicated entry reusing original MeongGO statistics component and API. */
export default function MeonggoStatsPage(){
 return <AdminGuard><main className="site-shell v3-site v10-admin-cards">
  <SiteHeader/>
  <section className="v10-admin-content">
   <header className="v10-admin-heading"><h1>멍멍GO 통계</h1><p>멍카드 게시물, 좋아요와 강아지별 현황을 확인해요.</p></header>
   <GoAdminStats/>
  </section>
 </main></AdminGuard>;
}
