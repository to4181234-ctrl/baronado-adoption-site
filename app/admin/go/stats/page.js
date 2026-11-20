'use client';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
import GoAdminDashboard from '../../../../components/GoAdminDashboard.js';

/** Dedicated entry reusing original MeongGO statistics component and API. */
export default function MeonggoStatsPage(){
 return <AdminGuard><main className="site-shell v3-site v10-admin-cards">
  <SiteHeader/>
  <section className="v10-admin-content">
   <header className="v10-admin-heading"><h1>멍멍GO 통계</h1><p>멍카드·뽑기·멍코인·배틀·돌보기·커뮤니티 통계를 한곳에서 확인해요.</p></header>
   <GoAdminDashboard/>
  </section>
 </main></AdminGuard>;
}
