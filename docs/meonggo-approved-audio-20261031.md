# 멍멍GO 최종 사운드 적용 기준 (2026-10-31)

**최종 원본:** 사용자 제공 `MeongGO_Individual_MP3_and_Handoff_20261031 (3).zip`의 MP3 바이너리. 추가 합성/대체/재제작 금지.

## 재생 매핑

| 음원 | 실행 이벤트 |
| --- | --- |
| `BGM_02_Album_Original_Chiptune_Loop.mp3` | 내 도감·개별 도감·교감에서 실제 사용자 동작 후 1개 루프 |
| `BGM_03_Camera_Original_Suspense_Loop.mp3` | 라이브 카메라가 열린 뒤 기존 루프와 교체; 카메라 종료 후 복원 |
| `SFX_01_Card_Appear.mp3` | 멍배틀 0~0.8초 카드 등장 |
| `SFX_02_Card_Select.mp3` | 카드 선택 |
| `SFX_03_Card_Deselect.mp3` | 카드 선택 취소 |
| `SFX_04_Two_Cards_Ready.mp3` | 두 번째 카드 선택 완료 |
| `SFX_05_Battle_Start.mp3` | 배틀 실행 시작 (0초) |
| `SFX_06_Battle_Impact.mp3` | 배틀 충돌 (1.4초) |
| `SFX_07_Battle_Victory.mp3` | 새 승리 결과 한 번 |
| `SFX_08_Battle_Draw.mp3` | 새 무승부 결과 한 번 |
| `SFX_09_Battle_Defeat.mp3` | 새 패배 결과 한 번 |
| `SFX_10_Collar_Select.mp3` | 최초 목줄 선택 |
| `SFX_11_Dog_Discover.mp3` | 목줄 발견 반짝임이 시작되는 0.2초 지점 |
| `SFX_12/13/14_Bark_Variant_*.mp3` | 강아지 직접 터치 시 순서대로 짖는 반응 |
| `SFX_15_Dog_Snack.mp3` | 교감 간식 실행 |
| `SFX_16_Dog_Praise.mp3` | 교감 칭찬 실행 |
| `SFX_17_Dog_Play.mp3` | 교감 놀이 실행 |
| `SFX_18_Camera_Shutter.mp3` | 카메라 촬영 버튼 실행 |
| `SFX_19_Card_Acquired.mp3` | 카드 저장 **서버 성공** 후 1회, 카드 완성 화면 명시적 재터치 시 재생 |

* 최종 ZIP에서 카드 선택·취소·준비 효과음을 사용하라는 사용자 확정 지시가 Figma의 검토용 제안 문구보다 우선합니다.
* `PREVIEW_*` 4개는 청취 검수용이며 사이트 트리거에는 연결하지 않습니다.
* 최종 ZIP에는 배틀 전용 BGM이 없습니다. 이전 외부 BGM과 합성음은 사용하지 않습니다.
* 모든 음악은 음소거/페이지 이동/백그라운드 여부에 따라 즉시 제어합니다.

## 배포 전 필수 사항

이 브랜치의 JS는 `/public/audio/meonggo`에서 실제 MP3를 찾습니다. **현재 바이너리는 GitHub 브랜치에 업로드되지 않았습니다.**
사용자에게 전달된 `MeongGO_Approved_MP3_Figma_Staging_20261031.zip`의 `public/audio/meonggo` 폴더를 저장소 같은 경로에 넣어야 합니다. 프리뷰는 `reference/previews`에 따로 보관합니다.

브라우저에서 실제 사운드와 Figma 레이아웃/모션 검수를 끝내기 전 **프로덕션 배포 금지**.
