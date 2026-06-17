# 바로나도 입양 사이트

바로나도 애견카페에서 임시보호 중인 강아지들의 입양을 장려하기 위한 사이트입니다.  
사용자 페이지와 관리자 페이지가 포함되어 있고, Supabase에 강아지 정보를 등록하면 사용자 페이지에 자동으로 반영됩니다.

## 페이지 구조

- `/` : 이용자 리스트 페이지
- `/dogs/[id]` : 강아지 상세 페이지
- `/admin` : 관리자 리스트 페이지
- `/admin/new` : 강아지 등록 페이지
- `/admin/edit/[id]` : 강아지 수정 페이지

## 포함 기능

- 강아지 리스트 노출
- 등록된 게시글이 없을 때 빈 상태 화면 노출
- 상세 페이지 이미지 슬라이드
- 사진 클릭 시 크게 보기
- 모바일 드래그/스와이프 이미지 넘김
- 관리자 등록/수정/삭제
- 사진 업로드 최대 3장
- Supabase Database + Storage 연동

## 1. Supabase 세팅

1. Supabase에서 새 프로젝트 생성
2. `SQL Editor`로 이동
3. `supabase/schema.sql` 파일 내용을 복사해서 실행
4. `Project Settings > API`에서 아래 값을 확인
   - Project URL
   - anon public key

> 현재 구조는 로그인 없이 누구나 `/admin`에 접속해서 등록/수정/삭제할 수 있는 공개 관리자 페이지입니다. 실제 운영 전에는 간단한 비밀번호 보호나 Supabase Auth 추가를 권장합니다.

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에는 아래 값을 입력합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
```

브라우저에서 확인:

```txt
http://localhost:3000
http://localhost:3000/admin
```

## 3. GitHub 업로드

1. GitHub에서 새 repository 생성
2. 이 프로젝트 폴더 전체를 업로드
3. `.env.local`은 업로드하지 않기

## 4. Vercel 배포

1. Vercel 로그인
2. `Add New Project`
3. GitHub repository 선택
4. Framework Preset: Next.js
5. Environment Variables에 아래 2개 추가

```bash
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
```

6. Deploy 클릭

## 5. 배포 후 확인

- 이용자 페이지: `https://배포주소.vercel.app/`
- 관리자 페이지: `https://배포주소.vercel.app/admin`

관리자 페이지에서 강아지 정보를 추가하면 이용자 페이지에 바로 표시됩니다.
