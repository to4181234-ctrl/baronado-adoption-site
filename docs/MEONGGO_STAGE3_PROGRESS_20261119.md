# 멍멍GO 2.0 — 3단계 Figma 디자인·배틀 UI 수정 보고서

작성: 2026-11-19 (Asia/Seoul)  
상태: **GitHub 개발 브랜치에 3단계 UI 코드 반영 / 정적 계약 테스트 7개 통과 / Next.js 빌드·실제 모바일 화면 검증 미완료**

## 0. 변경 절대 우선순위와 보호 범위

- 기준 운영 Vercel commit: `37030e42e762f31e65f863894bad991229396048`
- 작업 브랜치: `work/meonggo2-next-update-staging-20261119`
- 최신 확정 의사결정 > Figma 디자인 중 변경되지 않은 부분 > 기존 운영 코드.
- Figma 원본 파일 **수정하지 않음**; 원본 디자인 노드 두 개를 직접 읽고 자산만 개발 소스에 재사용.
- 운영 Supabase **읽기/쓰기 변경 없음**; 운영 사이트 배포 없음; `main` 변경 없음.
- **중요:** 2단계 SQL은 독립 DB에서 실행/검증되지 않은 초안이고, 이번 프론트 코드도 새 RPC와 연결된다. 그 상태로 바로 운영 배포하지 말 것.

## 1. Figma 원본에서 실제로 읽은 기준

- 내 도감 `690:289241`: https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=690-289241
  - `랜덤 멍카드 뽑기 >` / `1일 2회 한정 무료`를 첫 NEW 영역에 배치, 아래에 기존 `오늘의 멍코인 퀘스트 보러가기 >` 영역.
  - 390px 화면에서 첫 NEW y284 / 제목 y308 / 설명 y337 / 구분선 y382. 두 번째 NEW y394 / 제목 y418 / 설명 y447 / 구분선 y492.
- 스토어 `692:289316`: https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=692-289316
  - 상품 프레임 **166×265px**, x=17 및 x=206, y=374. 제목 y=654, 설명 y=675, 가격 y=721.
  - 왼쪽 미리보기 이미지 배경 원본 색상 **#FEF4BA**(노란색), 중앙 `?` / 오른쪽 이미지 배경 **#DDE9C2**(연두색), 강아지 실루엣.
  - 오른쪽 실루엣은 Figma 노드 `692:289657` 안의 **원본 VECTOR**를 SVG로 export해서 프로젝트에 보존함. 원본 좌표 parent (35,43) + child (18.17578,26.98828), 실루엣 약 57.46×55.26px. 새로운 그림을 임의 제작하지 않음.
  - 화면 가격 60C/100C, 폰트 11px **Bold**. 나머지 기존 상점 일러스트와 말랑이 대화창 유지.
- 실시간 1:1 READY 위치는 사용자가 **운영 레이아웃 참고 이미지에 직접 빨간 선으로 지정한 위치**가 우선. 현재 프런트 실제 markup `friend-pvp-room-head`와 `friend-pvp-participants` 사이에 배치.
- 카드 선택 노란색은 사용자 스크린샷의 내 도감 선택 배경 기준 **#f8dc65**를 양쪽에 동일 적용; 외부 황금색 사각 테두리는 삭제.

## 2. GitHub 변경 파일

| 파일 | 실제 수정 |
|---|---|
| `components/GoPage.js` | 내 도감 프로필 다음에 독립 무료 뽑기 NEW 항목 삽입, 기존 퀘스트는 아래에 유지; 로그인 여부 확인, 무료 뽑기 닫은 뒤 도감 새로 고침 |
| `app/meonggo2-stage3-ui.css` | Figma 110px 바로가기 스타일, 스토어 가격 11px Bold, 목줄 확대, 뽑기 모션, READY 상태, 카드 선택, 배틀 화면 흔들림 방지 |
| `app/layout.js` | 다른 CSS 이후 새 3단계 스타일 마지막 import |
| `components/GoStore.js` | Figma 제품별 미리보기(전체 랜덤 노란 물음표 / 지정 랜덤 연두 실루엣), 원본 픽셀 카드 프레임 및 기존 원본 별·상점 일러스트 재사용 |
| `public/meonggo/store/specific-dog-silhouette-figma-692-289657.svg` | Figma 원본 실루엣 vector export(약 58×56 viewBox, 기존 노드 좌표로 배치) |
| `components/GoOfficialDrawReveal.js` | 카드 공개 자동 대기 1650ms → 950ms; 기존 사용자 모션 감소 옵션 유지 |
| `components/GoFriendBattle.js` | READY 버튼을 참가자 정보 바로 위로 이동. 준비 박스는 `myReady`/`otherReady`만 기준, 카드 선택만으로 상태가 바뀌지 않음 |
| `components/GoFriendBattle.css` | 준비 완료 박스 전체 노란색, 선택 카드의 외부 금색 `:after` 사각 테두리 제거 |
| `components/GoCardFace.js` | `selected`가 참일 때 원래 검정 픽셀 프레임 **안쪽만 노란 배경**으로 채움. 원본 이미지·별점·검정 테두리 보존 |
| `app/figma-stage5-album.css` | 내 도감 카드 선택 시 황금색 inset 사각 box-shadow 제거, 배경색 #f8dc65 유지 |
| `components/GoBattle.js` | `누구와 멍배틀할까요?` 상대 목록에서 `대결 가능 카드 n장` 텍스트 제거 |
| `tests/goStage3DesignContract.test.mjs` | UI·Figma·동작 조건에 관한 Node 회귀 검사 7개 추가 |

