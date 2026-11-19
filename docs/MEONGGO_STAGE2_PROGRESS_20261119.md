# 멍멍GO 2.0 추가 업데이트 — 2단계 개발 진행 보고 (2026-11-19)

## 진행 범위와 안전 상태

- 브랜치: `work/meonggo2-next-update-staging-20261119`
- 출발 커밋: `37030e42e762f31e65f863894bad991229396048` (실제 운영 Vercel 커밋)
- **운영 DB DDL / DML 실행: 0건**
- **운영 사이트 배포: 하지 않음**
- **main 수정: 하지 않음**
- 유료 Supabase 테스트 DB 생성: **사용자 거부에 따라 하지 않음**
- 코드 변경: 검토용 GitHub 개발 브랜치에만 커밋됨

이 단계는 **2단계의 코드·SQL 초안 작성 완료**, **독립 DB SQL 실행 및 전체 Next.js 빌드 검증은 미완료** 상태이다. SQL 초안을 운영 DB에 직접 적용해서 테스트하지 말 것.

## 저장된 변경사항

### SQL (한 파일로 통합, 적용 금지)

`docs/sql/MEONGGO_NEXT_ECONOMY_DRAFT.sql`

- `go_draw_attempts`: 무료/유료/기존 무료 뽑기별 고유 발급 ID, 중복 후보 능력치, 사용자 선택, 재시도 추적.
- `go_official_draw_v2(member,request)`: 하루 2회, 한국시간 자정 경계, 보유 60%/미보유 40%, 한쪽 풀 비면 100%, HIDDEN 제외, 퀘스트 코인 0C.
- `go_store_purchase_v2(...)`: 60C/100C, idempotent request ID, 중복 구매/완성 컬렉션 지원, 실패 시 원자적 롤백, 기존 영수증 가격 보존.
- `go_official_resolve_duplicate_v2(member,attempt,replace)`: 날짜가 지나도 고유 발급 ID로 기존 능력치 유지 또는 새 능력치 교체. 사용자 X 클릭은 replace=false.
- `go_battle_reward_claims`: 랜덤/친구 배틀별 **0C도 포함**한 불변 정산 마커. 중복 호출로 +3C가 두 번 지급되는 것을 방지.
- `go_battle_award_result`: 계정 지갑 행 잠금을 사용해 첫 게임 +10C만, 이후 승리 +3C, 패무 0C.
- 기존 `go_battle_reward_random` / `go_pvp_action` 보상 경로를 새 원자적 정산으로 교체.
- 기존 200C/300C 구매 기록이 남도록 `go_official_purchases_coins_check` 에 60/100/200/300 허용.
- 기존 `go_coin_transactions_event_type_check` 에 `battle_win` 신규 거래 유형 추가.
- 이전 완료 경기의 추후 조회가 소급해서 +3C를 지급하지 않도록 `go_battle_reward_claims`에 0C 처리 완료 기록을 백필.
- 이전 브라우저의 기존 무료 뽑기/중복 resolve RPC 요청을 새 함수로 안전하게 연결하는 호환 래퍼.
- 서비스 역할 전용 새 함수/테이블 권한 및 RLS.
- 파일에 `BEGIN; ... COMMIT;` 이 있지만 **실제 DB에서 실행한 적 없음**.

### API 및 공통 규칙

- `app/api/go/official/route.js`: `drawCount/drawLimit/drawsRemaining`, 오래된 무료 발급과 신규 무료 2회 합산, 미해결 중복 발급 조회, v2 발급·해결 RPC 호출.
- `app/api/go/store/route.js`: 새 v2 구매 RPC 연결, 영수증의 중복 여부와 choiceId 조회.
- `app/api/go/coins/route.js`: 무료 뽑기 퀘스트 완료 상태 제거.
- `lib/goStore.js`: 60C/100C, 일반 카드 4종을 모두 가진 강아지도 지정 구매 가능, 오래된 거래 내역 별도 유지.
- `lib/goStage3Quests.js`, `components/GoQuests.js`: 무료 뽑기를 코인 퀘스트에서 제거 (도감으로의 새 진입 UI 추가는 3단계 예정).
- `lib/goNextEconomyRules.js`: 독립 테스트 가능한 60:40/무료2회/배틀10·3 규칙.
- `components/GoCoins.js`: 새로운 `battle_win` 내역 표시와 역사적 `quest_draw` 표기 보존.

### 뽑기 사용자 흐름 연결

