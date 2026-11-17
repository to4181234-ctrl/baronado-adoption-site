# 바로나도 멍멍GO 2.0 — 1~5차 최종 통합 검증 보고서

**기준:** 2026-11-17 (Asia/Seoul)  
**최종 판정:** **격리 환경의 통합 SQL·기능 회귀·브라우저 검증 통과 / 실제 운영 배포는 아직 불가(릴리즈 게이트 3종 보류)**  
**검토 브랜치:** `work/go2-integration-20261117` (5차 검토 브랜치에서 분기)  
**최종 사용자 배포 승인:** **미요청·미승인**. `main`, 운영 Vercel 및 운영 Supabase/Storage 데이터에 **쓰기 작업 없음**.

## 1. 검증 범위와 확인된 결과

| 구분 | 실행 환경 | 결과 |
| --- | --- | --- |
| 2→3→4→5차 DB 마이그레이션 **순서대로 2회** | 격리 PostgreSQL 18, *운영 DB 구조에서 읽기 전용으로 추출한 테이블 20개·제약조건 119개* 재현 | **PASS** |
| 실제 회원 보존 대역 | 운영 회원이 아닌 테스트 회원 2개·개인 카드 2개·기존 코인원장 1건·공식 이미지 8개를 **마이그레이션 전에 삽입** | 마이그레이션 후 ID·이전 기록 유지 **PASS** |
| 2차 공식 일반 4종+HIDDEN 1종, 무료뽑기 | 위 격리 PostgreSQL | 일반만 뽑기, 자동 HIDDEN 없음, 4종 후 직접 해금 **PASS** |
| 3차 돌보기·멍코인 | 위 격리 PostgreSQL | 기존 카드로 돌보기, 보상 지급, 거래원장 유지 **PASS** |
| 4차 상점 랜덤200 / 강아지 지정 랜덤300 | 위 격리 PostgreSQL | 실제 가격 제약·구매·영수증·코인차감 **PASS (오류 1개 수정 후)** |
| 동시 결제 | 병렬 PostgreSQL 세션 | 잔액 300C에 다른 구매 요청 2건 중 1건만 성공, 동일 UUID 2건 동시 요청도 추가 차감 0 **PASS** |
| 5차 친구 1:1 PvP + 일일퀘스트 | 위 격리 PostgreSQL 및 기존 5차 개별 QA | 서버의 승패/전적·일일퀘스트 1회, 재접속/무효화 보호 **PASS** |
| 6번 기존 HIDDEN 자산 보호 | 별도 구형 스키마 DB | 기존 슬롯 6 존재 시 2차 마이그레이션 **자동 중단**, 레거시 데이터 보존 **PASS** |
| 보안 DB 함수 접근제어 | 격리 PostgreSQL | 공식·돌보기·상점·PvP·보상 함수의 `anon/authenticated EXECUTE=false`, `service_role=true` **PASS** |
| Node 전체 자동 테스트 | 별도 Vercel Sandbox에서 `npm ci` 후 실행 | **119 / 119 PASS** |
| Next.js 프로덕션 빌드 | 전체 기능 플래그 ON / OFF 별도 빌드 | **양쪽 PASS** |
| 브라우저 상점·퀘스트·배틀 | Chromium 320·390·430px, **HTTP 모의 API** | 상품→선택→취소0회→결제1회, 도감/퀘스트4종/랜덤·친구 모드, 3폭 수평넘침·JS에러0 **PASS** |
| 도감 공식/나만의 카드 전환 | Chromium 390px, Supabase REST·API 모의 데이터 | 화면 및 전환 **PASS** |
| 관리자 공식 4+1 등록/게시/중지 | Chromium 390px, 파일 input은 실제 이미지, 서버 응답은 모의 | 5슬롯 등록, 사전 게시 잠금, 게시·중지, 넘침·JS에러0 **PASS** |

## 2. 이번 통합 검증에서 찾아 고친 실제 장애

**BLOCKER 해결: 기존 영수증 DB 제약이 300C를 전부 거부함.**

운영 DB를 **읽기 전용으로 점검**한 결과 `go_official_purchases_coins_check`가 **`CHECK (coins = 200)`** 상태였다. 종전 4차 단독 테스트의 단순화한 스키마에서는 이를 누락했기 때문에 `go_store_purchase(...,'specific',dog,NULL)`에 실제로 300C 충전/지급 절차가 도달하면 `CHECK` 위반이 발생했다.

