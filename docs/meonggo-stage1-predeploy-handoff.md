# 멍멍GO 2.0 — 1차 배포 보류 및 검증 인수인계
기록일: 2026-11-14 KST
상태: **운영 배포 금지 · 사용자 승인 대기**

## 필수 운영 원칙
- 이 브랜치 `feat/meonggo-stage1-coins-20261114`에서만 개발한다.
- `main` 병합, Production 배포·승격, 운영 Supabase DB 변경은 **사용자에게 결과 보고 후 명시적 승인**을 받기 전까지 금지한다.
- Vercel 자동 Preview는 사용자의 Production 도메인에 영향이 없으며, 신규 기능이 기본 비활성 상태다.
- 기존 멍멍GO 사용자 카드/소유 관계, 이미지, 친밀도, 입양 데이터 및 운영 기록은 보존한다.
- 관련 기획 1~180 결정사항은 기존 구글 시트의 확정 기획·인수인계 탭을 따른다.

## 1차 기능
- 계정별 멍코인 잔액과 거래 원장, 획득/사용 필터, 최근 30일/10건씩 내역 조회.
- 교감 성공 시 +10C, 한국시간 하루 5회 계정 단위 제한(최대 50C).
- 첫 교감 일일 퀘스트 +10C, 직원이 음료 구매 확인 후 승인하는 방문 퀘스트 +30C.
- 1차 화면에 2개 퀘스트만 표시, 전체 보상 40C 및 기본 교감 50C 별도.
- 방문 요청 09:00 ~ 20:59:59 KST, 30분 유효 코드, 취소/반려 후 1분 재시도.
- 관리자 방문 인증 대기·코드 검색·90일 이력·승인/반려·오승인 회수·감사 기록.
- 상단 코인 잔액을 누르면 최근 30일 내역 바텀시트(필터, 확장, 페이지 추가 로드).
- 보상 안내 알림 1.5초 큐, 페이지 간 이동 시 이어짐, 다른 화면에서 승인되면 잔액 자동 확인.

## 신규 파일 및 변경 위치
- `lib/goCoins.js`, `lib/goVisit.js`, `lib/goCoinNotices.js`
- `components/GoCoins.js`, `components/GoQuests.js`, `components/GoVisitPanel.js`
- `app/go/quests/page.js`, `app/go/visit/page.js`
- `app/api/go/coins/route.js`, `app/api/go/visit/route.js`, `app/api/admin/go/visit/route.js`
- `app/admin/go/visit/page.js`
- 기존 `components/GoShell.js`, `components/SiteHeader.js`, `components/GoPage.js`, `components/GoInteract.js`, `app/admin/page.js`의 최소 연결 수정
- `app/meonggo-stage1.css`로 신규 CSS만 범위 제한 적용
- `supabase/proposals/meonggo_stage1_coins_REVIEW_NOT_APPLIED.sql`
- `supabase/proposals/meonggo_stage1_visit_REVIEW_NOT_APPLIED.sql`

## 실제 DB 반영 전 확인
1. 최신 Figma 신규 2.0 화면의 위치 및 문구 확인. Figma에 1차 신규 UI 프레임이 없다면 기존 Figma를 변경하지 않고 신규 UI만 검토한다.
2. 운영 Supabase 백업/복구 지점을 별도로 확인하고 `main`과 Vercel Production 커밋 SHA를 대조한다.
3. **비용이 발생할 수 있는 별도 Supabase 개발 브랜치** 생성에는 비용 동의를 따로 받아야 한다. 허가 전에는 GitHub Actions의 일회용 PostgreSQL 컨테이너에서만 검증한다.
4. 스키마 제안 파일 2개를 순서대로 독립된 테스트 데이터베이스에서 적용하고, API 로그인·권한·동시성·자정 전환을 검증한다.
5. 운영 적용 직전 DB RLS/EXECUTE 권한을 다시 점검하고 PR diff, 자동 테스트 및 UI 시각 비교를 검토한다.
6. 운영 DB SQL 적용이나 Production 배포/승격은 **사용자 승인 전 실행하지 않는다.**

## 기능 활성화 관련 환경 변수 이름
- 서버 플래그: `MEONGGO_STAGE1_COINS_ENABLED`
- 브라우저(빌드 시) 플래그: `NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED`
- 둘 다 정확히 `1`이어야 활성화된다. 설정이 없거나 다른 값이면 기존 교감 SQL을 사용한다.
- 전용 Supabase 서버 키 값을 문서·커밋·CI 로그에 절대로 기록하지 않는다.
- Next.js의 `NEXT_PUBLIC_` 환경 변수는 **빌드 시점**에 인라인되므로 변경 시 새 빌드가 필요하다.

## 테스트
- Node: `node --test tests/go-coins.test.mjs tests/go-visit.test.mjs`
- 격리 DB: PostgreSQL17 fixture → 기존 affinity SQL → 코인 제안 SQL → 방문 제안 SQL → 트랜잭션 회귀 → 9건 동시 교감 확인
- CI: `.github/workflows/meonggo-stage1-checks.yml`에서 lint 성격의 syntax check, `npm ci`, stage1 UI 켠 Next 빌드, 모바일 Playwright mocked E2E
- 모든 테스트는 임시 DB/가상 API만 사용한다. 현재 1차 기능의 실제 운영 Supabase 연동 E2E는 별도 확인이 필요하다.
- 실제 사용자 카드·친밀도·입양 데이터는 수정하지 않는다.

## 운영 중 오류 시 원칙
- 우선 활성화 플래그를 끄고 이전 안전한 앱 코드를 배포해 신규 지급을 중단한다.
- 획득/사용 거래 내역 및 카드를 무조건 삭제하거나 마이그레이션 테이블을 DROP하지 않는다.
- 관리자 오승인 건은 승인 이력과 잔액 확인 후 서버 회수 처리하고 기록한다.
- 장애 원인과 롤백/재활성화 시점은 구글 시트 로그에 기록한다.

## 신규 계정 인수인계
구글 시트: https://docs.google.com/spreadsheets/d/1TxslDiAhIAYSDe_GAMPJs0vFHQxyaILK-UsfWmgd314/edit
기존 인수인계 Google Docs: https://docs.google.com/document/d/1MmklYDIMmPUpP2NSfijLPnCiOJMzunKx4qJQQ_oRO1M/edit
GitHub 작업 브랜치: https://github.com/to4181234-ctrl/baronado-adoption-site/tree/feat/meonggo-stage1-coins-20261114
운영 도메인: https://baronado-adoption-site-8sm2.vercel.app
