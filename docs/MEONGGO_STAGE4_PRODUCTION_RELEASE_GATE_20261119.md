# 멍멍GO 2.0 4단계 운영 배포 게이트 — 2026-11-19

## 2026-11-19 후속 확인: 사용자 로컬 백업 확보 (기존 배포 게이트 갱신)

이하 기록은 사용자가 Windows PowerShell 출력으로 직접 확인·공유한 **로컬 백업 생성 증거**다. 본 GitHub 문서나 저장소에는 DB 원본, 이미지 파일, ZIP, 계정 비밀정보를 업로드하지 않았다.

- 운영 프로젝트 ref: `reksykfnutjtfdotidua`; CLI v3.2.0 `db dump --remote` 실행 후 아래 4개 SQL 생성 확인:
  - `roles.sql` 297 B
  - `schema.sql` 164,140 B
  - `data.sql` 1,028,455 B
  - `auth_storage_data.sql` 122,616 B (`--schema auth,storage --data-only`)
- Storage 객체별 로컬 파일 다운로드 결과:
  - `dog-images` 82개
  - `go-cards` 94개
  - `go-official-cards` 50개
  - 합계 226/226 (당시 운영 Storage 객체 총수와 일치)
- 사용자 PC에서 `MeongGO_Backup_20261119.zip` 생성 후 `tar -tf ... | measure` 결과 **241개 ZIP 엔트리** 확인. 디렉터리 엔트리를 포함하는 수치이며 ZIP 내용의 모든 바이트 무결성 검증이나 실제 DB 복원 성공과는 구별한다.
- `data.sql` 추출 시 `go_official_sets` / `go_official_versions` 간 순환 FK 복원 경고가 있었으므로 **복원 시 제약·트리거 처리와 검증 필수**.
- 후속 읽기 전용 운영 점검: `go_members` 21명, `auth.users` 0명(이 서비스는 독립 회원 테이블 사용), `go_coin_transactions` 42건, `storage.objects` 226건. `go_draw_attempts`, `go_battle_reward_claims`는 현재 운영 DB에 존재하지 않음.
- 별도 로컬 테스트 폴더 생성했고 사용자 PC Docker Engine 29.9.3 작동을 확인했으나 **SQL/Storage 독립 복원 및 실제 엔드투엔드 로컬 운영 검증은 미완료**.

**게이트 현황**: 최신 운영 SQL+Storage 파일의 사용자 측 백업 확보 항목은 완료로 수정. 실제 복원 테스트, 운영 스키마/권한 호환 확인, 2계정 PvP/모바일 실측은 미완료. 그전까지 신규 경제 SQL 운영 적용 / 프로덕션 alias 전환 / `main` 통합은 보류. 백업 ZIP은 민감한 회원 정보 및 원본 사진을 포함할 수 있어 공개 GitHub 또는 퍼블릭 URL에 올리지 않는다.

---


## 승인과 목표

- 사용자가 2026-11-19 운영 배포를 요청함. 운영 대상은 Vercel `baronado-adoption-site-8sm2` (`prj_jc3UqgH4jR1lqAFHYRuClziq6DzY`).
- Supabase 운영 프로젝트: `reksykfnutjtfdotidua` (조직 Free 플랜, Postgres 17, ACTIVE_HEALTHY).
- 릴리스 소스: `work/meonggo2-next-update-staging-20261119` commit `b72e2e7425d7150800355a9c8c75b73b9f51201e`.
- 기존 실서비스 production 커밋: `37030e42e762f31e65f863894bad991229396048`.
- 이 브랜치는 기존 production 코드보다 56개 커밋 앞서 있으며 뒤처진 커밋은 0개. `main`은 분기되어 있으므로 **무조건 main fast-forward/강제 푸시 금지**.

## 실행 완료: 안전한 사전 준비

- 최신 소스의 GitHub Actions full CI 성공 (모든 266개 Node 테스트, 주요 17개 집중 검증, 기존+신규 합성 PostgreSQL SQL, 8+8+8 동시 요청, flags on/off Next 빌드, HTTP smoke): https://github.com/to4181234-ctrl/baronado-adoption-site/actions/runs/44516890529
- 같은 소스의 **Vercel preview** 생성 및 `READY` 확인:
  - Deployment ID `dpl_JBTC4Y8ydGCQm7BEY1dmYrnyTZ2S`
  - https://baronado-adoption-site-8sm2-ba7r8ct3p-rhdbsdk.vercel.app
  - Alias https://baronado-adoption-site-8sm2-git-work-meonggo2-ne-9fcd40-rhdbsdk.vercel.app
