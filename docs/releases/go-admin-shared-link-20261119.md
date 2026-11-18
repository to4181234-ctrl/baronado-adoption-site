# 관리자 URL 공유 방식 (배포 전 코드 변경, 2026-11-19)

## 사용자가 확정한 요구

`https://baronado-adoption-site-8sm2.vercel.app/admin` 에서 별도 계정·비밀번호·로그인이 없이 관리자 페이지로 바로 이동하고, 해당 주소를 알고 접근한 사람이 등록/수정/삭제를 할 수 있어야 한다. 이 규칙은 `/admin` 내부 관리 화면과 `/api/admin/*` 요청에 함께 적용한다.

## 구현

- 서버 설정 **`ADMIN_AUTH_MODE=shared_link`** 를 선택하면 `adminAccess()`가 세션·회원 ID·비밀번호 요구를 생략한다.
- `GET /api/admin/session`에서 `authenticated=true`, `noLoginRequired=true`, `signedIn=false`를 반환한다.
- `AdminGuard`가 해당 상태에서 관리자 내용을 곧바로 표시한다. 로그인/로그아웃/비밀번호 폼을 표시하지 않는다.
- 등록·수정·삭제 API는 기존의 유효성 검사, 서비스 역할 기반 DB 접근, **동일 Origin 검사**를 유지한다.
- 기존 `member`와 `password` 인증 코드는 복귀용으로 유지한다. 모드를 명시하지 않은 경우는 `member`로 둔다.
- `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`은 계속 필요하다. 멍멍GO 사용자 로그인/기타 기능이 쓰는 `ADMIN_SESSION_SECRET` 등 기존 설정은 삭제하지 않는다.

## 배포·보안 관련 필수 안내

**`/admin`은 비밀 링크가 아니라 예측 가능한 공개 주소다.** 단순 공유만으로 제3자 접근을 차단할 수 없다. `shared_link`로 공개 운영 배포하면 외부인이 주소를 알아내 관리자 데이터·사진·회원 관련 관리 기능을 조회하거나 수정/삭제할 수 있다. 사용자의 접근 허가 결정을 따르되, 이 위험은 배포 승인 시 명시한다.

새 모드가 운영에 적용되려면 **Vercel 서버 전용 환경 변수**에 `ADMIN_AUTH_MODE=shared_link`를 설정하고 새 배포가 반영되어야 한다. **이번 산출물에서는 운영 Vercel 환경 변수와 배포, 운영 DB, GitHub main을 전혀 수정하지 않았다.** 지금 운영 URL은 아직 기존 배포 방식이다.

## 검증

- 실행 완료: Node 단위 테스트(`tests/admin-shared-link-access.test.mjs`)에서 무세션 접근, 명시적 모드, 서버 설정 누락 차단, Origin 검사를 확인.
- QA 보강: `qa/admin-shared-link-checks.mjs`를 추가해 독립 PostgreSQL/Next에서 무로그인 `/admin` 접근, 관리 데이터 조회, 사진 업로드 입력 검증, 강아지 등록→수정→삭제를 점검하도록 하였다. `qa/run.mjs`에 포함했으나 **이 환경에서는 npm 의존성 미설치로 실제 QA 실행 불가**.
- 실제 브라우저, 격리 DB 실요청 및 Next.js 빌드는 이 새 코드 조합에 대해 미실행이다. 이전 member 버전에서 188 테스트 및 빌드·격리 DB 검증을 완료한 기록과 구분할 것.

## 변경 파일

- `lib/server/adminSession.js`
- `app/api/admin/session/route.js`
- `app/api/admin/login/route.js`
- `components/AdminGuard.js`
- `tests/admin-shared-link-access.test.mjs`
- `../qa/admin-shared-link-checks.mjs`
- `../qa/run.mjs`
