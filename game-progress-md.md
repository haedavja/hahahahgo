# 개발 진행 현황 (2025-11-14)

## 1. 현재 빌드 상태
- `new/strategy-map` 폴더만으로 실행/빌드/배포 가능
- React 맵(`MapDemo`)과 battle.html을 iframe으로 연결하여 전투 진행 가능
- `resolveBattle()` 실행 후 `lastBattleResult` 모달이 뜨고 자동으로 닫히며, 맵에서 다음 노드 선택 가능
- `DEVLOG-2025-11-14.md` 작성 완료

## 2. 오늘 해결한 이슈
| 이슈 | 원인 | 조치 |
| --- | --- | --- |
| battle.html Babel SyntaxError | 문자열 인코딩 깨짐, 중복 선언 | battle.html을 실행작업물 원본으로 복사하여 복구 |
| 전투 로그 렌더링 오류 | `lastBattleResult.log`에 객체가 포함됨 | `formatBattleLogEntry` 추가, 문자열 변환 후 출력 |
| 전투 종료 후 UI가 “Battle”에 멈춤 | `battleResult` 메시지가 누락되거나 모달이 닫히지 않음 | `postMessage` 루프 고정, `clearBattleResult` 자동 실행 |

## 3. 남은 작업
- battle.html 수정 가이드 및 체크리스트 작성
- 에테르/조합 표기, 싱글 전투 모드 개선 등을 작은 단위로 재시도
- 문서(`tech-stack.md`, `통합규칙.md`) 업데이트

## 4. 다음 단계 제안
1. battle.html의 에테르 표시, 조합 정보, 싱글 전투 로직을 별도 브랜치나 백업에서 단계별 구현  
2. 맵 자원(`resources.aether`)과 전투 내 에테르를 동기화  
3. 문서/체크리스트 정비 후 다른 담당자에게 인수인계
