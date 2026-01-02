# 특성 생성 스킬

새로운 카드 특성(Trait)을 게임에 추가합니다.

## 사용법
"[특성이름] 특성 만들어줘" 또는 상세 정보와 함께 요청

## 작업 절차

1. **사용자 입력 확인**
   - 특성 이름 (필수)
   - 특성 타입: positive(긍정), negative(부정), neutral(중립)
   - 가중치(weight): 1~5 (희귀도)
   - 효과 설명

2. **파일 수정**
   - `src/components/battle/battleData.ts`의 TRAITS 객체에 추가

3. **특성 템플릿**
```typescript
trait_id: {
  id: "trait_id",
  name: "특성이름",
  type: "positive",  // positive, negative, neutral
  weight: 1,         // 1~5 (높을수록 희귀)
  description: "효과 설명"
}
```

4. **가중치 가이드**
   - ★ (weight 1): 기본 특성
   - ★★ (weight 2): 강화된 특성
   - ★★★ (weight 3): 희귀 특성
   - ★★★★★ (weight 5): 전설 특성

5. **검증**
   - ID 중복 확인
   - 빌드 테스트 실행

6. **버전 태그 업데이트**

## 기존 특성 예시

### 긍정 특성
- swift(신속함): 속도 -2
- repeat(반복): 다음턴에도 손패에 확정 등장
- strongbone(강골): 피해량/방어력 25% 증가

### 부정 특성
- slow(굼뜸): 속도 +3
- exhaust(탈진): 다음턴 행동력 -2
- vanish(소멸): 사용 후 게임에서 제외

## 참고 파일
- `src/components/battle/battleData.ts` - TRAITS 정의
- `src/components/battle/logic/traitEffects.ts` - 특성 효과 구현
