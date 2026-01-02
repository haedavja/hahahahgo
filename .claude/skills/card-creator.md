# 카드 생성 스킬

새로운 카드를 게임에 추가합니다.

## 사용법
"[카드이름] 카드 만들어줘" 또는 상세 정보와 함께 요청

## 작업 절차

1. **사용자 입력 확인**
   - 카드 이름 (필수)
   - 카드 타입: attack, defense, skill, general (기본: attack)
   - 피해량/방어력
   - 속도(speedCost)
   - 행동력(actionCost)
   - 특성(traits)
   - 설명

2. **파일 수정**
   - `src/components/battle/battleData.ts`의 CARDS 배열에 추가
   - 카드 ID는 영문 소문자 snake_case로 자동 생성

3. **카드 템플릿**
```typescript
{
  id: "card_id",
  name: "카드이름",
  type: "attack",
  damage: 10,
  block: 0,
  speedCost: 5,
  actionCost: 1,
  traits: ["trait1"],
  description: "카드 설명"
}
```

4. **검증**
   - 같은 ID 중복 확인
   - 빌드 테스트 실행 (`npm run build`)

5. **버전 태그 업데이트**
   - 한국시간 기준으로 맵 하단 버전 태그 갱신

## 참고 파일
- `src/components/battle/battleData.ts` - 카드 정의
- `src/types/index.ts` - Card 타입 정의
- `CLAUDE.md` - 프로젝트 규칙