- `components/GoFreeDraw.js`: 계정별 sessionStorage 요청 ID로 재시도 안전성; 고유 choiceId 기반 중복 처리; X 누르면 기존 능력치 유지 요청.
- `components/GoStore.js`: 60/100C 가격 표시·확인, 4종 수집 완료 강아지도 지정 가능, 새 유료 중복 비교 지원, 이전 200/300C 거래 조회 시 현재 가격과 무조건 비교해 거부하지 않음, X 누르면 기존 능력치 유지.
- **Figma 원본 카드 일러스트·목줄 10% 확대·0.7s/0.95s 속도·READY 위치 등 시각 구현은 3단계의 작업 항목**. 2단계의 스토어 카드 이미지는 아직 Figma 교체 전 상태.

## 시행한 제한적 검사

**실제 실행한 검사**
- GitHub 브랜치에서 직접 읽어온 3개 순수 모듈 코드를 대상으로 **14개 독립 규칙 검증 통과**.
- GitHub에 저장된 실제 SQL 초안/API/클라이언트 원문에서 **17개 계약 연결·안전 표식 검사 통과**.
- 5개 비-JSX Next.js API 모듈의 JavaScript 파서 검사 통과.
- 파일 존재·브랜치 커밋 결과를 GitHub로 재조회하여 검증.

**아직 실행하지 못한 검사**
- PostgreSQL 마이그레이션 적용 및 함수 컴파일 검증.
- 독립 테스트 DB의 신규 카드/중복/거래·롤백·동시 클릭 검증.
- 전체 `npm install`, `node --test`, `next build` 및 실제 브라우저 테스트. 현재 GitHub 소스가 컨테이너에 전부 내려받아져 있지 않고 컨테이너에서 GitHub 네트워크 접속이 불가.
- UI·Figma 대조와 멍배틀 전체 화면 검증은 3~4단계.

**따라서 2단계는 '검토용 구현 커밋 완료'이고 '검증 완료' 또는 '배포 가능' 상태가 아니다.**

## 후속 작업·DB 테스트의 우선순위

1. 비용 없는 독립 Postgres 실행 환경이 확보되면 SQL을 복사하여 **독립 DB에서만** 실행. 필요시 SQL 문법/제약을 수정.
2. 기존 무료 1회 기록이 있는 날 신규 1회를 추가할 수 있고 3번째를 거부하는지 검증.
3. 신규 계정(미보유 100%), 부분 수집(60:40), 모두 수집(중복 100%) 무료/유료/지정 3모드 각각 테스트.
4. 60/100C 원자적 결제, 구매 버튼 연타/통신 끊김/과거 200/300 영수증 복구 테스트.
5. 중복 비교의 기존 카드 유지/새 카드 선택/닫기(X)와 오류 후 재개 테스트.
6. 랜덤/1:1 첫 대결 10C만, 이후 승리 3C, 두 유형 공유 보상, 패무 0C, 재대결 및 재전송 차단 확인.
7. 기존 `go_pvp_action` SQL이 실제 스키마에서 컴파일되고 양 플레이어의 정산을 각각 보호하는지 확인.
8. SQL 적용 전후 구매 기록/카드 능력치/잔액/전적이 보존되는지 체크섬·건수·샘플 합성 데이터로 회귀 검증.
9. 3단계에서 새 도감 무료 진입 위치, Figma 스토어 카드 차별화, 목줄 확대·속도, READY UI, 선택 강조, 애니메이션 흔들림, 상대 카드 수 표기 제거.
10. 4단계에서 전체 빌드·브라우저 테스트·최종 데이터 보존·운영 전환 계획 검토 후 사용자가 승인해야 실제 배포 가능.

## 테스트 파일

- `tests/goNextEconomy.test.mjs`: 코드의 경제 규칙 회귀 테스트 (Node 내장 테스트 러너).
- `tests/goNextEconomyContract.test.mjs`: SQL·API 연결/안전 계약을 검사하는 정적 테스트.

로컬 전체 소스가 있는 개발 환경에서 실행:

```bash
node --test tests/goNextEconomy.test.mjs tests/goNextEconomyContract.test.mjs
npm run build
```

`npm run build`는 기존 프로젝트의 승인된 오디오 파일 설치·검증 프리빌드 작업을 수행하므로 관련 기존 자산과 환경변수도 필요하다. **실제 위 두 명령을 아직 실행하지 않았다.**

## 절대 금지

- 이 SQL을 운영 Supabase SQL Editor에 붙여넣어 실행하는 행위
- `main` 직접 수정, 운영 Vercel 배포 변경, 기존 사용자 카드/멍코인/배틀 기록 초기화
- 테스트 DB가 없는데 SQL·통합 검증이 끝났다고 보고하는 행위
- 사용자 승인 없이 비용이 드는 클라우드 DB 브랜치 생성
