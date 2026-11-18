# 멍멍GO 4차 — 공개 프로필 A~D 코드 복원 (검토본)

기준: 3차 최종 ZIP `baronado-meonggo-stage3-code-restoration-20261118.zip`의 `source/`.
피그마 승인: 보드 `646:163491`, A `646:163494`, B `646:163587`, C `646:164130`, D `646:164641`.

## 실제 구현
- 기존 `/go/recorders/[id]`에 승인된 공개 프로필 홈, 강아지별 공식 카드, 공개한 나만의 카드, 공개 카드·전적 없음 상태 연결.
- 기존 GoShell/SiteHeader, MonaS12, 기존 개별 강아지 PNG, 기존 카드 프레임·픽셀 패널 SVG 사용. 새 UI/스타일은 `s4-` 접두어로 공개 프로필에 격리.
- 프로필 주인의 닉네임/소개/대표 캐릭터, 공개 도감 진행도, 공개 보유 카드 수 표시. 이용자 자신의 기존 헤더 지갑은 그대로 유지.
- 타인용 프로필에서 촬영, 해금, 선택삭제, 편집, 수집, 돌보기, 결제, 원장/설정 UI 미노출.
- 공개 API는 승인된 `go_cards.status='approved'`와 공식 보유 `go_official_owned`/`go_official_hidden`만 사용. 개별 공식 사진은 보유 슬롯에 한해 서명 URL 생성. 숨김/비공개 카드 정보 제외.
- 강아지별 PvP 전적은 `go_pvp_records.dog_id`가 있는 경우에만 무제한 누적 `count:'exact'` 집계. 없으면 '공개 전적을 확인할 수 없어요' 표시 (전적 0을 조작하지 않음). 이전/다음 페이지.
- 나만의 공개 카드 정렬/페이지당 12장. 공식 NO.1~4/HIDDEN NO.5 및 잠금/실제 공개 카드 시각화. 보유한 HIDDEN은 점수 0의 가짜 카드가 아니라 원본 특별 일러스트만 표시. 보유 이미지가 누락되면 미보유 카드로 오표기하지 않고 불러오기 실패 안내.

## 변경 파일
- `app/api/go/recorders/[id]/route.js`
- `components/GoRecorder.js`
- `app/figma-stage11-public-profile.css` (신규)
- `app/layout.js`
- `tests/go-stage4-public-profile-restoration.test.mjs` (신규)
- `docs/restoration/STAGE4-HANDOFF.md` (신규)

## 점검 결과
- 4차 신규 표적 테스트 5/5 통과, 이전 2·3차와 결합 표적 테스트 18/18 통과.
- 전체 Node 131개 중 123개 통과, 8개는 외부 의존성 모듈 부재로 로딩 실패. 전체 통과로 해석 금지.
- TypeScript transpileModule JSX/JS 구문 진단 없음 (검사한 3개 변경 JS 파일).
- Node 서버 API 요청·Supabase 스테이징 통합·Next.js 빌드·320/390/430px 실제 화면 렌더·OAuth 검증은 **미실행**. 마지막 Work 환경에서 수행.

## Work 환경 검증 전 차단/미결
1. 3차 `docs/restoration/stage3-last-card-pvp-DRAFT.sql`은 실제 DB 미적용. **격리 DB에서 마이그레이션/전적 정합성 검증 전 배포 금지.** 공개 전적은 이 컬럼의 존재 여부에 따라 unavailable로 표시될 수 있음.
2. 기존 랜덤 배틀 `go_battles`는 출전한 카드의 주인과 강아지 관계 확인 없이 상대 강아지까지 합산하면 오집계 위험. 따라서 이 4차의 공개 전적은 식별되는 친구 PvP만 집계하며, 모드 통합 집계 기준을 임의 추가하지 않음. 최종 정책 확인·DB 검증 필요.
3. 실제 개인정보 비노출·공식 보유 이미지 서명·공개 승인 상태 변화 및 카드 삭제 이후 카운트는 격리 DB에서 다계정 테스트 필수.
4. 피그마 네 화면과의 픽셀 수준 비교/320·390·430px 브라우저 검증 미실행. 공개 프로필 화면을 각각 390px에서 대조해 차이 수정 필요.

운영 사이트, 운영 DB·Storage, GitHub `main`, 생산 배포·실회원·코인은 이 작업에서 일절 변경하지 않음.