`docs/sql/stage4-store-200-300-DRAFT.sql`의 스토어 함수 이전에 `DROP CONSTRAINT IF EXISTS go_official_purchases_coins_check`, `ADD ... CHECK (coins IN (200,300))`을 동일 마이그레이션 트랜잭션으로 추가했다. 레거시 200C 거래는 보존하고 300C 영수증을 허용한다. 고친 SQL로 **20개 테이블 실제 스키마 구조의 순차 통합 마이그레이션 2회**, 200/300 구매 및 동시 구매를 통과했다. 영구 자동 테스트 `tests/go-final-integration-contract.test.mjs`에서 이 제약 변경 순서를 고정했다.

**보안 강화:** 2차 SQL의 기존 `CREATE OR REPLACE` 공식 RPC들도 기존 운영 권한을 보존하는 것에만 의존하지 않고 새 격리 DB에서 직접 `anon/authenticated`를 REVOKE, `service_role`에만 EXECUTE하도록 보강. 재검증 완료.

### 2-1. 로컬 합성 DB 백업/복원 리허설 (추가 검증)

별도 `go_integration_rollback_src`에서 **2~5차 적용 전** 합성 데이터를 `pg_dump -Fc`로 백업한 다음 마이그레이션을 실제 실행했다. 그와 별개인 새 DB `go_integration_rollback_restored`에 `pg_restore`로 백업을 복원해 **회원2·카드2·기존 원장1·공식 이미지8** 건과 구형 영수증 제약 `CHECK(coins=200)`이 돌아옴을 확인했다. 마이그레이션 완료 측에서는 변경 후 `coins IN(200,300)`을 별도로 확인했다. **로컬 합성 DB 복원 테스트 PASS**. 다만 이는 실제 운영 Supabase PITR 백업/Storage 객체를 복원한 것은 아니므로 출시 전 필수 실제 복원 검증을 대체하지 않는다.

## 3. 실서비스 사전점검(읽기만 함)

2026-11-17 기준 실제 운영 DB 행 수: `dogs=14`, `go_members=20`, `go_cards=55`, `go_battles=46`, `go_coin_wallets=1`, `go_coin_transactions=0`, `go_official_assets=0`, `go_official_owned=0`, `go_official_purchases=0`, `go_pvp_records=0`. Storage 메타데이터 `go-cards=94`개, `go-official-cards=0`개. 레거시 `assets slot6=0`, `owned slot5=0` → 현재 기준 4+1 마이그레이션 사전 가드 통과 가능하지만 **실배포 직전 재조회 필수**.

운영 Vercel alias `baronado-adoption-site-8sm2.vercel.app`의 운영 배포 SHA는 **`6e81eb7581fd19d451c49055fd1a41c47820b298`** 확인. 이번 작업은 배포/alias/DB·Storage 변경 없음.

현재 운영 Supabase Security Advisor는 `rls_enabled_no_policy` **INFO 33건**을 표시한다. 이 프로젝트는 일부 테이블을 서비스 역할만 접근시키는 구조여서 **그 숫자만으로 공개 데이터 유출을 의미하지는 않는다**. 다만 실제 릴리즈 직전 Data API grants·RLS 및 Security Advisor 재점검 권장: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## 4. 재현 가능한 검증 산출물

- `tests/fixtures/go-integration-schema.sql`: 운영 **스키마 메타데이터만** 조회하여 만든 합성 QA DB 구조. 실제 이용자 행/비밀정보 **포함하지 않음**.
- `tests/fixtures/go-integration-seed.sql`: 가짜 회원 2개/카드·영수증·공식 자산 예시. 기존 데이터 보존 확인 용도.
- `tests/fixtures/go-integration-assert.sql`: 무료 공식뽑기, 보상, 200/300 구매, 코인, HIDDEN, PvP, 기존 회원·카드 보존 검증.
- `scripts/verify-go-integration-local.sh`: **외부 DB 연결을 강제 차단**하는 로컬 전용 QA 실행 스크립트. DB명 `go_integration_*` + local Unix socket 또는 loopback TCP만 허용. 4개 SQL을 2회 적용하고 점검.
- `tests/go-final-integration-contract.test.mjs`: 300C 제약, 원본 데이터 삭제 금지, SQL 통합 테스트 최소 요건을 고정.
- `.github/workflows/go2-final-integration-qa.yml`: **수동 실행만 가능한** 작업. PostgreSQL 18 격리 서비스에서 동일 테스트·양쪽 빌드를 재실행하는 구성. **GitHub Actions에서 실제 실행은 아직 안 함.**

