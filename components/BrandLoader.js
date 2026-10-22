'use client';

export default function BrandLoader() {
  return (
    <div className="brand-loading" role="status" aria-live="polite" aria-label="강아지 소개를 불러오는 중">
      <div className="brand-loading-inner">
        <div className="brand-loading-stage" aria-hidden="true">
          <span className="brand-loading-sun" />
          <img src="/baronado-character.png" alt="" className="brand-loading-character" />
          <span className="brand-loading-shadow" />
        </div>
        <p>친구들을 만나러 가는 중이에요</p>
        <span className="brand-loading-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  );
}
