# Figma 디자인 반영 1차 — 2026-11-17

## 현재 상태
구현·로컬 검증 완료. 운영 배포 결과는 이 문서와 Google 인수인계서에 기록한다.
브랜치: release/figma-stage1-20261117. 기반: 기존 운영 033e55977cca70dbf46830a84d11bc92f61ca834.
main 48a8ce8b6c0ddc150ad374a243bdcffbea960b10은 후속 기능·구형 디자인이 포함되어 있어 그대로 배포하지 않는다. main 이력은 보존한다.

## 이번 범위
- 공통 헤더: 높이85px, 위42px, 브랜드 x16/y13, 5개 메뉴 x12/82/152/222/292 y53, Galmuri11 11px, 활성 밑줄 y81/h4. 햄버거·닉네임·로그아웃은 헤더에서 제거.
- 로그인전 CTA 하나와 먼저 둘러보기→모두의 도감. 도감 본문·퀘스트·스토어·배틀 개편은 후속 차수.
- 설정/게임안내 진입 통합. 시스템 설정은 Figma599:163451 기준. 기존 소리·진동·팝업 저장 기능 유지. 계정 로그인/프로필/로그아웃/탈퇴 진입은 설정 아래에 보존.
- 행동시점 로그인 안내: 저장/배틀/좋아요/신고. Figma617:163517 공통모달331×252, 버튼222×40, MonaS12. 원본 닫기SVG 다운로드·사용.
- 닉네임 로그인은 현재 화면 컴포넌트를 유지해 실패·취소시 맥락 보존. Google OAuth는 signed flow에 검증한 /go 경로·쿼리·해시를 담아 원래 화면 복귀. sessionStorage에는 경로·스크롤·10분 유효시각만 보관. 외부/관리자/API/경로탈출·만료 값 거부. 자동 결제·저장·배틀실행 없음.
- 스토어·멍코인 실제 이용은 후속 차수까지 비활성 텍스트로 표시. 비로그인0, 회원 잔액은 잘못0으로 표시하지 않고 —. 이번 차수는 경제API·DB를 추가/변경하지 않음.

## 디자인 출처
https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=558-312818 공통헤더
https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=599-163451 설정/게임안내
https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=617-163451 먼저둘러보기
https://www.figma.com/design/rhHUCAxjXfuWnpFzM4QkWM?node-id=617-163517 로그인안내
기존 도감/프로필/안내 본문의 이번 범위 밖 차이는 후속차수로 남김. 전체 프레임 일치로 주장하지 않는다.

## 검증
- npm ci 및 최종 Next.js build 성공.
- Node: go-auth-return, go-google, go-auth, go-bulk-delete 총10개 통과.
- 브라우저: 설정320/390/430px, 게임안내 탭 이동, 로그인전홈·CTA, 배틀 행동안내/닫기/계속둘러보기 확인.
- 실측: 헤더390×85; 메뉴좌표·폰트로드; 모달331×252 y138; 주요버튼222×40 y298; 원본닫기이미지 정상로드.
- 로컬은 DB 비연결이므로 강아지조회 실패는 알려진 제한. 실제 회원 로그인 성공·실Google OAuth·관리자 인증·기기진동/카메라 미검증. 검증용 실제 회원 생성·카드 삭제·DB SQL 실행 없음.
- scripts/next-dev.mjs는 미리보기 실행기의 --host/--strictPort를 설치된 Next CLI에 맞게 전달하는 개발명령 호환 처리. 제품의 의존성버전/lockfile 변경 없음. 설치된 Next.js16.4.3에서 기존 보안 업데이트 경고가 출력됨. 이번 변경에서 의존성 업그레이드는 하지 않았으며 후속 점검 항목으로 남김.

## 후속 차수와 최신 정책
2차 내도감·공식/나만의카드·선택/삭제. 3차 퀘스트·방문인증·코인내역. 4차 공식관리·스토어·뽑기. 5차 실시간/랜덤배틀.
일반4+히든1, 랜덤200·지정300, 정상 실시간/랜덤 중 일일1회+10. 마지막 카드 삭제시 해당강아지 도감·배틀전적 삭제(옛 PvP영구보존 정책 폐기). 모바일우선, 별도스테이징없이 차수별 운영배포.
다음계정은 이 문서→Google최신요약→Figma주석→실제운영alias/브랜치커밋 재조회. 오래된main을 무조건 재배포하지 말 것. 후속작업은 이 release브랜치 최신제품커밋에서 이어가고 main 기능은 선택적으로 가져와 최신설계에 맞춘다.
Google: https://docs.google.com/document/d/1Wp4L2L1fTh_COPnhBeDT-xhZIecCZrSo4S-xwhYgH-0

## 복구
직전 운영소스033e559와 deployment dpl_6iZb5wmmADvwnkc7jLmkbqmsTtPe를 보존. DB 변경이 없어 소스/배포 복구만 대상. 배포도구의 프로모션/복구지원 상태를 확인하고 비용발생 작업 없이 진행.
