# 바로나도 멍멍GO 2.0 — 3차 개발 완료·검증 보고서
기준: 2026-11-17 / 상태: **3차 기능 구현 및 분리 환경 검증 완료 · 사용자 차수 승인 대기 · 운영 미배포**

## 원칙과 연속 개발 지점
- 작업 브랜치: `work/go2-stage3-20261117` (2차 검토 브랜치 `work/go2-stage2-20261117`에서 파생). **main / 운영 Vercel / 운영 Supabase 미변경.**
- 1·2차 UI 및 파일을 삭제·재설계하지 않고 `main`에 존재하던 1차 멍코인/방문 인증 기능을 재사용했다. 기존 Figma의 홈 프로필·도감·배틀 영역은 배치 보존, 3차 일일퀘스트를 홈 하단에 별도 배치.
- 기존 폰트 소스 `app/figma-local-fonts.css` 그대로, 상점 애니메이션은 4차 작업 대상이므로 3차에 임의 추가 금지.
- 3차 사용자 승인 없이 4차 진행 금지. **2~5차 모두 완료·통합검증 및 별도 최종 배포 승인** 전에 production merge/배포/DB 변경 금지.

## 실제 코드 범위
### 코드 재활용 (이미 main에 있던 원본을 복구)
- `app/api/go/coins/route.js`: 서버에서 서명된 회원 세션을 검사한 뒤 지갑 잔액·KST 당일 퀘스트 실적·30일 거래 내역(획득/사용 필터)을 DB에서 조회.
- `app/api/go/visit/route.js`, `app/api/admin/go/visit/route.js`: 방문인증 6자리 코드 발급/취소 및 직원의 승인/반려/잘못 승인한 코인 회수, 보안 및 중복처리.
- `components/GoCoins.js`, `GoQuests.js`, `GoVisitPanel.js`, `app/go/quests/page.js`, `app/go/visit/page.js`, `app/admin/go/visit/page.js`; 유틸리티 `lib/goVisit.js`, `lib/goCoinNotices.js`; 스타일 `app/meonggo-stage1.css`. 기존 관리자 화면은 유지.
### 이번 브랜치에서 통합·수정
- `components/GoShell.js` 전역 인증 회원별 `GoCoinProvider`, `SiteHeader.js` 실잔액·이용 내역 버튼. API 응답이 도착하기 전 실제 0C라고 가장하지 않고 로딩 표기; 비회원은 이력 조회 불가.
- `components/GoPage.js`: 현재 도감의 기존 Figma 섹션들 다음에 퀘스트 배치, 기존 도감·배틀 섹션 위치 보존.
- `components/GoQuests.js`, `lib/goStage3Quests.js`: 3차 공개 기능인 **첫 돌보기 +10C, 음료구매 방문인증 +30C 두 퀘스트만** 표시. 후속 4차 무료 카드 뽑기 및 5차 PvP 일일퀘스트는 기능 플래그 켜기 전까지 표시하지 않음. 돌보기 일반 보상 10C×최대 5회/일은 퀘스트 보상과 별개. 일일 기준은 Asia/Seoul.
- `app/api/go/interaction/route.js`: **중요 최종 수정**: 이전 코드는 `go_do_interaction`만 호출하여 코인이 실제 지급되지 않는 버그가 있었음. 서버 멍코인 플래그 ON일 때 반드시 `go_do_rewarded_interaction` RPC 호출, OFF라면 기존 함수 호출로 기능 보존. `lib/goStage3Quests.js`의 `interactionProcedure`로 중앙화하고 회귀 테스트 추가. 정산·지급은 클라이언트가 아니라 DB 트랜잭션에서만 실행.
- `components/GoInteract.js`: DB 성공 응답 이후 보상 알림 및 잔액 새로고침. 공식 멍카드만 가진 회원도 돌볼 수 있도록 GET 소유 확인에 `go_official_owned/hidden` 통합.
- `docs/sql/stage3-care-and-official-eligibility-DRAFT.sql`: 기존 서버 함수를 수정하는 **운영 미적용 SQL 초안**. 2차 SQL 선행 필요. 본인 소유 공식카드도 돌보기 허용하고 친밀도 레벨10 이후에도 돌보기 보상 지급. 보상은 1회 10C, 하루 최대 5회, 첫돌보기 퀘스트 +10C 한 번, 원자적 wallet row lock/거래 원장.
- `app/admin/page.js`: 기존 관리자 관리 메뉴에서 방문인증 관리자 화면으로 이동 링크 추가. 320px에서 기존 홈 프로필 링크가 가로로 튀어나오던 현상을 반응형으로 수정(390px Figma 기준 좌표 보존).

