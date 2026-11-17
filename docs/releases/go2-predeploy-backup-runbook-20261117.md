# 바로나도 멍멍GO 2.0 · 운영 전 DB/Storage 백업 및 복구 실행서

> **상태: 실행 절차·검증 도구 준비 완료 / 운영 원본의 실제 DB 덤프·Storage 176개 다운로드 및 운영 복원 실습은 미실행.**  
> 현재는 Supabase Free 플랜. 운영 DB·Storage를 건드리지 않고 메타데이터만 검사했다.  
> 사용자 최종 배포 승인과 백업의 별도 실행/검증이 있어야 운영 전환 가능.

## 1. 실제 검증된 운영 데이터 기준선 (2026-11-17, 읽기 전용)

| 대상 | 개수 | 저장 바이트 | 증거 |
|---|---:|---:|---|
| `dog-images` (공개 강아지 사진) | 82 | 53,733,125 | 파일 경로·크기 digest `18310be74b3bcde7d879488480c40c17` |
| `go-cards` (비공개 개인 멍카드 사진) | 94 | 3,863,668 | digest `25dd02e404be4ff46a22d5ec719fe1e5` |
| `go-official-cards` (비공개 공식 카드 파일) | 0 | 0 | 비어 있음 |
| **전체** | **176** | **57,596,793** | 실제 파일 bytes를 백업한 것은 아님 |

- 운영 DB: 강아지 14, 회원 20, 카드 55, 기존 랜덤배틀 46, 공식카드/공식구매/친구 PvP 전적 0.
- **개인 카드 55개에 등록된 이미지 경로가 모두 실제 `go-cards` 객체와 매칭**, 누락 0.
- 강아지의 사진 참조 40개 모두 `dog-images` 객체와 매칭, 누락 0.
- `go-cards` 94개 중 **39개는 현재 `go_cards.image_path`에 직접 연결되지 않은 파일**. 참조되지 않는 이유는 확인되지 않았으며, 과거 생성물·공개 기록 등과 연관될 수 있다. **백업에서 제외하거나 삭제하지 말 것.**
- 이 개수는 **해당 시점의 스냅샷**일 뿐. 출시 전에 반복 조회해 최신 사용자 업로드를 추가 반영한다.
- 이 파일의 digest는 **객체 경로와 메타데이터상의 크기**에 대한 MD5다. **파일 내용 자체에 대한 백업/암호학적 무결성 증명이 아니다.** 실제 다운로드된 파일의 SHA-256은 별도 로컬 검증 도구로 계산한다.

## 2. 운영 데이터를 손대지 않는 오프라인 백업 실행 절차

실행 위치: 사용자가 직접 통제하는 FileVault 등 **암호화된 Mac 디스크** 또는 승인된 보안 백업 공간. `/mnt/data` 임시 실행 환경, GitHub, 공개 Google Docs, 대화 텍스트에 비밀번호·실제 회원 DB·사진 파일을 넣지 않는다.

1. 운영 **쓰기 발생 가능성을 고려해** 백업할 시간을 지정한다. 백업 도중 회원이 사진/코인을 변경하면 DB와 Storage의 시점이 달라질 수 있으므로, 최종 마이그레이션 직전 짧은 점검·쓰기중지 구간에 다시 스냅샷을 확인한다.
2. Supabase Dashboard에서 프로젝트의 Database connection 정보를 확인하고, 해당 권한의 **읽기 전용 덤프**를 만들 수 있는 DB 계정으로 `pg_dump -Fc --no-owner --no-acl`을 실행한다. DB 접속 비밀번호는 운영자의 비공개 환경변수/인증정보 관리자로 주입하고 커맨드 기록·로그에 남기지 않는다. **전 DB 포맷 백업에 `auth` 관련 데이터가 포함되는지 반드시 검증**한다. 대안으로 Supabase CLI의 `supabase db dump --remote --file schema.sql`, `supabase db dump --remote --data-only --file data.sql`을 쓰되, **기본 CLI 덤프는 `auth`, `storage` 등 관리 스키마를 제외하므로 전체 DB 백업이라고 착각하지 않는다.**
3. `supabase login`, `supabase link --project-ref <PROJECT_REF>`로 작업 PC의 CLI를 정상 연결한 뒤, Storage **원본**을 세 버킷 모두 다운로드한다. 현재 CLI 문법 예시:

