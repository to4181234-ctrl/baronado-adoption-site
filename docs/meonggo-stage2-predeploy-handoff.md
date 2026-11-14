# 바로나도 / 멍멍GO 2.0 — 2차 개발 인수인계 (배포 금지)

- 기준일: **2026-11-14 KST**
- 대상: **2차 공식 멍카드 5종 + HIDDEN · 도감 · 무료 뽑기 · 200C 상점 · 관리자**
- 구현 브랜치: `feat/meonggo-stage2-official-cards-20261114`
- 베이스: `feat/meonggo-stage1-coins-20261114` (1차 코드 포함)
- 배포 정책: **2·3차까지 개발하고 전체 통합 검증·사용자 승인 후 Production 1회 배포**
- 상태: **개발 브랜치 / 전용 Supabase 테스트 DB 적용 전 / 운영 DB 변경 없음**

## 사용자 승인 정책
- 별도 관리자 메뉴 **공식 멍카드 관리** (기존 게시물 moderation 별도).
- 한 강아지에 공식 사진 5종(사진별 제목) + 특별 일러스트 1종. **관리자 직접 업로드**.
- Figma 카드 프레임 그대로 166×265, 사진 뷰포트 134×132; 원본 이미지 별도 보존하고 위치/확대/크롭 지원.
- 6종이 모두 업로드되어야 **일괄 공개**, 공개된 사진·제목도 초안에서 수정 후 **일괄 적용**.
- 공개 일시중지/재공개는 신규 뽑기·구매에만 영향. 이미 소유한 사진·능력치·HIDDEN 유지.
- 입양 완료 강아지는 신규 획득에서 제외. 기존 보유자는 계속 볼 수 있음.
- 현재뿐 아니라 **과거 획득/해금 이력**이 단 1건이라도 있으면 세트 영구삭제 불가.
- 무료 공식 뽑기 하루 1회 KST, 미보유60%/기보유40% (가능한 풀로 대체).
- 중복 시 보유 능력치 즉시 갱신하지 않음; 사용자에게 기존 유지 vs 새 능력치 선택 제공.
- 선택 강아지의 **미보유 카드 1장 200C**. 원자 차감/지급, 동일 requestId 재시도는 이중 차감 금지.
- 공식 사진 5장 완성 시 HIDDEN 자동 해금/PNG 저장 및 계정 영구 보유.
- 도감 **유기견 도감 / 나만의 카드** 탭, 사진 1~5와 HIDDEN 동일 크기, 미보유 잠금/NEW 배지.
- 사용자 카메라 카드 **새 제작 3장/일/계정** (기존 go_cards 모두 유지, 과거 기록 미산입, 삭제해도 제작 횟수 불복원).
- 2차 3개 퀘스트: 첫 돌보기 +10C, 현장 방문 +30C, 첫 무료 공식 뽑기 +10C. 하루 50C + 돌보기 50C.
- 3차 실시간 친구 PvP는 **아직 개발하지 않았음**.

## 코드
- `supabase/proposals/meonggo_stage2_official_REVIEW_NOT_APPLIED.sql` — 8개 새 사설 테이블, 배포/버전/획득/구매/해금/카메라 RPC
- `supabase/proposals/meonggo_stage2_storage_REVIEW_NOT_APPLIED.sql` — 사설 `go-official-cards` 스토리지 버킷 (공개 정책 없음)
- `app/api/go/official/route.js` — 사용자 소유자에게만 signed image URL, 하루 뽑기·중복 능력치·NEW 확인
- `app/api/go/official/shop/route.js` — 200C 멱등성 구매
- `app/api/go/official/hidden/route.js` — 소유자 전용 PNG 다운로드
- `app/api/go/official/camera/route.js` — 신규 카메라 일별 제작 잔여 횟수
- `app/api/admin/go/official/route.js` — 관리자 인증, 6슬롯 초안 관리·업로드·크롭·일괄 적용·삭제 보호
- `app/admin/go/official/page.js` — 관리자 공식 카드 UI
- `components/GoOfficialAlbum.js` — 공식 도감, 뽑기/상점/특별 해금 UI
- `lib/goOfficial.js` — 이미지 원본 보존 및 Figma 134×132 원본 사진뷰 출력
- `app/meonggo-stage2.css` — 신규 영역만 스코프 지정
- 기존 `GoPage`, `GoQuests`, `GoCamera`, `app/api/go/cards`, `app/api/go/coins`, `app/admin/page`에 제한적 연결
- Stage1 `go_cards`/게시물/카드 능력치/입양 DB 데이터 마이그레이션 **절대 금지**. 공식 카드는 별도 보유 테이블.

