# 바로나도 입양 사이트

바로나도 애견카페에서 임시보호 중인 강아지들의 입양을 장려하고, 상주견을 소개하기 위한 사이트입니다.  
사용자 페이지와 관리자 페이지가 포함되어 있고, Supabase에 강아지 정보를 등록하면 사용자 페이지에 자동으로 반영됩니다.

## 페이지 구조

- `/` : 가족을 찾아요 리스트 페이지
- `/residents` : 상주견 소개 리스트 페이지
- `/dogs/[id]` : 강아지 상세 페이지
- `/admin` : 관리자 리스트 페이지
- `/admin?category=resident` : 상주견 관리자 리스트 페이지
- `/admin/new` : 강아지 등록 페이지
- `/admin/edit/[id]` : 강아지 수정 페이지

## 포함 기능

- 가족을 찾아요 / 상주견 소개 카테고리 분리
- 강아지 리스트 노출
- 등록된 게시글이 없을 때 빈 상태 화면 노출
- 입양 완료 체크 및 썸네일 오버레이 표시
- 상세 페이지 이미지 화살표 슬라이드
- 사진 클릭 시 크게 보기
- 모바일 드래그/스와이프 이미지 넘김
- 관리자 등록/수정/삭제
- 사진 업로드 최대 3장
- Supabase Database + Storage 연동

## Supabase 업데이트

이번 버전부터 `category`, `adopted` 컬럼이 추가됩니다.  
기존 프로젝트에 덮어쓰기 업로드한 뒤 Supabase에서 아래 파일 내용을 다시 실행하세요.

```txt
supabase/schema.sql
```

실행 위치:

```txt
Supabase → SQL Editor → New query → schema.sql 내용 붙여넣기 → Run
```

## Vercel 환경변수

```bash
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
```

## 최근 수정

- 입양 완료되지 않은 게시글을 먼저 보여주고, 입양 완료 게시글은 리스트 하단에 표시되도록 정렬을 변경했습니다.
- 각 그룹 안에서는 최신 등록순으로 표시됩니다.
