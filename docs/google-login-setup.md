# 멍멍GO! Google 로그인 연결

기존 닉네임 계정과 카드는 유지됩니다. Google 인증은 서버에서 처리하고 이메일이 같아도 자동 병합하지 않습니다. 기존 회원은 닉네임으로 로그인한 후 계정 메뉴에서 Google 계정을 연결합니다.

## 소유자 설정

1. Google Cloud 프로젝트의 Google Auth Platform에서 앱 이름, 지원 이메일, 대상(외부), 동의 화면을 설정합니다. 요청 범위는 openid와 email뿐입니다. Google의 안내에 따라 공개 전 요구되는 앱 정보와 검증을 완료합니다. 테스트 상태라면 등록한 테스트 사용자만 이용할 수 있습니다.
2. OAuth 클라이언트 유형을 **웹 애플리케이션**으로 만듭니다.
3. 승인된 리디렉션 URI에 정확히 다음 주소를 등록합니다.

   `https://baronado-adoption-site-8sm2.vercel.app/api/go/google/callback`

4. Vercel의 baronado-adoption-site-8sm2 프로젝트 → Settings → Environment Variables → Production에 다음 두 값을 직접 설정합니다.

   - `GOOGLE_CLIENT_ID`: 위에서 발급한 웹 클라이언트 ID
   - `GOOGLE_CLIENT_SECRET`: 해당 클라이언트 비밀키

   비밀키는 채팅이나 GitHub에 올리지 않습니다.
5. 운영 환경으로 재배포합니다.

## 최종 실사용 검증

- 새 Google 계정 → 닉네임 중복 확인 → 가입 → 로그아웃 → 같은 Google 계정 로그인
- 기존 닉네임 로그인 → Google 연결 → 로그아웃 → Google 로그인 → 기존 카드 유지
- 잘못된 state, 만료된 인증, 다른 계정에 연결된 Google 계정은 거절
- 탈퇴는 계정 메뉴에서 진행하며 Google 회원은 Google 재인증, 기존 닉네임 회원은 현재 비밀번호와 닉네임을 확인합니다.
- 실제 탈퇴는 계정·카드·사진·좋아요·신고·대표 카드·완성 스탬프를 삭제하므로 테스트 전용 계정에서만 최종 검증합니다.

Google 문서: https://developers.google.com/identity/protocols/oauth2/web-server