## 3. 모션 및 상태 표시 정책

- 목줄: 무료와 유료 모두 터치 영역 최소 44×44px, 선택한 **원래 PNG 이미지**만 1.10배, 배경/선택 테두리 없음. 키보드 focus-visible 윤곽선은 접근성 목적으로 별도 유지.
- 뽑기: 원본 목줄 등장 1.3s → 0.7s, 결과 자동 공개 1.65s → 0.95s. Figma 기존 SVG 반짝임 원본에 0.7s 불투명도 연출. `prefers-reduced-motion` 고려.
- READY: 회차 상태가 `playing`이면서 `!myReady`일 때 버튼은 상단에 표시. 카드 미선택 시 버튼 비활성화. READY 확정 후 내 상태 박스 전체 노란색. 친구도 준비 완료했으면 친구 박스 노란색. 카드만 선택한 상태에서는 `준비 전` 기본색.
- 카드 선택: 내 도감과 실시간 1:1 같은 노란색, 기존 검정 원본 프레임 유지, 외부 금색 사각 테두리 없음.
- 화면 흔들림: 3회 충돌(기존 fighter translate / ghost trails / haptics / flash)은 보존하되 **versus 컨테이너 자체의 impact shake animation을 중단**, 작은 흔들림은 카드 SVG 내부에 한정. 싸우는 동안 horizontal paint clipping으로 옆 방향 스크롤 폭 증가 억제. **모바일 실기기 재현·검증 전에는 오류가 완전히 해결됐다고 확정하지 말 것.**

## 4. 검증 결과 및 한계

### 실제 수행한 읽기·검사

- Figma `get_design_context` 2개 핵심 노드와 READY 레퍼런스 검토, `get_metadata`로 상품 카드 원본 좌표 및 크기 확인.
- Figma 원본 벡터 Export → GitHub 업로드 성공; GitHub 소스 12개 파일 재읽기.
- `tests/goStage3DesignContract.test.mjs`와 동일 7개 검증을 GitHub 브랜치 파일 원문에 대해 V8 실행: **7/7 통과**.
- GitHub `compare_commits`로 운영 SHA와 작업 브랜치 diff 확인. 변경사항은 모두 신규 작업 브랜치 내부.
- Figma 원본 노드 자체는 변경하지 않음.

### 아직 확인하지 못한 것 (최종 QA 필수)

- 최신 3단계 변경 후 실제 `npm ci`, Next.js `npm run build`, React JSX 전체 컴파일.
- 현재 배포 화면의 실제 터치 동작, 모바일 iPhone 사파리·안드로이드 크롬 390px/320px 및 장시간 스크롤.
- Figma와 실제 렌더 결과 1px 단위 비교. 원본 자산의 좌표·코드 참조는 확인했지만 렌더 픽셀 비교는 아직 미실시.
- 랜덤/친구 1:1 실배틀 도중 **화면 전체 움찔거림 사라짐** 재현 테스트.
- 2단계 SQL은 독립 DB 미생성으로 **실제 함수 컴파일·거래/중복 지급/동시성 테스트 미실시**.
- 운영에서는 어떤 변경사항도 배포하지 않았음.

## 5. 4단계 검증 시나리오

1. 비용 없는 독립 Postgres/Supabase 테스트 환경 확보 후 SQL 초안 적용/수정; 운영 DB에 테스트 쿼리 실행 금지.
2. `node --test tests/goNextEconomy.test.mjs tests/goNextEconomyContract.test.mjs tests/goStage3DesignContract.test.mjs` 실행 및 빌드.
3. Figma 690과 실제 `/go` 390px 사진 비교: profile → 110px 무료 NEW → 112px 퀘스트 → 도감, 텍스트 y좌표 확인.
4. `/go/store`: Figma 692과 가격 11px Bold·166×265 카드 2열·말랑이 원본 대조; SVG 원본 실루엣 확인.
5. 무료·유료 팝업: 선택 목줄만 10% 확대, 테두리/배경 없음, 원본 목줄 아트 유지. 0.7/0.95초 타이밍 및 모션 감소 확인.
6. 중복 카드 기존 유지 / 새 능력치 교체 / X 닫기와 통신 중단 뒤 복원; 잔액/기록 이상 없음.
7. 친구 두 계정으로 방 생성: 상단 READY 버튼, 카드 미선택 비활성, 카드만 선택하면 상태 박스 변동 없음, 한쪽 READY 시 한쪽만 노란색, 양쪽 READY 시 동시 공개.
8. 내 도감과 1:1 카드 선택의 동일 노란색 / 검정 픽셀 테두리 보존 / 외부 황금 테두리 제거 검증.
9. 상대 목록에서 카드 보유 수 텍스트 미표시.
10. 랜덤·실시간 배틀 3연타 시 화면 전체 좌우 이동·scrollWidth 변경 없는지 모바일 5회 이상 검증.
11. 모든 서버 경제 기능 실제 DB 검증 전 운영 배포 금지; 최종 승인 전 `main`, 운영 Vercel, 운영 Supabase 변경 금지.

## 결론

**3단계 코드 수정은 브랜치에 저장됐고 정적 계약 검사 7개는 통과. 실제 React 빌드·모바일 렌더링·DB 검증 전이므로 '완전 검증/운영 배포 준비 완료'가 아님.**

다음 작업자는 이 문서와 `docs/MEONGGO_STAGE2_PROGRESS_20261119.md`, `docs/MEONGGO_2026-11-19_NEXT_UPDATE_HANDOFF.md`를 읽은 뒤 기존 UI·API 호환을 유지하면서 4단계 QA를 진행한다.
