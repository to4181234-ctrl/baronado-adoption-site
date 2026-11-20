# 멍멍GO 2.0 — 2026-11-20 UI/뽑기/순위/통계 업데이트 인수인계

## 작업 기준과 안전 수칙

- 원본 저장소: `to4181234-ctrl/baronado-adoption-site`
- 작업 브랜치: `work/meonggo2-ux-stats-20261120`
- 분기 기준 운영 커밋: `a4b9ed50217ac09896db859f6e8613c43de0772d`
- 코드/디자인 판단 기준: 기 사용자 승인 Figma, 특히 픽셀 선택창 `rhHUCAxjXfuWnpFzM4QkWM`의 `698:163511` 및 1:1 PvP 선택 노란 카드
- 운영 Supabase DB는 읽기 조회 외 변경하지 않음. 운영 수집 카드, 멍코인, 회원, 배틀 기록은 수정/삭제/초기화 금지.
- 입양 완료 강아지 도감에 추가 안내 문구를 넣자는 제안은 사용자 거절로 **제외**.
- 확정 범위 밖 UI 임의 변경 금지. 별도 로그인/사용자 이벤트 수집 신설하지 않음.

## 구현된 파일과 변경점

### 1단계 UI

- `components/GoCollarDialogue.js` (신설): Figma 픽셀 선택창, `세 개 중 하나를 고른다` — 정적 안내이며 클릭 불가. 원본 픽셀 SVG 재사용, `도망간다` 제거.
- `components/GoFreeDraw.js`와 `components/GoStore.js`에서 공통 대화창 적용.
- `components/GoOfficialDrawReveal.js`, `app/meonggo2-stage3-ui.css`: 뽑기 결과 카드 아래 회색 제목 표시.
- `components/GoBattle.js`, `components/GoCard.js`, `components/GoStage2OfficialCards.js`: 기존 1:1 PvP `GoCardFace selected`의 카드 **내부 연노랑** 선택 효과로 통일. 외부 테두리, 체크 배지 제거.
- `components/GoAlbumCardDetail.css`: 기존 2.15초/5.8초 홀로그램 빛 스윕의 불투명도를 20% 감소. 원본 색과 모션은 유지.

### 2단계 무료·유료 뽑기

- 무료 1일 2회: 목줄 클릭 즉시 시작 애니메이션 → 서버 결과 확인 후 카드 공개.
- 일반 랜덤 60C: 상품 → 결제 확인(여기서 구매 실행) → 목줄 선택 → 즉시 애니메이션 → 확정 결과 공개.
- 지정 랜덤 100C: 상품 → 결제 확인(미차감) → 강아지 선택(여기서 구매 실행) → 목줄 선택 → 즉시 애니메이션 → 확정 결과 공개.
- 기존 서버 측 구매 원자성/중복 요청 방지, 60:40 보유/미보유 선택 확률 및 한쪽 후보 0건 예외 처리 그대로 유지.
- `components/GoOfficialDrawReveal.js`는 애니메이션 시작 시점을 서버 응답과 분리하고, 결과가 확정되지 않으면 카드 내용을 열지 않음.
- `components/GoStore.js`: 구매 요청 ID를 구매 결과 확인 전까지 보관. 중단/새로고침 시 같은 ID로 영수증 복구하고, 복구 대상 결과를 목줄 선택 연출에서 확인. 결제 실패 또는 결과 조회 불확실 시 추가 새 결제 유도하지 않음.
- 입양 완료된 강아지는 신규 추첨에서 제외. 공개 준비가 끝난 신규 강아지는 기존 규칙에 따라 자동 후보 추가.

### 3단계 멍기록가 순위

- `lib/goAlbumSelection.js`: `combinedAlbumRank` 순수 함수 및 `albumRankLabel` 생성.
- `lib/server/goCollection.js`: 승인된 개인 카드 + 공식 1~4 슬롯 + HIDDEN 소유 행을 **DB 조회만** 하여 인원별 집계.
- 정지되지 않은 회원 중 카드 1장 이상 가진 사람만 참여. 동점자는 공동 순위, %는 자신과 동점자까지 포함한 누적 비율. 참여 10명 미만일 때 백분율 대신 공동 n위·참여자 수.
- `components/GoPage.js`, `components/GoDogAlbum.js`, `components/GoStanding.js`: 신규 집계/안내.
- 기존 운영 SQL RPC 수정 없음.

### 4단계 멍멍GO 관리자 통계

- 경로 `/admin/go/stats` 유지. `app/admin/go/stats/page.js` 교체.
- `components/GoAdminDashboard.js` (신설): ① 전체 현황 ② 멍카드·뽑기 ③ 멍코인·퀘스트 ④ 배틀·돌보기 ⑤ 커뮤니티. 기간 오늘 / 7일 / 30일 / 전체.
- `app/api/admin/go/dashboard/route.js` (신설): 관리자 인증을 검사하고 기존 테이블에서 **GET만** 조회·집계. 한국 날짜 기준. 없는 기록은 추정하지 않음.
- 기존 `components/GoAdminStats.js`의 게시물 통계는 커뮤니티 탭 내 접힌 상세 화면으로 보존.
- 기존 `/admin/analytics` (홈페이지 통계) 기능 변경 없음.

## 검증 및 배포

- GitHub Actions 워크플로: `.github/workflows/go2-final-integration-qa.yml`. 대상 브랜치 추가.
- 신규 테스트: `tests/meonggo-ux-stats-20261120.test.mjs`; 기존 Figma 관련 테스트는 새로 승인한 문구·흐름 기준으로 갱신.
- CI 결과: [2026-11-20 성공한 독립 통합 QA (run 44683008531)](https://github.com/to4181234-ctrl/baronado-adoption-site/actions/runs/44683008531)
- Node 단위/계약 테스트 272개 모두 통과. 독립 PostgreSQL에서 SQL 드래프트 통합 적용 성공. 기능 플래그 ON/OFF 두 상태의 Next.js 빌드 및 읽기 전용 HTTP 스모크 테스트 성공.
- 이전 브랜치 빌드만 운영 중이며 새 기능은 별도 preview/배포 단계에서 전환해야 함.
- CI는 자동화/계약/DB 격리 검증이고 iPhone 실기기, Figma 전체 픽셀 대조, 운영 계정의 실결제는 수행하지 않았음. 비밀키 및 개인정보는 인수인계에 포함하지 않음.
- 배포 후 새 버전의 오류를 발견할 경우 기준 운영 SHA로 롤백 가능하도록 기존 배포 ID 보존.

## 배포 전 확인할 사항

1. 최신 브랜치 SHA로 Vercel preview `READY` 확인.
2. 새로운 실사용 결제 경로는 **운영 DB에 실제 코인을 차감하는 방식으로 검증하지 말 것**.
3. 사용자에게 운영 배포 결과와 미검증 부분을 명확히 구분해 전달.