- Vercel production의 플래그 Stage1/2/4/5 활성화, 기존 ADMIN_AUTH_MODE=shared_link 확인. 변수 비밀 값은 조회/노출하지 않음.
- Supabase read-only 생산 환경 SQL 메타데이터 확인: 회원 21, 개인 카드 55, 공식 보유 26, 구형 무료 추첨 3, 미해결 기존 중복 0, 기존 구매 19, 코인 지갑 4, 거래 42, PvP 기록 4, 랜덤 배틀 55, 공개 조건 충족 공식 강아지 5. 운영 DB 크기 약 17 MB.
- 신규 경제 테이블 `go_draw_attempts`, `go_battle_reward_claims`는 **운영 DB에 아직 없음**. 기존 SQL 함수 시그니처 검사 완료.
- User project and primary Vercel domains were not changed.

## 출시 중단 사유

**운영 DB의 최신 전체 논리 백업 및 독립 복원 성공 증거가 없음.** Supabase 조직 플랜은 Free이며 무료 플랜은 자동 데이터베이스 백업을 제공하지 않는다. 기존 기록의 Storage 실제 원본 백업·복원도 확인되지 않았다.

Supabase 문서:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/deployment/going-into-prod

Stage4 SQL이 거래/카드 레코드 보존을 목표로 설계되고 합성 DB 검증을 통과했더라도 실제 운영 DB 마이그레이션·새 클라이언트 기능 사용에는 리스크가 있다. **복원 수단이 검증되기 전에는 운영 SQL 변경, 프로덕션 도메인 전환, main merge를 하지 않는다.**

## 배포 재개 시 체크리스트

1. 사용자 환경에서 **운영 Postgres 전체 logical dump**를 생성해 운영 시스템 외부에 보관한다. Supabase는 Free 플랜에 대해 Supabase CLI `db dump`를 권장한다. 토큰/DB 비밀번호를 채팅·GitHub 공개 저장소에 붙여넣지 말 것.
2. Storage 객체의 실제 바이너리 파일을 기존 bucket의 경로·개수와 함께 별도로 백업한다. DB dump는 Storage 객체 자체를 포함하지 않는다.
3. 별도 폐기 가능한 환경에 두 백업을 복원해 사용자·카드·코인·이미지 접근을 확인한다. 비용 있는 Supabase 테스트 프로젝트/브랜치는 사용자의 비용 승인 없이는 만들지 않음.
4. 검증 후, 배포 중 프로덕션 쓰기 중단/정합성 점검 창을 마련하고 `docs/sql/MEONGGO_NEXT_ECONOMY_DRAFT.sql`을 승인된 실제 migration으로 확정하여 적용한다. Postgres 17 운영 스키마와 Postgres 18 합성 픽스처 차이를 검토할 것.
5. DB 마이그레이션 직후 신규 RPC 함수·테이블 grant·RLS·이전 거래·신규 트랜잭션 스모크 검증을 수행한다.
6. 새 커밋을 운영 Vercel 프로젝트에 production deployment 후 검증하고 도메인 별칭 이동을 확인한다. rollback 기준: `dpl_421Daw6NHdnqkBdn5JK2q2yjqJTm`. **Vercel 코드 롤백만으로 DB 변경을 되돌리지 못한다**는 점을 확인한다.
7. 모바일 Safari 등 실사용, 두 계정 PvP/기존 카드·사진, 관리자 공유 링크 동작을 점검한다.
8. `main`은 현재 분기 상태이므로 GitHub PR에서 충돌·diff·CI를 확인한 뒤 별도로 안전하게 통합한다.

## 최종 상태

- **READY:** 최신 소스 preview, CI, 단순 구문/합성 경제 SQL 검증
- **BLOCKED:** 운영 DB/Storage 백업 및 실제 복원 검증 부재
- **NOT DONE:** production DB migration / Vercel production promotion / GitHub main merge
