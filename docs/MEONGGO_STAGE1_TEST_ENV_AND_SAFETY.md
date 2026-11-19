# 멍멍GO 2.0 — 1단계 테스트 환경·안전 점검 (2026-11-19)

## 목적과 현재 상태

이 문서는 **운영 서비스에 쓰기 없이** 실험 가능한 데이터베이스를 마련하기 위한 절차와 1단계 실측 내용을 기록한다.

**현재: GitHub 분리 완료 / 운영 스키마 읽기 전용 확인 완료 / 재현 가능한 테스트 환경 절차 작성 완료 / 실제 독립 PostgreSQL 서버 생성 및 작동 검증은 미완료.**

이를 'DB 테스트 완료'나 '운영 데이터 백업 완료'라고 표현하면 안 된다.

## 운영 배포 기준

- 운영 사이트: https://baronado-adoption-site-8sm2.vercel.app
- 운영 SHA: `37030e42e762f31e65f863894bad991229396048` (Vercel production READY 조회로 검증)
- 개발 브랜치: `work/meonggo2-next-update-staging-20261119` (운영 SHA 분기)
- 운영 Supabase project ref: `reksykfnutjtfdotidua`
- 운영/개발 분리: `main` 변경 없음, 운영 배포 없음, 운영 DB DDL/DML 수행 없음.

## 읽기 전용 운영 스키마 기준값

2026-11-19에 Supabase SQL SELECT로 조회한 스냅샷 **메타데이터**이다. 이 문서에는 회원 개인정보나 비밀 키, 실제 레코드를 담지 않는다. DB 데이터 복원용 백업 파일이 아니다.

| 항목 | 값 |
|---|---|
| PostgreSQL | 17.6 |
| `public` 일반/파티션 테이블 | 38 |
| `public.go_%` 함수 | 47 |
| `go_%` 제약조건 정의 MD5 | `256895244ed35d87c14e3be00f57919a` |
| 중요 RPC 정의 MD5 | `907b59209b204a229f8782605e9c5029` |
| `go_official_purchases` 건수 | 19 |
| `go_official_daily_draws` 건수 | 3 |
| `go_coin_transactions` 건수 | 42 |
| `go_pvp_records` 건수 | 4 |

주의: 총 건수는 시간이 지나면 바뀔 수 있다. 제약조건/RPC MD5는 **스키마 변경 감지** 용도이며 데이터 복구 수단이 아니다.

### 중요 제약조건 (현재 운영 구조)

- `go_official_daily_draws`: `PRIMARY KEY(member_id, local_day)` → 현재 하루 한 번만 저장 가능. 새 정책 2회에 맞춰 개발 DB에서 마이그레이션을 먼저 설계해야 함.
- `go_official_purchases_coins_check`: `coins IN (200,300)` → 신규 60/100C와 과거 영수증 공존 허용 필요.
- `go_coin_transactions_event_type_check`: 기존 `quest_battle`만 존재 → 매 경기 승리 +3C의 별도 이벤트 설계 필요.
- `go_official_owned`: `PRIMARY KEY(member_id,dog_id,slot)` → 동일 일반 카드는 여러 장 보관하는 구조가 아니며 **기존 능력치 유지 vs 새 능력치 교체** 처리.
- 현재 `go_store_purchase`: 미보유 일반 카드만 추첨하고, 200/300C로 결제. 신규 요구사항인 중복과 전부 수집 이후 구매 처리 불가.
- 현재 `go_official_draw`: 두 집합이 존재하면 중복 40% / 미보유 60%로 처리하고 +10C `quest_draw` 지급. 신규 요구사항은 중복 60% / 미보유 40% + 0C.
- 현재 `go_official_resolve_duplicate`: 회원·날짜로 **하루 1개 무료 뽑기**만 해소. 무료 하루 2개와 유료 구매 각각 처리할 식별자 필요.

## 실제 테스트 환경을 만드는 2가지 방법

### A. 무료 로컬 Supabase/PostgreSQL — 우선 권장

공식 가이드: https://supabase.com/docs/guides/local-development/cli/getting-started

선행 조건:

- Docker 호환 컨테이너 런타임이 설치·실행 중인 PC 또는 개발 VM
- Supabase CLI 설치
- 독립 GitHub 브랜치 체크아웃
- 운영 DB 연결 문자열이나 운영 서비스 역할 키를 로컬 테스트 환경에 주입하지 않음
- **현재 소스 저장소에 최신 2026-11-19 DB 전체 마이그레이션이 포함돼 있는지 반드시 확인**. `supabase/schema.sql`은 오래된 초기 테이블 SQL이며 최신 DB 복원본이 아님.

