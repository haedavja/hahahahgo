## 상태 요약 (2024-xx-xx)
- 현재 서브모듈 `hahahahgo`는 커밋 `ba45e57`(건강검진표 회복 조정 및 행동력 구슬 좌표 복원) 상태로 리셋됨.
- `LegacyBattleApp.jsx`에서 발생하던 Babel 파싱 오류(문자열 깨짐) 수정 작업은 되돌림. 따라서 이전에 시도했던 블록 처리/방어 로그 정리 패치는 포함되지 않음.
- 무한방패(턴 시작 방어력 1000) 관련 버그는 여전히 미해결:
  - 턴 시작 시 유물 효과가 중복 실행되어 로그가 3회 찍히고, 방어가 제대로 적용되지 않아 체력을 잃음.
  - 원인 추정: 턴 시작 useEffect가 리렌더마다 다시 돌거나, `def` 플래그/블록 적용이 제대로 되지 않는 부분.

## 다음에 할 일 제안
1) 턴 시작 유물 효과 중복 방지
   - `phase === 'select'`에서 턴 시작 효과를 적용하는 useEffect에 플래그(ref) 추가.
   - 예: `const turnStartProcessedRef = useRef(false);` / `if (turnStartProcessedRef.current) return; turnStartProcessedRef.current = true;`
   - 턴 종료 또는 다음 턴 시작 시점에 플래그를 false로 리셋.

2) 무한방패 방어력 적용 보강
   - 턴 시작 방어력 부여 시 `block`뿐만 아니라 `def: true`를 세팅해야 공격 차단 로직이 블록을 사용함.
   - 예: `setPlayer(p => ({ ...p, block: (p.block || 0) + turnStartRelicEffects.block, def: (p.def || turnStartRelicEffects.block > 0), ... }))`
   - 중복 로그는 1) 처리 후 다시 확인.

3) 빌드 확인
   - `npm run dev` 또는 `npm run build`로 파싱 오류 여부 재확인.

## 참고
- Babel 설정은 건드리지 않음. 문제는 소스 문자열/구문 깨짐이 원인이었음.
- 상위 저장소 `memory bank`에서는 서브모듈 포인터를 `ba45e57`로 롤백한 커밋 `1e86dd8`가 추가됨.
