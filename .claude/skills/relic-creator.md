# 상징 생성 스킬

새로운 상징(Relic)을 게임에 추가합니다.

## 사용법
"[상징이름] 상징 만들어줘" 또는 상세 정보와 함께 요청

## 작업 절차

1. **사용자 입력 확인**
   - 상징 이름 (필수)
   - 희귀도: common, uncommon, rare
   - 효과 설명
   - 발동 조건 (전투 시작, 턴 시작, 카드 사용 등)

2. **파일 수정**
   - `src/data/relics.ts`에 상징 추가

3. **상징 템플릿**
```typescript
{
  id: "relic_id",
  name: "상징이름",
  rarity: "common",  // common, uncommon, rare
  description: "효과 설명",
  effect: {
    trigger: "onBattleStart",  // 발동 조건
    action: "효과 내용"
  }
}
```

4. **발동 조건 종류**
   - `onBattleStart`: 전투 시작 시
   - `onTurnStart`: 턴 시작 시
   - `onCardPlay`: 카드 사용 시
   - `onDamageDealt`: 피해 입힐 때
   - `onDamageTaken`: 피해 받을 때
   - `onEtherGain`: 에테르 획득 시

5. **검증**
   - ID 중복 확인
   - 빌드 테스트 실행

6. **버전 태그 업데이트**

## 참고 파일
- `src/data/relics.ts` - 상징 정의
- `src/components/battle/ui/RelicDisplay.tsx` - UI 컴포넌트
- `# 유물.txt` - 상징 기획 문서