## 기능 활성화 (현재 환경 변수 기본 OFF)
- `MEONGGO_STAGE1_COINS_ENABLED=1`
- `NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED=1`
- `MEONGGO_STAGE2_OFFICIAL_ENABLED=1`
- `NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED=1`
- 실제 앱 활성화 전, **1차 SQL → 2차 SQL → 2차 스토리지**가 전용 테스트 프로젝트에서 검증되어야 함.
- `NEXT_PUBLIC_*` 플래그는 빌드 시점에 인라인되므로 변경 후 새 빌드가 필요함.
- Private bucket은 서비스 롤 서버에서만 접근하며 프론트는 짧게 만료되는 소유자 전용 signed URL만 수신.

## 자동 검증
- `.github/workflows/meonggo-stage2-checks.yml`
- PostgreSQL17 *일회용 컨테이너*에서 1차 + 2차 SQL을 함께 적용, 1차 회귀/9건 병렬 돌보기/2차 공개·구매·일일뽑기·해금·삭제 보호·카메라 한도 검증.
- Node 이미지 크롭 검사, Next.js build(1·2차 기능 플래그 ON).
- Playwright 모바일 390×844 *가상 API*로 공식 도감/무료 뽑기/상점/특별 일러스트/관리자 공개 가능조건 검사.
- 실 Supabase 로그인·Storage 버킷·브라우저 통합검증과 신규 화면의 최신 Figma 수동 비교는 **추가 검증 필요**.
- 이미지/DB 구조를 운영 Supabase에 적용하지 않았음.

## 3차 개발로 넘길 주의점
- 기존 유저제작 카드: `go_cards`와 `go_battle_card_stats`의 기존 능력치는 그대로.
- 공식 카드: `go_official_owned`의 `power/charm`; 3차 PvP 카드 선택에 **두 저장소 모두** 포함할 것.
- 3차 정상 완료 PvP 퀘스트 +10C는 서버 원장에 `quest_battle` 타입 예약되어 있음. 실제 3차 로직은 아직 없음.
- HIDDEN 일러스트는 PvP 카드가 아님.
- 승무패 기록은 카드 삭제/입양 완료 시에도 보존해야 함.
- 3차 브랜치는 **본 브랜치의 검증된 최신 HEAD**를 기준으로 생성하되, `main`은 계속 그대로 유지.

## 사용자·운영 보호
- Production `main` 병합·Supabase SQL 적용·환경변수 활성화·운영 배포 **금지**. 사용자 요청: 3차와 통합 검증 후 한 번만 배포.
- 비밀키, 구글 인증 정보, 실 사용자 개인정보를 코드/로그/구글 시트에 기록 금지.
- 기존 Google 개발 시트 https://docs.google.com/spreadsheets/d/1TxslDiAhIAYSDe_GAMPJs0vFHQxyaILK-UsfWmgd314/edit
- 1차 PR https://github.com/to4181234-ctrl/baronado-adoption-site/pull/10
- 기존 전체 인수인계 https://docs.google.com/document/d/1MmklYDIMmPUpP2NSfijLPnCiOJMzunKx4qJQQ_oRO1M/edit
