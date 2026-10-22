'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard';
import SiteHeader from '../../../components/SiteHeader';

const PERIODS = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: 'all', label: '전체 기간' }
];
const METRICS = [
  { key: 'visitors', label: '방문자 수', color: '#8c6143' },
  { key: 'views', label: '상세글 조회', color: '#c59e36' },
  { key: 'shares', label: '공유 버튼 클릭', color: '#6b8778' }
];
const number = value => Number(value || 0).toLocaleString('ko-KR');

function chartData(data, period, today) {
  if (period === 'all') {
    const items = Array.isArray(data.monthly) ? data.monthly : [];
    return items.length ? items.slice(-12) : [{ day: today.slice(0, 7), visitors: 0, views: 0, shares: 0 }];
  }
  const mapped = new Map((data.daily || []).map(item => [String(item.day), item]));
  const length = period === 'today' ? 1 : period === '7d' ? 7 : 30;
  const todayUtc = Date.parse(today + 'T00:00:00Z');
  return Array.from({ length }, (_, index) => {
    const date = new Date(todayUtc - (length - 1 - index) * 86400000).toISOString().slice(0, 10);
    return mapped.get(date) || { day: date, visitors: 0, views: 0, shares: 0 };
  });
}

function TrendChart({ data, period, today }) {
  const [metric, setMetric] = useState('visitors');
  const rows = useMemo(() => chartData(data, period, today), [data, period, today]);
  const current = METRICS.find(item => item.key === metric);
  const peak = Math.max(1, ...rows.map(item => Number(item[metric] || 0)));
  const chartWidth = 680;
  const chartHeight = 150;
  const step = chartWidth / rows.length;
  const barWidth = Math.min(32, Math.max(6, step - 8));
  const showEvery = rows.length > 20 ? 5 : rows.length > 12 ? 2 : 1;

  return <section className="stats-panel">
    <div className="stats-section-title">
      <h2>방문 흐름</h2>
      <span>{period === 'all' ? '최근 12개월까지 월별 표시' : '날짜별 표시'}</span>
    </div>
    <div className="stats-metric-options" role="group" aria-label="그래프에 표시할 통계">
      {METRICS.map(item => <button type="button" key={item.key}
        className={'stats-metric-option ' + (metric === item.key ? 'active' : '')}
        aria-pressed={metric === item.key} onClick={() => setMetric(item.key)}>
        <i style={{ background: item.color }} />{item.label}
      </button>)}
    </div>
    <div className="stats-chart">
      <svg viewBox="0 0 720 214" role="img"
        aria-label={current.label + ' 날짜별 막대그래프'}>
        {[0, 0.5, 1].map(frac => <line key={frac} x1="30" y1={170 - frac * chartHeight}
          x2="710" y2={170 - frac * chartHeight} stroke="#eee6da" strokeWidth="1" />)}
        <text x="25" y="22" textAnchor="end" fontSize="11" fill="#8b7e72">{number(peak)}</text>
        <text x="25" y="174" textAnchor="end" fontSize="11" fill="#8b7e72">0</text>
        {rows.map((item, index) => {
          const value = Number(item[metric] || 0);
          const height = value ? Math.max(3, value / peak * chartHeight) : 0;
          const x = 30 + index * step + (step - barWidth) / 2;
          const label = period === 'all' ? item.day.slice(5) + '월' : item.day.slice(5).replace('-', '.');
          return <g key={item.day}>
            <rect x={x} y={170 - height} width={barWidth} height={height}
              rx="3" fill={current.color}>
              <title>{item.day} · {current.label} {number(value)}</title>
            </rect>
            {(index % showEvery === 0 || index === rows.length - 1) &&
              <text x={x + barWidth / 2} y="191" textAnchor="middle"
                fontSize={rows.length > 20 ? '10' : '11'} fill="#806e5c">{label}</text>}
          </g>;
        })}
      </svg>
    </div>
    <p className="stats-small-note">그래프 위의 기간을 바꾸면 숫자와 강아지별 순위도 함께 변경됩니다.</p>
  </section>;
}

