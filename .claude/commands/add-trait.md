# 새 카드 특성(Trait) 추가

새로운 카드 특성을 게임에 추가합니다.

## 작업 순서
1. `src/types/card.ts`에서 CardTrait 타입 확인
2. 특성 정의 추가
3. `src/components/battle/logic/cardExecutionCore.ts`에서 로직 구현
4. 특성 설명 텍스트 추가
5. 툴팁 UI 확인
6. 빌드 테스트

## 특성 카테고리
- **공격 특성**: pierce, multi-hit, lifesteal
- **방어 특성**: counter, reflect, absorb
- **유틸 특성**: draw, discard, transform
- **상태 특성**: stun, freeze, burn

## 사용자 요청
$ARGUMENTS
