# 상태 디버깅

Zustand 상태 관리 문제를 디버깅합니다.

## 디버깅 순서
1. `src/state/gameStore.ts` 확인
2. 관련 슬라이스 확인 (`src/state/slices/`)
3. 상태 변경 추적
4. 불변성 위반 확인
5. 셀렉터 최적화 확인

## 주요 상태
- `battle` - 전투 상태
- `player` - 플레이어 상태
- `dungeon` - 던전 상태
- `deck` - 덱 상태

## 디버깅 대상
$ARGUMENTS
