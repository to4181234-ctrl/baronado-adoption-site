# 멍멍GO 2.0 — 4차 Figma 재대조·구매 정책·관리자 최종 수정 검증
2026-11-17 / 작업 브랜치 `work/go2-stage4-20261117` / **운영·main·Supabase 변경 없음** / 5차 아직 시작하지 않음

## 먼저 읽을 결론
사용자가 제공한 원본 `https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=558-607838`과 주석 `617:163533`을 직접 읽고 이전 4차의 **잘못된 300C 상품 정책**과 화면 레이아웃 및 관리자 클릭 오류를 수정했다. 이 문서가 이전 `go2-stage4-20261117.md`의 "강아지+번호 지정 300C" 설명보다 우선한다. 4차 코드는 격리 환경에서 108/108 단위 테스트 및 프로덕션 빌드 통과, 실제 브라우저 모의 API E2E와 독립 PostgreSQL 결제 검증 통과. 2~5차 최종 운영 통합 마이그레이션·실제 회원/Storage E2E는 **아직 실행하지 않음**.

## Figma 정책 확정 및 수정
- Figma 상품명 `카드 랜덤 뽑기`: **200 멍코인**, 모든 대상 멍멍이의 미보유 일반카드(1~4) 중 무작위 1장. 강아지/번호 지정 불가.
- Figma 상품명 `카드 지정 랜덤 뽑기`: **300 멍코인**, **강아지만 선택**, 해당 강아지의 미보유 일반카드(1~4) 중 무작위 1장. **카드 NO. 직접 선택 불가**. 이전 4차의 슬롯까지 지정한 구현은 틀렸으며 이 브랜치에서 완전히 제거.
- HIDDEN NO.5는 상점 구매·랜덤 지급 불가, 4종 획득 뒤 사용자가 직접 해금. 입양완료/중지/이미보유 카드 제외. 대상 0개는 코인 차감 없이 실패.
- Figma 주석 `617:163533`: 제품 탭 → (300C에 한해) 강아지 선택 → 픽셀 목줄 선택 '하나 고른다' → 마지막 확인 '네' → **서버가 잔액 및 보유 재확인 후 원자 차감/지급** → 카드 공개/스킵. '네' 전에 닫기·도망간다·아니오 무료 취소, 서버 확정 후 스킵은 환불 아님.
- `lib/goStore.js`: `mode:'specific',dogId` 검증하되 `slot` 입력 거부, 선택 가능한 강아지 집계. `components/GoStore.js`: 원본 카드 누르면 구매 동선 바로 진입, 300C는 강아지 모달 다음 목줄로; 서버에는 NO. 전달하지 않음. 기본 카드 구매 결과/영수증 조회는 회원·SKU 일치 검증; 레거시 200C 영수증 오인 복구 차단.
- `docs/sql/stage4-store-200-300-DRAFT.sql`: 기존 영수증 `purchase_mode` 보존, `go_store_purchase`의 300C 로직을 선정 강아지의 현재 공개 세트 미보유 1~4 슬롯에서 `ORDER BY random()`으로 변경. 지갑 `FOR UPDATE`, 동일 요청 UUID 재호출 추가 차감 0, 다른 회원/강아지/모드 요청 불허. **운영 미적용**.
- `app/api/go/store/route.js` GET은 소유자 영수증에 `purchase_mode`를 포함하고, 브라우저 복구는 기존 요청의 가격·방식·강아지와 일치하는 경우만 성공 표시.

## Figma 558:607838 화면 대조 (390px 화면, 실제 Playwright CSS bounds)
- 헤더: y0, h42; 상점 본문은 별도 2차 멍멍GO 내비게이션 없이 Figma 상점 전용 배치.
- `← 돌아가기` x12 y46, `스토어` 제목 x16 y75 (Figma 제목 y77 부근).
- 사용자 원본 390×225 SVG 애니메이션 사용, 상점 일러스트 영역 y89, 원본 픽셀 재작업/대체 없음.
- 말랑이 픽셀 대화창 **x16 y263 w357 h80**. 기존 근사 CSS 테두리를 제거하고 Figma 프레임 `558:607976`의 **panel-background/outer-pixel-border/inner-pixel-border SVG 3개를 직접 추출·로컬 보존** (`public/meonggo/store/dialogue-{bg,outer,inner}.svg`). 세 정적 자산 모두 브라우저 실제 로드 확인. 이름·대사 Figma 그대로.
- 랜덤 카드 **x17 y374 w166 h265** / 지정 랜덤 카드 **x206 y374 w166 h265**, 카드 제목 y654. 도감에서 사용 중인 정확한 `LockedOfficialCard`, `CARD_FACE.frame`, 프로젝트 내 Pretendard/MonaS12/Galmuri 서체 재사용.
- 320/390/430px 브라우저 전부 `documentElement.scrollWidth <= innerWidth`, 페이지 JavaScript 오류 0. 320px는 동일 카드 비율로 축소, 430px는 원본 390px 콘텐츠 중앙 배치.
- 주의: 브라우저 DOM의 주요 수치·정적 자산 로드는 확인했으나 전 페이지를 픽셀별 이미지 차이로 계산하는 라스터 diff는 하지 않았다. 이 검증을 "모든 픽셀 완전 동일"이라고 주장하지 말 것. 실제 애니메이션과 라이브 코인값은 샘플 Figma 정지 상태와 다를 수 있다.

