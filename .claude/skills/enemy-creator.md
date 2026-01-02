# 적 생성 스킬

새로운 적(몬스터)을 게임에 추가합니다.

## 사용법
"[적이름] 적 만들어줘" 또는 상세 정보와 함께 요청

## 작업 절차

1. **사용자 입력 확인**
   - 적 이름 (필수)
   - 체력(hp)
   - 최대 속도(maxSpeed) - 기본 30
   - 사용할 카드 덱
   - AI 패턴 (공격적/방어적/균형)
   - 에테르 보상

2. **파일 수정**
   - `src/components/battle/battleData.ts`에 적 카드 추가
   - `src/data/cards.ts`의 ENEMY_DECKS에 덱 추가
   - `src/data/enemyPatterns.ts`에 AI 패턴 추가 (필요시)

3. **적 카드 템플릿**
```typescript
// 적 전용 카드
{
  id: "enemy_attack",
  name: "적 공격",
  type: "attack",
  damage: 8,
  speedCost: 5,
  actionCost: 1,
  description: "적의 기본 공격"
}
```

4. **적 덱 템플릿**
```typescript
enemy_name: ["enemy_attack", "enemy_attack", "enemy_block"]
```

5. **검증**
   - ID 중복 확인
   - 빌드 테스트 실행

6. **버전 태그 업데이트**

## 참고 파일
- `src/components/battle/battleData.ts` - 적 카드/정의
- `src/data/cards.ts` - ENEMY_DECKS
- `src/data/enemyPatterns.ts` - AI 패턴
- `src/types/enemy.ts` - EnemyDefinition 타입