## 검증 결과 (운영 데이터와 분리)
- 실제 별도 격리된 Next.js 실행환경: 최종 커밋 `f67bb67`에서 `npm ci` PASS; **100/100 Node 테스트 PASS, 0 실패**; 서버·클라이언트 1/2차 기능 플래그를 활성화한 `npm run build` PASS (Next.js 16.4.3). 이 검증은 2026-11-17에 새 격리 sandbox에서 재실행.
- 브라우저 E2E (모의 회원·동물·지갑·방문 응답): 320/390/430px에서 도감 홈 강아지 5칸 및 퀘스트 2종, 상점·PvP 퀘스트 조기 노출 방지, 실잔액 120C 표시·30일 이용내역 열기/획득 필터, 방문 6자리 코드·취소·재신청, 관리자의 1회 승인·상태갱신, 비회원 로그인 유도·잔액 비노출 확인. 가로 넘침 320px 발견하여 `app/meonggo-stage1.css`에 좁은 화면 규칙을 추가한 뒤 최종 브랜치에서 320/390/430px 재실행하여 **가로 스크롤 없음, JavaScript 오류 없음** 확인. 최종 RPC 선택 수정은 서버 로직만 변경하였으며 해당 함수 회귀 테스트와 빌드를 추가 통과.
- 격리된 PostgreSQL에 실제 `docs/sql/stage3-care-and-official-eligibility-DRAFT.sql` 적용 PASS (anon/authenticated/service_role 역할이 미리 만들어진 로컬 DB). 실 트랜잭션으로 검증: 미보유자 거부, 공식 카드만 보유한 회원도 돌보기와 첫돌보기 보상(+20C), 30분 동일행동 쿨다운, 1일 돌보기 보상 최대 5회(+50C) 및 첫 돌보기 퀘스트 단 1회(+10C), 친밀도 레벨10에도 일일 보상 허용, 방문 인증 코드 생성/미처리 재호출, 현장 승인+30C 한 번, 같은 날 중복 승인 거부, 잔액 부족일 때 잘못 승인한 코인 회수 거부, 정상 회수 및 중복 회수 거부.
- API 미인증 권한 확인: `GET /api/go/coins`, `GET /api/go/visit`, `GET /api/admin/go/visit`은 미인증 시 **401**, 다른 사이트의 POST는 **403**. DB 함수는 운영 메타데이터에서 anon/authenticated 실행 권한 없고 service_role에만 있음.
- 운영 Supabase에는 이전 마이그레이션 `meonggo_stage1_coin_wallet_20261115`, `meonggo_stage1_visit_20261115` 설치 확인(읽기 전용). 실회원/실운영 방문 승인·보상 실행·실 운영 DB SQL 수정 테스트는 **하지 않음**. 브라우저 검증은 모의 서버 응답임을 유지하고 실제 운영 회원 E2E라고 주장하지 않는다.

## 운영 배포 전 최종 통합 체크리스트 (현재 차수 범위 밖)
1. 2차 미적용 공식 4+1 SQL 후 3차 돌보기 SQL을 합쳐 **검토된 순서**로만 운영 마이그레이션 시행. 프로덕션 비밀키/환경변수는 GitHub에 기록하지 않는다.
2. 3차 기능 플래그 `MEONGGO_STAGE1_COINS_ENABLED=1`, `NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED=1`은 새 DB 함수 및 화면 모두 준비된 최종 통합 배포에만 ON. 2차 카드 API 플래그 연계 검토.
3. 4차 공식카드 뽑기와 5차 PvP 퀘스트 지급은 후속 차수에서 서버 RPC·DB 검증 후 켠다. 4차 상점 애니메이션은 사용자 제공 원본을 따로 보존해 사용한다.
4. 모든 차수 완료·운영 배포 승인 직전에 DB 백업, 기능 플래그·실회원 스모크 테스트, 관리자 승인·롤백 절차를 수행.
5. **현재 3차 개발은 완료, 4차 미착수, 배포 미진행.** 차수 승인은 사용자가 명시적으로 결정.