function DogRanking({ dogs }) {
  const [category, setCategory] = useState('all');
  const filtered = dogs.filter(dog =>
    category === 'all'
      || (category === 'adoption' ? dog.category === 'adoption' && !dog.adopted : dog.category === 'resident')
  );
  const peak = Math.max(1, ...filtered.map(dog => Number(dog.views || 0)));
  return <section className="stats-panel">
    <div className="stats-section-title"><h2>강아지별 관심도</h2><span>상세글 조회 순서</span></div>
    <div className="stats-metric-options" role="group" aria-label="강아지 종류">
      {[
        { value: 'all', label: '전체' },
        { value: 'adoption', label: '가족을 찾아요' },
        { value: 'resident', label: '상주견 소개' }
      ].map(option => <button type="button" key={option.value}
        className={'stats-metric-option ' + (category === option.value ? 'active' : '')}
        aria-pressed={category === option.value}
        onClick={() => setCategory(option.value)}>{option.label}</button>)}
    </div>
    <p className="stats-small-note">{category === 'adoption' ? '입양 전 강아지만 표시합니다. 입양 완료 강아지는 ‘전체’에서 확인할 수 있습니다.' : category === 'all' ? '입양 완료 강아지를 포함한 모든 강아지의 기록입니다.' : '상주견의 조회·공유 기록입니다.'}</p>
    <div className="stats-dog-table" role="table" aria-label="강아지별 조회수와 공유 버튼 클릭 수">
      <div className="stats-dog-row heading" role="row">
        <span role="columnheader">강아지</span><span role="columnheader">상세글 조회</span><span role="columnheader">공유 클릭</span>
      </div>
      {filtered.map(dog => <div className="stats-dog-row" role="row" key={dog.id}>
        <div className="stats-dog-name" role="cell">
          <Link href={'/dogs/' + dog.id}>{dog.name} <span aria-hidden="true">↗</span></Link>
          <div className="stats-rank-track" aria-hidden="true"><div style={{ width: (Number(dog.views || 0) / peak * 100) + '%' }} /></div>
        </div>
        <strong role="cell">{number(dog.views)}회</strong>
        <strong role="cell">{number(dog.shares)}회</strong>
      </div>)}
      {filtered.length === 0 && <p className="stats-empty">등록된 강아지가 없습니다.</p>}
    </div>
  </section>;
}

function AnalyticsContent() {
  const [period, setPeriod] = useState('7d');
  const [state, setState] = useState({ loading: true, error: '', payload: null });

  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: '' }));
    fetch('/api/admin/analytics?period=' + encodeURIComponent(period), {
      cache: 'no-store', credentials: 'same-origin', signal: controller.signal
    }).then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || '통계를 불러오지 못했습니다.');
      return payload;
    }).then(payload => setState({ loading: false, error: '', payload }))
      .catch(error => {
        if (error.name !== 'AbortError') setState({ loading: false, error: error.message, payload: null });
      });
    return () => controller.abort();
  }, [period]);

  const stats = state.payload?.data;
  const dogs = Array.isArray(stats?.dogs) ? stats.dogs : [];
  return <main className="site-shell">
    <SiteHeader />
    <section className="container stats-container">
      <div className="admin-tabs">
        <Link className="tab" href="/admin?category=adoption">가족을 찾아요</Link>
        <Link className="tab" href="/admin?category=resident">상주견 소개</Link>
        <Link className="tab active" href="/admin/analytics" aria-current="page">방문 통계</Link>
      </div>
      <Link href="/admin" className="back-link">게시글 관리로 돌아가기</Link>
      <div className="stats-page-heading">
        <div><h1>방문 통계</h1><p>바로나도 홈페이지 방문과 강아지별 관심도를 확인합니다.</p></div>
      </div>
      <div className="stats-periods" role="group" aria-label="통계 기간 선택">
        {PERIODS.map(item => <button type="button" key={item.value}
          className={'stats-period ' + (period === item.value ? 'active' : '')}
          aria-pressed={period === item.value} onClick={() => setPeriod(item.value)}>{item.label}</button>)}
      </div>
      {state.loading && <div className="stats-loading" role="status">방문 통계를 불러오는 중입니다.</div>}
      {state.error && <div className="message error" role="alert">{state.error}</div>}
      {!state.loading && stats && <div className="stats-content">
        <div className="stats-summary">
          {[
            { title: '방문자 수', value: stats.visitors, description: '중복 방문을 제외한 추정 인원' },
            { title: '강아지 상세글 조회', value: stats.detailViews, description: '상세 페이지를 연 횟수' },
            { title: '공유 버튼 클릭', value: stats.shares, description: '실제 공유 완료와는 다릅니다' }
          ].map(item => <div className="stats-summary-card" key={item.title}>
            <p>{item.title}</p><strong>{number(item.value)}<small>{item.title === '방문자 수' ? '명' : '회'}</small></strong>
            <span>{item.description}</span>
          </div>)}
        </div>
        <TrendChart data={stats} period={period} today={state.payload.today} />
        <DogRanking dogs={dogs} />
        <section className="stats-help" aria-label="통계 숫자 안내">
          <h2>통계 숫자 안내</h2>
          <p><strong>공유 버튼 클릭 수</strong>는 공유 버튼을 누른 횟수입니다. 카카오톡 등으로 <strong>실제로 공유를 완료한 횟수가 아닙니다.</strong> 메인 화면에서 누른 공유 버튼도 전체 클릭 수에 포함되지만, 강아지별 통계에는 해당 강아지 소개글에서 누른 횟수만 표시됩니다.</p>
          <p><strong>방문자 수</strong>는 같은 브라우저의 중복 방문을 제외해 계산한 추정치입니다. 다른 기기나 브라우저로 접속하면 별도로 집계될 수 있습니다.</p>
          <p><strong>조회수</strong>는 같은 방문자가 같은 페이지를 1분 안에 반복해서 열면 중복 집계하지 않습니다.</p>
          <p>통계 설치 이후 기록만 표시하며, 관리자 페이지를 이용한 기록은 집계하지 않습니다. 방문자의 이름, 전화번호, IP 주소는 통계에 저장하지 않습니다.</p>
        </section>
      </div>}
    </section>
  </main>;
}

export default function AnalyticsPage() {
  return <AdminGuard><AnalyticsContent /></AdminGuard>;
}
