# 바로나도 · 멍멍GO 2.0 추가 업데이트 — 4단계 자동 통합 검증 보고서

- 기준일: 2026-11-19 KST
- 검토용 코드 브랜치: `work/meonggo2-next-update-staging-20261119`
- 이전 운영 기준 커밋(인수인계 기준): `37030e42e762f31e65f863894bad991229396048`
- 최종 자동 CI 검증 성공 커밋: `382b60e54b4ec709767033b8b7e87fc196486bb9`
- 성공 워크플로: https://github.com/to4181234-ctrl/baronado-adoption-site/actions/runs/44516418923
- 상태: **자동/합성 DB 검증 통과**, **실기기/실제 Supabase 호환 검증·출시 승인 미완료**, 운영 배포 금지
- 운영 Supabase DB, GitHub `main`, 운영 Vercel, Figma 원본: **이 작업으로 수정하지 않음**
- 유료 Supabase 테스트 브랜치: 생성하지 않음 (사용자가 비용 지출 거절)

## 1. 이번 4단계에 새로 반영한 파일

- `.github/workflows/meonggo-next-update-stage4-qa.yml`: GitHub Actions ephemeral PostgreSQL 18 + Node 22 자동 QA. **모든 테스트 실패 시 CI 실패**로 처리하며, 별도 합성 DB SQL 실행 및 Next.js flags ON/OFF 빌드/로컬 URL 검사.
- `docs/sql/MEONGGO_NEXT_ECONOMY_DRAFT.sql`: PostgreSQL에서 오류였던 오래된 API 호환 RPC의 두 개 잘못된 dollar quote 및 마지막 `$function$` 세미콜론 보정. **여전히 검토용 SQL DRAFT이며 운영 적용 금지**.
- `tests/fixtures/go-next-economy-assert.sql`: 무료 뽑기 2회와 3회째 차단, 동일 요청 재생, 빈/완성 도감 분기, 중복 능력치 keep/replace, 60C/100C 구매, 구매 재전송, 잔액 부족, 기존 300C 영수증, 최초 10C·후속 승리 3C, 코인 지갑/원장 정합성을 합성 회원으로 검증.
- `scripts/verify-go-next-economy-concurrency.sh`: 원격 DB에 접속하지 않는 GitHub CI 전용 테스트. **동일 무료 추첨 8개 동시 요청, 동일 첫 경기 8개 동시 요청, 서로 다른 후속 승리 8개 동시 요청**을 보내 1회 발급과 10C + 8×3C = 34C(원장과 지갑 동일)를 검사.
- 구 기획으로 고정되어 실패하던 9개 회귀 테스트를 최신 확정사항(도감 독립 무료 추첨, 60/100C, 소장 카드 중복 추첨 허용, 1:1 READY 명시적 서버 확정, 노란 카드 배경 및 외곽 금색 테두리 없음, 퀘스트 3종)으로 개정. 기존 유효 기능 확인 항목은 그대로 보존.

## 2. 확인된 자동 테스트 (성공 CI: 44516418923)

| 검증 내용 | 관찰 결과 |
|---|---|
| 최신 경제 규칙·Figma UI 계약 Node 테스트 | **17/17 통과, 실패 0** |
| 전체 기존+신규 Node 회귀 테스트 | **266/266 통과, 실패 0** |
| 이전 2~5차 SQL, 복구·배포 전 SQL 마이그레이션 | PostgreSQL 일회성 합성 DB에서 두 번 적용 및 기존 테스트 통과 |
| 신규 경제 SQL 초안 컴파일·반복 적용 | PostgreSQL에서 **2회 실행 성공** |
| 신규 경제 SQL 실제 호출 | 무료 횟수·중복 처리·가격·보상·영수증·지갑/원장 동작 검증 통과 |
| 동시성 재요청 검증 | 8+8+8개 병행 호출에서 중복 거래·카드 지급 없음, 잔액 일치 |
| Next.js `npm ci`, 전체 빌드 | feature flags ON / OFF **모두 성공** |
| 로컬 Next.js HTTP smoke | /go, 배틀, 퀘스트, 관리자 주요 URL HTTP 검사 통과 |