## 5. 운영 배포 전에 반드시 끝내야 하는 세 가지 게이트

1. **실제 Auth·Storage를 사용하는 분리된 Supabase 스테이징 프로젝트의 전체 HTTP E2E:** 테스트 회원 2명 로그인/초대/재접속·정지/복구, 카드 촬영·선택·삭제, 공식 4+1 관리자 실이미지 업로드·게시, 무료뽑기·코인 지급, 200/300 결제, 실제 signed Storage URLs, 각 계정의 고유 소유권 검증. 현재 브라우저는 **mock API**, DB는 **독립 PostgreSQL 트랜잭션**으로 검증했으므로 양자를 연결한 전체 실환경 E2E가 아님.
2. **Figma 최종 이미지 동등성 점검:** 스토어는 원본 `558:607838`의 대화창 x16/y263/357×80, 두 카드 x17/x206/y374/166×265이 실제 390px DOM에서 일치함. 다만 도감/상점/배틀/관리자 모든 프레임의 픽셀별 raster diff까지 실시하지는 않음. 기존 원본 SVG·폰트·애니메이션 보존.
3. **운영 백업·복구 리허설 및 승인:** 현재 사용자 파일/DB를 백업해 복제 스테이징에서 실제 복원 연습, 기존 운영 코드/DB/Storage 불변 스냅샷 검증 후 사용자 별도 승인. **운영 DB에 아직 단 한 개의 2~5차 DRAFT도 실행하지 않음.**

따라서 **판정은 격리 통합 테스트 PASS / 운영 배포 HOLD**다. 출시 여부는 별도 승인 전까지 유지한다.

## 6. 안전한 배포·복구 절차(실행 안 함)

1. 배포 직전 쓰기 작업을 일시 중단/점검. **운영 DB를 점검 시점과 새 시점으로 비교**(위 행 수+레거시 슬롯6/owned5, Storage 원본 객체 수), 새 데이터가 늘어났다면 재검토.
2. **운영 DB point-in-time restore가 실제로 가능한 백업/복구 가능 시점과 별도 스테이징 복원 성공**을 확보하고, `go-cards`·`go-official-cards` Storage 백업과 원본 소스/서체/애니메이션 Git SHA, 기존 운영 Vercel commit `6e81eb7...`을 함께 보관한다.
3. 스테이징에서 `stage2-four-plus-one` → `stage3-care-and-official-eligibility` → **수정된** `stage4-store-200-300` → `stage5-friend-pvp-and-random-battle` 순으로 적용, 실제 두 회원 HTTP 검증과 Figma 비교를 완료한다.
4. 사용자 **별도 명시 승인 후** 운영 백업과 쓰기 중지 구간을 확인하고 순서대로 SQL 적용, 권한·기존 행 수·영수증·동시성 점검, 정식 코드 배포 및 1/2/4/5차 서버·공개 플래그를 활성화한다. 3차 코인/돌보기는 1차 지갑 플래그를 활용한다. 자격증명은 로그/문서에 남기지 않는다.
5. 실패 시 먼저 **쓰기·구매를 잠그고 해당 기능 플래그를 끔**, 기존 Vercel alias를 검증된 배포로 되돌린다. **코드만 롤백하면 4+1 DB 스키마와 구형 5+1 클라이언트가 불일치할 수 있음**: DB는 검증된 복원본으로 되돌리거나 승인된 호환성 패치를 사용한다. 복원 시 릴리즈 후 추가된 이용자 거래를 잃지 않도록 장애 전에 쓰기 정지/기록 보존이 선행돼야 한다. Storage 복구는 실제 삭제·변경 객체만 대상으로 수행한다.

**릴리즈 후보는 이번 통합 브랜치만 사용:** 기존 4차 PR의 오래된 300C DB 제약 결함이 이 브랜치에서 수정됐으므로 `work/go2-integration-20261117`의 SQL을 최우선으로 취급한다.