```bash
# 이 명령은 실제 백업을 수행하는 관리자 PC에서만 실행. 여기서는 실행하지 않음.
# Supabase CLI 버전에 따라 --remote와 --experimental 동작을 --help에서 재확인.
mkdir -p "$BACKUP_DIR/storage"
cd "$BACKUP_DIR/storage"
supabase storage cp -r ss:///dog-images . --remote --experimental
supabase storage cp -r ss:///go-cards . --remote --experimental
supabase storage cp -r ss:///go-official-cards . --remote --experimental
```

4. 내려받은 구조가 `storage/dog-images`, `storage/go-cards`, `storage/go-official-cards`인지 확인한다. 다운로드 도구가 다른 디렉터리 구조로 저장했다면 **원본 파일명·하위 경로를 보존하며** 이동한다. 다운로드한 파일이 82+94+0개이고 원본 크기 합과 일치하는지 점검한다.

```bash
# 로컬 Python 3 필요. 백업본/파일명은 원격에 전송하지 않음.
python3 scripts/verify-go-storage-backup.py \
  "$BACKUP_DIR/storage" \
  docs/releases/go2-storage-baseline-20261117.json \
  --manifest "$BACKUP_DIR/private-file-checksums.json"
```

5. **검증일 직전 운영 행·Storage 객체 수가 달라졌다면 고정 기준값을 무조건 통과시킬 목적으로 실제 파일을 삭제하거나 기준을 임의 수정하지 않는다.** 운영 DB의 메타데이터 재조회 → 새 합계·manifest 생성 → 전체 백업 재검증 순으로 진행한다.
6. 백업 완성 후 파일 목록/bytes/SHA-256 합계, DB 덤프 검증(`pg_restore --list` 가능 여부), 안전한 분리 장소에 **2개 이상 복사본** 보존. 비밀키, 인증 토큰, 실제 회원 정보의 덤프는 공개 파일/PR에 첨부하지 않는다.

**참고:** Supabase 공식 문서  
- https://supabase.com/docs/guides/platform/backups  
- https://supabase.com/docs/guides/storage/management/download-objects  
- https://supabase.com/docs/reference/cli/introduction

## 3. 복구 및 롤백 판정

기존 정상 운영 Vercel git commit (읽기 전용으로 확인):  
`6e81eb7581fd19d451c49055fd1a41c47820b298`  
배포 alias: `baronado-adoption-site-8sm2.vercel.app`.

로컬 합성 QA에서는 `pg_dump -Fc` → 2~5차 SQL 적용 → **별도 PostgreSQL DB `pg_restore` 재생성**을 실행했고 기존 회원2·카드2·과거 원장1·공식 이미지8 메타데이터·구형 영수증 제약이 복원됨을 확인했다. **실제 운영의 Supabase 관리 스키마·Google 인증 데이터·Storage 원본을 복원한 것은 아니다.**

운영 실패 시 계획:
1. 신규 회원·코인·사진 쓰기를 잠시 차단하고, 장애 시점의 신규 영수증/업로드/승인 기록을 **먼저 별도로 보존**한다.
2. 기존 Vercel 정상 배포 SHA의 코드를 재배포/승인된 alias 롤백한다. `main`과 운영 alias는 현재 변경되지 않았다.
3. **2~5차는 4+HIDDEN1 스키마, 기존 운영의 5+1 UI, 영수증200/300C가 서로 다를 수 있어 코드만 되돌리는 것은 충분하지 않다.** 복구 가능한 관리 DB와 Storage 객체를 함께 고려하여 별도 스테이징에서 복원하는 것이 우선이다.
4. 사용자가 승인한 정합성 조정 SQL을 실행하고 회원·카드·배틀·코인·기존 수집 데이터의 불변 항목을 원장과 대조한다.
5. 재개 후 관찰 지표: API 오류, 멍카드 수, Storage 미존재 경로 0, 구매 영수증/지갑/원장 일치, 실시간 친구 룸 중복 기록 없음.

## 4. 완료 판정 기준

아래 항목을 충족해야 실제 운영 백업·복구 게이트를 **PASS**로 표시할 수 있다.

- [ ] 최신 운영 DB 덤프가 **오프라인 위치에 실존**하고 복원 가능한 아카이브임이 검증됨
- [ ] Storage **전 객체(배포 직전 기준 재조회)** 파일이 실존하며 파일 수·바이트·파일별 SHA-256 검증됨
- [ ] **보호된 별도 환경**에서 운영 DB/Storage/사용자 인증과 연결 관계를 복원해 검증함
- [ ] 배포 전·후 차이 보존, 장애 시 롤백 담당자/복구 구간/결정 기준을 사용자와 합의함

현재 이 네 개의 **실제 운영 파일 백업/복구 작업은 미실행**. 이 문서는 실행 준비·방법론과 **합성 DB 복원·검사 도구 검증**의 증거다.