주: 테스트 결과의 **266개 전체 검사에는 17개 집중 검사가 포함**되어 있음. 283개의 고유 테스트로 오해하지 말 것.

## 3. Figma 직접 대조 범위

2026-11-19 연결 Figma 원본 두 프레임을 다시 렌더링하여 확인함:

- 내 도감 690:289241: `랜덤 멍카드 뽑기 >` 독립 NEW, `1일 2회 한정 무료`, 아래 기존 퀘스트 연결 및 도감.
- 스토어 692:289316: 기존 2열 상품 배치, 노란 물음표와 연두 실루엣, 60·100 멍코인, 말랑이 원본.
- 새 브랜치의 텍스트/코드 구조는 위 원본과 사용자 마지막 수정 지시를 따름.

**중요 제한:** Figma 스크린샷을 읽은 것이며 로컬 Next.js를 실제 브라우저로 캡처하여 픽셀 1:1 비교하거나 iPhone Safari 터치를 실측한 것은 아님. UI 완료를 검증했다고 보고하지 말 것.

## 4. 자동 테스트 밖의 출시 차단 항목

1. **실기기/브라우저 QA**: 320px/390px Safari·Chrome 화면, 카드 클릭·목줄 10% 확대·0.7/0.95초 모션, 스크롤/여백 실제 렌더와 Figma 비교.
2. **실시간 PvP 두 계정 QA**: 방 생성→카드 선택만으로 READY 색상 불변→서버 READY 한쪽/양쪽 노랑→동시 공개→리매치, 충돌 시 viewport 흔들림 및 네트워크 재연결.
3. **실제 Supabase 기능과의 환경 호환**: 합성 PostgreSQL과 운영 Supabase의 스키마·확장·권한·RLS·SQL 함수 차이를 배포 전 별도 검증. 운영에 시험 INSERT 금지.
4. **추가 장시간/확률 QA**: 한국 자정 경계에서 실제 응답·동시 클릭, 실배틀 수백 회/장기 코인 원장, 60:40 표본, 숨김 카드·입양 완료/미공개 상태 회귀 검사.
5. **백업·롤백**: 운영 DB 최신 시점 백업과 복원 가능성 확인이 아직 안 됨. **운영 백업 검증 없이 SQL 적용하거나 서비스를 배포하면 안 됨.**
6. **승인**: 사용자 명시 승인 없이는 운영 DB DDL/DML, `main` merge, Vercel production 배포 금지.

## 5. 실행/복구 기준

- 작업 소스는 위 GitHub 브랜치에만 있다. 처음부터 1~3단계를 다시 구현하지 않음.
- 검증 명령: `node --test tests/*.test.mjs`, `bash scripts/verify-go-integration-local.sh go_integration_nextqa` (사전 로컬 합성 DB 준비 필수), `psql ... -f docs/sql/MEONGGO_NEXT_ECONOMY_DRAFT.sql`, `psql ... -f tests/fixtures/go-next-economy-assert.sql`, `bash scripts/verify-go-next-economy-concurrency.sh go_integration_nextqa` (GitHub Actions 임시 DB만), `npm run build`.
- DB와 API 프런트 변경은 묶어서 배포해야 한다. 릴리스 전 구형 클라이언트 호환성과 롤백 방식 서면 확인.
- 현재 **운영 시스템에서 이 업데이트를 사용 중이라고 해석하면 안 됨**; 검토 브랜치 기능과 실제 운영 기능을 구분할 것.

### 4단계 판정

**자동 코드·PostgreSQL 합성 환경 검증: 통과. 실기기·실운영 호환·백업 및 최종 배포 검증: 미완료.** 따라서 4단계의 자동화 부분은 완료됐지만 **운영 출시 승인 상태는 아님**.