## 관리자 추가 검증 및 수정
- `app/admin/go/official/page.js`: Figma 4개 일반+HIDDEN 1개, 기존 사진 업로드/수정안/5종 일괄 게시/게시 중지·재공개/기록 있는 세트 삭제 금지 기능 재사용.
- 새로 발견한 치명적 UI 문제: 전역 `.go-card-graphic{position:absolute}` 규칙이 관리자 카드 미리보기를 화면 위에 올려 **2번 이후 등록 슬롯 버튼의 클릭을 가로막음**. `app/figma-stage4-admin.css` 신설, 5슬롯 grid와 미리보기 SVG position:relative를 적용해 해결.
- 추가로 `app/api/admin/go/official/route.js`의 사진 파일 재업로드 시 기존 **임시 수정안**의 오래된 Storage 파일 쌍을 새 경로 포인터 저장 **이후**에만 제거하도록 개선, 공개본 덮어쓰기 금지. 원본 이미지 개인 버킷 보존, 임시 수정안인지 서버에서 확인, JPG/PNG/WEBP 용량 5MB 검사.
- `tests/go-stage4-admin-images.test.mjs`: Sharp 실이미지에 대해 일반 536x528 WebP / 히든 PNG 변환, 임의 crop/zoom 경계, 파일경로 랜덤화/이전경로 미덮어쓰기 확인.
- Playwright 브라우저 모의 관리자 API에서 **5개 슬롯을 하나씩 실제 파일 input 선택·저장** 테스트. 4개 이하는 게시 버튼 비활성, 5개 후 활성, 게시 요청 성공→화면 공개 중, 공개 중지→화면 공개 중지; 가로넘침/JS 오류 없음.
- 한계: 이는 이미지 처리를 Sharp로 실실행하고 관리자 API 화면을 모의 응답으로 검증한 것이며, **실제 운영 Supabase Storage에 업로드·공개·삭제한 테스트는 아님**. 운영 데이터 보호를 위한 의도적 분리. 최종 통합 시 격리 Storage 서비스로 서버/API 풀 E2E 검증 후 운영 승인.

## 검증 증거
- 최신 구현 커밋(이 문서를 만든 시점의 이전 코드): `cf2b6b9`을 새로운 독립 Vercel Sandbox에 체크아웃; `npm ci`, **Node 108/108 PASS**, `NEXT_PUBLIC_MEONGGO_STAGE4_STORE_ENABLED=1` 포함 전체 Next.js 16.4.3 build PASS.
- 격리 PostgreSQL `stage4fixqa`에서 업데이트 SQL을 **실제 적용**. 독립 테스트 트랜잭션 PASS: 강아지 지정 300C는 해당 개의 미보유 슬롯 2/3/4 중 랜덤, 동일 요청 재시도시 **동일 슬롯·0C**, 같은 요청 ID 다른 강아지/모드 거부, 슬롯 직접 지정 거부, 해당 강아지 수집 완료면 **0C**, 모든 강아지 랜덤 200C 정상, 레거시 영수증 재사용 차단, HIDDEN 0건, 거래 원장 건수 일치.
- Playwright 최종 320/390/430px 모바일 모의 응답: Figma 정적 요소 배치, 원본 프레임, 원본 말랑이 대화창 SVG 자산 3개 로드, 사용자가 카드 직접 누르기→(300C 강아지 선택)→목줄 고르기→최종 확인 전 취소는 구매 POST 0회→재확인 후 300C 결제는 `{mode:'specific',dogId,requestId}` **slot 없음**, 별도로 200C 결제는 `{mode:'random',requestId}`, 구매 후 SKIP에도 보유 상태/차감 유지. 모든 화면 JS 오류 없음.
- 관리자 Playwright 390px: 5 슬롯, 실제 이미지 파일 input, UI 게시 게이트/게시/중지 상태, JS 오류 없음.
- 원본 상점 애니메이션 SVG 파일은 이전 4차 인수인계 문서의 해시값을 그대로 유지하며 추가 수정·재생성하지 않음.

## 다음 작업자 필수 지침
1. 이 **교정 보고서가 `docs/releases/go2-stage4-20261117.md`의 이전 300C '카드 번호도 선택' 내용보다 우선**한다.
2. 리뷰 PR #16 미병합. `main`, 운영 Vercel, 운영 Supabase 데이터/Storage를 건드리지 않는다.
3. 단계 2(4+1)→단계 3(돌보기)→단계 4(강아지 지정 랜덤 300C) SQL 순서 및 5차 PvP 배틀 스키마와의 충돌을 최종 통합에서 점검한다.
4. 저장된 original SVG/폰트/픽셀 목줄·Figma 프레임을 임의 교체하지 않는다. 최종 실서비스 배포는 모든 차수 통합 검증 후 사용자 명시 승인 시에만 시행한다.
