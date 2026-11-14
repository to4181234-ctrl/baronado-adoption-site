# 바로나도 / 멍멍GO 2.0 — 3차 개발 인수인계 및 출시 전 점검

- 작성일: 2026-11-14
- 개발 브랜치: `feat/meonggo-stage3-friend-pvp-20261114`
- 기반 브랜치: `feat/meonggo-stage2-official-cards-20261114` (HEAD `9408c8f6ec05e64be10a5b40bdbafc01568a5d5a`)
- 기본 운영 브랜치 `main`: **수정 금지**, 운영 Supabase SQL/Storage: **변경 금지**, 사용자 데이터: **보존**
- 배포 정책: 1/2/3차 **전체 구현·통합 검증 및 사용자 승인 후 한 번만 운영 배포**
- 상태: 개발용 코드·DB proposal만 GitHub 기록. 실 Supabase 및 실계정 2대 기기 테스트 대기

## 3차 구현 범위 (S3-01~S3-08)

1. 친구 초대형 두 명 방. 12자리 16진수 코드, 전체 URL 공유·붙여넣기, 30분 내 참가. 방 생성자도 본인 소유 카드 ≥1장 필요. 랜덤 매칭 없음.
2. 실제 각 계정이 카메라 제작 멍카드 또는 공식 사진 1~5 중 **본인 소유 카드 1장** 선택. HIDDEN 해금 일러스트는 배틀 불가. 준비 전에는 상대의 ID·이미지·능력치 전부 비공개. 준비 완료 취소 허용. 참가 후 2분 안에 준비 완료하지 못하면 취소. 초대 종료·30초 넘게 무응답이면 방 취소, 보상/전적 미반영.
3. 실시간성: 2.5초 간격의 **서버 폴링으로 상태 동기화**. 네이티브 websocket/push 사용 아님. 실제 두 기기 지연 및 네트워크 복구 테스트 **필수**.
4. 점수는 `power + charm`만, 속성 상성 없음. 양측 합 같으면 무승부. 판정 및 코인 거래는 한 방 DB 잠금으로 원자 처리. 양측에 같은 결과 반환.
5. 경기 정상 완료 시 두 계정 모두 1회 +10C 일일 PvP 퀘스트. 동일일 여러 재대결도 추가 코인 없음. 일일 퀘스트 3차에서는 돌보기 +10C, 카페인증 +30C, 무료 공식뽑기 +10C, PvP +10C = 최대60C.
6. 양쪽 재대결 승인 시 같은 방에서 다음 라운드로 전환, 양측 카드 재선택. 각 완료 라운드 독립 W/L/D 저장.
7. 계정별 누적 승무패, 본인 최근 20경기(상대 닉네임, 날짜·점수). 상대에게는 전적 총계만 노출. 공개 순위표 없음. 원본 카메라 카드 삭제해도 완료된 전적·점수 스냅샷 영구 유지.
8. 기존 Figma 카드 구조, 4.28초 충돌 스프라이트, 효과음/진동을 재사용. 기존 `GoBattle.js` 게임은 플래그 OFF에서 계속 유지. 새 초대/대기/선택 UI 영역만 국소 스타일 적용.

## 변경 파일

- DB proposal **절대 운영에 적용하지 않음**: `supabase/proposals/meonggo_stage3_pvp_REVIEW_NOT_APPLIED.sql`
- 사설 테이블 `go_pvp_rooms`, `go_pvp_rounds`, `go_pvp_records`, RLS/REVOKE 전원 + 서비스롤만
- RPC `go_pvp_create`, `go_pvp_join`, `go_pvp_snapshot`, `go_pvp_action`, `go_pvp_has_card`, `go_pvp_card_snapshot`
- `app/api/go/pvp/route.js` 인증/멱등성/방 접근 검증, 개인 이력, 선택 목록, 초대방 state
- `components/GoFriendBattle.js`, `components/GoFriendBattle.css` (유저 인터페이스 + 원본 충돌 애니메이션 재사용)
- `components/GoBattle.js` 플래그 분기 (기존 배틀 완전 보존)
- `lib/goPvpRules.js`, `lib/goPvpInvite.js`: 순수 계산/초대 정규화
- `components/GoQuests.js`, `components/GoCoins.js`, `app/api/go/coins/route.js`: 네 번째 퀘스트, 일일 원장
- 테스트: `tests/go-pvp-rules.test.mjs`, `tests/go-pvp-invite.test.mjs`, `tests/go-stage3-postgres.sql`, `tests/go-stage3-concurrency.sh`, `tests/e2e/go-stage3.spec.mjs`, `tests/playwright-stage3.config.mjs`, `tests/fixtures/go-stage3-postgres.sql`
- CI: `.github/workflows/meonggo-stage3-checks.yml` (일회용 PostgreSQL17에서 1차+2차+3차 SQL 및 동시 READY 검증, 단위·Next 빌드·2브라우저 E2E)

## 기능 플래그 (기본 OFF)

```
MEONGGO_STAGE1_COINS_ENABLED=1
MEONGGO_STAGE2_OFFICIAL_ENABLED=1
MEONGGO_STAGE3_PVP_ENABLED=1
NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED=1
NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED=1
NEXT_PUBLIC_MEONGGO_STAGE3_PVP_ENABLED=1
```

프론트 `NEXT_PUBLIC_*`는 빌드 시 고정되므로 재빌드 필요. 1차와 2차 SQL/비공개 Storage가 개발용 Supabase에서 준비되지 않으면 3차만 켜도 정상 작동하지 않음.

## 점검 항목 및 남은 출시 게이트

- 운영 **DB·운영 카드·입양 데이터·기존 관리자 디자인** 변경 0건.
- 자동 CI: 일회용 PostgreSQL SQL 감사·동시 READY·퀘스트 멱등성, Node 규칙, Next 통합 build, 390px Playwright 다중 브라우저 (최신 GitHub Actions 상태 확인 필수).
- 실제 개발 전용 Supabase DB/스토리지에 단계별 적용 후 서비스롤 API·이미지 서명·실계정 권한·타인 방 접근 차단·두 기기 시간차 및 브라우저 백그라운드 재접속 검증이 **별도로 필요**. 이번 단계는 운영 Supabase 데이터에 직접 실행하지 않음.
- Figma 원본 프레임 및 옆 메모의 정확한 텍스트/터치영역/레이아웃에 대한 픽셀 단위 수동 비교가 출시 전 필요.
- 운영 데이터 백업과 롤백 계획 작성·사용자 최종 승인 후 **단일 운영 배포**. Draft PR은 승인 전 병합 금지.

개발 상태 관리: [구글 시트](https://docs.google.com/spreadsheets/d/1TxslDiAhIAYSDe_GAMPJs0vFHQxyaILK-UsfWmgd314/edit). 2차 [Draft PR #11](https://github.com/to4181234-ctrl/baronado-adoption-site/pull/11). 3차는 2차 브랜치에 대한 독립 Draft PR로 제출.