안전 체크:

```bash
git checkout work/meonggo2-next-update-staging-20261119
node scripts/meonggo2-stage1-preflight.mjs
# 이 검사가 PASS를 출력하는 환경에서만:
supabase start
supabase status
```

`supabase start` 자체는 로컬 컨테이너를 실행하지만, **프로젝트에 필요한 마이그레이션 파일이 빠져 있다면 테스트 DB가 최신 운영 구조와 동일하지 않다.** 해당 경우 스키마 우선 확보/대조가 필요하며 기능 검증을 완료했다고 판단하면 안 된다.

운영 프로젝트에 연결한 상태로 `db push`, `db reset --linked`, `migration up --linked`, `apply_migration`을 실행하지 말 것. 운영 DB에서 테스트용 INSERT/UPDATE/DELETE 금지.

### B. 별도 Supabase 개발 브랜치

- 실제 Supabase `create_branch` 호출은 비용 확인 게이트에서 중단됨.
- `get_cost`로 조회한 시간당 비용은 **0.01344 (응답에 통화 단위 없음)**.
- 사용자가 **해당 금액과 과금 주기를 명시적으로 승인하기 전**에는 생성 금지.
- 기존 Supabase 개발 브랜치 조회 결과: 0개.
- 브랜치 생성 시 마이그레이션만 복사되며 운영 레코드는 자동 복제되지 않음. 더미 계정과 합성 카드 데이터를 이용해 테스트할 것.

## 이 실행 환경에서 실제 확인한 제약

2026-11-19 이 실행 컨테이너의 사전 점검 결과:

| 확인 항목 | 결과 |
|---|---|
| PostgreSQL `postgres` / `initdb` / `psql` | 없음 |
| Docker / Podman | 없음 |
| Supabase CLI | 없음 |
| 외부 DNS 접속 | 사용 불가 (`supabase.com` 해석 실패) |
| 추가 유료 Supabase DB | 비용 승인 전이라 미생성 |

따라서 **이 환경에서는 무료 로컬 Supabase DB를 실제 실행·검증할 수 없다.**

## 1단계 안전 경계 / 완료 조건

- [x] Vercel 운영 배포 SHA 확인
- [x] 운영 SHA에서 독립 GitHub 브랜치 생성
- [x] 운영 Supabase 주요 테이블/함수/제약조건 읽기 전용 분석
- [x] 운영 스키마 기준값·위험 요소 문서화
- [x] 최근 확정 기능/디자인에 대한 인수인계 작성
- [x] 로컬 DB 실행 선행조건 검사 스크립트 작성
- [ ] **독립 Postgres DB를 실제 구동하고 읽기/쓰기 격리 확인**
- [ ] **독립 DB에 최신 구조를 반영하고 필수 테이블·RPC를 실행 검증**
- [ ] 운영 DB의 별도 복구용 백업 가능 여부 확인 (현재 문서의 MD5/건수는 백업 아님)

**1단계는 위 미체크 사항 때문에 완전 완료가 아님.** 기능 구현 및 운영 배포로 이동하기 전에 비용 승인된 클라우드 브랜치 또는 Docker가 있는 환경이 필요함.

## 2단계로 넘어가기 전에 검증할 것

1. 테스트 DB 프로젝트 참조값이 운영 `reksykfnutjtfdotidua`가 **아닌지** 검증.
2. 테스트 DB URL과 운영 URL 비교 검사.
3. 샘플 데이터는 **합성 데이터만** 입력.
4. DB 제약조건·RPC가 최신 기준과 일치하는지 검사 후 마이그레이션 초안 적용.
5. 테스트에서 멍코인 첫 배틀 +10C, 이후 승리 +3C, 구매 60/100C, 무료 하루 2회, 중복 비교/교체의 원자성·재전송 처리를 검증.
6. 모든 단계 기록은 `docs/MEONGGO_2026-11-19_NEXT_UPDATE_HANDOFF.md`에 갱신.

## 참고

- Supabase 공식 로컬 개발: https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase 공식 로컬 작업 흐름: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase CLI: https://supabase.com/docs/reference/cli/introduction
