# 유물 강조(배지) 가이드 (전투 시)

## 최근 수정 요약
- **희귀한 조약돌(rareStone)**: 상시 노란 배지 표시 금지. 카드 실행 시에만 `relicActivated`로 발동 애니메이션/사운드 표시.
- **참고서/에테르 결정 계열**: 카드 실행 시 즉시 트리거. 평소에는 배지 없음.
- **악마의 주사위**: 다섯 번째 플레이어 카드 실행 직후에만 발동 애니메이션/사운드. 평소 강조 없음.
- **지속 강조 제외 리스트**: `etherGem`, `devilDice`, `rareStone`, `etherCardMultiplier`, `etherMultiplier` 효과 유물은 상시 강조 대상에서 제외.

## 체크리스트 (수정 전/후 확인)
1. **상시 배지 여부 확인**  
   - 전투 진입 시 희귀한 조약돌 배지가 켜져 있으면 안 됨.  
   - `isPersistent` 조건에 위 유물들이 포함돼 있지 않은지 확인.
2. **발동 타이밍**  
   - 희귀한 조약돌/참고서/에테르 결정: **카드 실행 시점**마다 `relicActivated`가 set → 애니메이션/사운드.  
   - 악마의 주사위: **5번째 플레이어 카드 실행 직후**에만 `relicActivated` set + 사운드.
3. **렌더링 확인**  
   - 발동 상태가 아니면 노란색 하이라이트 없음.  
   - 발동 시 짧게 배지/사운드가 나타난 뒤 사라짐 (`setTimeout`으로 해제).
4. **코드 포인트**  
   - `src/components/battle/LegacyBattleApp.jsx`:  
     - 유물 발동: 카드 실행 루프(`setResolvedPlayerCards`)  
     - 배지 표시 로직: 상단 유물 리스트(`isPersistent` 계산)  
     - 악마의 주사위 트리거: `devilDiceTriggeredRef` 사용

## 자주 발생한 문제와 원인
- **문제**: 전투 중 희귀한 조약돌이 상시 노란 배지로 남음.  
  **원인**: `isPersistent` 계산에 조약돌/에테르 배율 계열이 포함되어 있었음.  
  **해결**: `isPersistent`에서 `rareStone`, `etherCardMultiplier`, `etherMultiplier` 계열을 제외.

## 수정 시 주의
- `relicActivated`는 짧게 표시하고 바로 해제(setTimeout). 상시 표시를 위해 `isPersistent`를 건드리지 말 것.  
- 발동 사운드/애니메이션은 카드 실행 시점(타임라인)과 맞춰서 넣을 것.  
- 새로운 유물 추가 시, **상시 강조 대상인지**와 **발동 시점**을 명확히 분리해 작성.  
