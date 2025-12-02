# 전투 시스템 리팩토링 가이드

## 📋 개요

LegacyBattleApp.jsx의 유지보수성 개선을 위한 리팩토링 작업 문서입니다.
전투 관련 로직을 기능별로 분리하여 모듈화했습니다.

**작업 일시**: 2025-12-02
**작업자**: Claude (GPT 인수인계용)

---

## 📊 리팩토링 결과

### 코드 라인 수 변화
- **이전**: 4,551 줄
- **이후**: 4,301 줄
- **감소**: 250 줄 (약 5.5% 개선)

### 생성된 파일
총 4개의 유틸리티 파일이 `src/components/battle/utils/` 디렉토리에 생성됨

---

## 📁 파일 구조

```
src/components/battle/
├── LegacyBattleApp.jsx          (4,301줄 - 메인 전투 컴포넌트)
├── LegacyBattleScreen.jsx       (전투 화면 래퍼)
├── battleData.js                (카드/적 데이터)
├── legacy-battle.css            (스타일)
└── utils/
    ├── battleUtils.js           (116줄 - 기본 유틸리티)
    ├── comboDetection.js        (98줄 - 포커 조합 감지)
    ├── etherCalculations.js     (93줄 - 에테르 계산)
    └── combatUtils.js           (52줄 - 전투 시퀀스)
```

---

## 📦 모듈 상세 설명

### 1. battleUtils.js
**용도**: 카드 특성 및 스탯 적용 관련 기본 유틸리티

#### 주요 함수
```javascript
// 배열에서 랜덤 선택
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 카드가 특정 특성을 가지고 있는지 확인
export function hasTrait(card, traitId)

// 카드에 특성 효과 적용 (11가지 특성)
export function applyTraitModifiers(card, context = {})

// 힘 스탯을 카드에 적용
export function applyStrengthToCard(card, strength = 0, isPlayerCard = true)

// 손패 전체에 힘 스탯 적용
export function applyStrengthToHand(hand, strength = 0)

// 카드 희귀도 반환
export const getCardRarity = (card) => card?.rarity || 'common';
```

#### 지원하는 특성 (Traits)
1. **strongbone** (강골): 피해량/방어력 25% 증가
2. **weakbone** (약골): 피해량/방어력 20% 감소
3. **destroyer** (파괴자): 공격력 50% 증가
4. **slaughter** (도살): 기본피해량 75% 증가
5. **pinnacle** (정점): 피해량 2.5배
6. **cooperation** (협동): 조합 대상이 되면 50% 추가 보너스
7. **swift** (신속함): 속도 코스트 25% 감소
8. **slow** (굼뜸): 속도 코스트 33% 증가
9. **mastery** (숙련): 사용할수록 시간 감소 (사용 횟수 × 2)
10. **boredom** (싫증): 사용할수록 시간 증가 (사용 횟수 × 2)
11. **outcast** (소외): 행동력 1 감소 (최소 0), 조합 계산에서 제외

---

### 2. comboDetection.js
**용도**: 포커 스타일 조합 감지 및 처리

#### 주요 함수
```javascript
// 포커 조합 감지
export function detectPokerCombo(cards)

// 조합 보너스 적용 (_combo 태그 추가)
export function applyPokerBonus(cards, combo)
```

#### 지원하는 포커 조합
1. **하이카드** (High Card): 조합 없음
2. **페어** (Pair): 같은 코스트 2장
3. **투페어** (Two Pair): 같은 코스트 2쌍
4. **트리플** (Triple): 같은 코스트 3장
5. **플러쉬** (Flush): 모두 공격 또는 모두 방어 (4장 이상)
6. **풀하우스** (Full House): 트리플 + 페어
7. **포카드** (Four of a Kind): 같은 코스트 4장
8. **파이브카드** (Five of a Kind): 같은 코스트 5장

#### 조합 감지 로직
- **outcast** 특성 카드는 조합 계산에서 제외
- 유효 카드가 없으면 null 반환
- 카드 1장은 자동으로 "하이카드"
- 플러쉬는 4장 이상 필요

---

### 3. etherCalculations.js
**용도**: 에테르 획득량 계산 및 디플레이션 적용

#### 주요 상수
```javascript
// 조합별 에테르 배율
export const COMBO_MULTIPLIERS = {
  '하이카드': 1,
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.25,
  '풀하우스': 3.5,
  '포카드': 4,
  '파이브카드': 5,
};

// 카드 희귀도별 에테르 획득량
export const CARD_ETHER_BY_RARITY = {
  common: 10,
  rare: 25,
  special: 100,
  legendary: 500
};

export const BASE_ETHER_PER_CARD = 10;
```

#### 주요 함수
```javascript
// 에테르 디플레이션 적용 (반복 사용 페널티)
export function applyEtherDeflation(baseGain, comboName, comboUsageCount, deflationMultiplier = 0.5)

// 카드의 에테르 획득량 반환
export const getCardEtherGain = (card)

// 카드 배열의 총 에테르 계산
export const calcCardsEther = (cards = [], multiplier = 1)

// 조합 에테르 획득량 계산 (디플레이션 포함)
export function calculateComboEtherGain({ cards, cardCount, comboName, comboUsageCount, extraMultiplier })
```

#### 에테르 디플레이션 시스템
같은 조합을 반복 사용하면 획득량이 감소:
- **1번째**: 100%
- **2번째**: 50%
- **3번째**: 25%
- **4번째**: 12.5%
- 계속 감소하여 0에 수렴

공식: `Math.pow(0.5, 사용횟수)`

---

### 4. combatUtils.js
**용도**: 전투 시퀀스 및 전투 관련 유틸리티

#### 주요 함수
```javascript
// 플레이어와 적의 카드를 속도 순서대로 정렬
export function sortCombinedOrderStablePF(playerCards, enemyCards, playerAgility = 0, enemyAgility = 0)

// 에테르 포인트 추가
export function addEther(pts, add)
```

#### sortCombinedOrderStablePF 동작 방식
1. 플레이어/적 카드를 각각 누적 속도 계산
2. 민첩 스탯 적용 (applyAgility)
3. 속도 순서로 정렬:
   - 1차: 누적 속도 (sp)
   - 2차: 행동자 (플레이어 우선)
   - 3차: 인덱스 (순서 유지)

---

## 🔄 LegacyBattleApp.jsx 변경사항

### import 구문 추가
```javascript
import { choice, hasTrait, applyTraitModifiers, applyStrengthToCard, applyStrengthToHand, getCardRarity } from "./utils/battleUtils";
import { detectPokerCombo, applyPokerBonus } from "./utils/comboDetection";
import { COMBO_MULTIPLIERS, BASE_ETHER_PER_CARD, CARD_ETHER_BY_RARITY, applyEtherDeflation, getCardEtherGain, calcCardsEther, calculateComboEtherGain } from "./utils/etherCalculations";
import { sortCombinedOrderStablePF, addEther } from "./utils/combatUtils";
```

### 제거된 함수들
- `choice` → battleUtils.js로 이동
- `hasTrait` → battleUtils.js로 이동
- `applyTraitModifiers` → battleUtils.js로 이동
- `applyStrengthToCard` → battleUtils.js로 이동
- `applyStrengthToHand` → battleUtils.js로 이동
- `getCardRarity` → battleUtils.js로 이동
- `detectPokerCombo` → comboDetection.js로 이동
- `applyPokerBonus` → comboDetection.js로 이동
- `applyEtherDeflation` → etherCalculations.js로 이동
- `calculateComboEtherGain` → etherCalculations.js로 이동
- `sortCombinedOrderStablePF` → combatUtils.js로 이동
- `addEther` → combatUtils.js로 이동

---

## 🎯 사용 예시

### 예시 1: 카드에 특성 적용
```javascript
import { applyTraitModifiers } from './utils/battleUtils';

const card = { name: "Attack", damage: 10, speedCost: 5, traits: ['strongbone'] };
const modifiedCard = applyTraitModifiers(card);
// modifiedCard.damage = 13 (25% 증가)
```

### 예시 2: 포커 조합 감지
```javascript
import { detectPokerCombo } from './utils/comboDetection';

const cards = [
  { name: "Card1", actionCost: 2, type: "attack" },
  { name: "Card2", actionCost: 2, type: "attack" },
  { name: "Card3", actionCost: 3, type: "attack" }
];

const combo = detectPokerCombo(cards);
// combo = { name: '페어', bonusKeys: Set(1) {2} }
```

### 예시 3: 에테르 계산
```javascript
import { calculateComboEtherGain } from './utils/etherCalculations';

const result = calculateComboEtherGain({
  cards: [
    { name: "Card1", rarity: 'common' },
    { name: "Card2", rarity: 'common' }
  ],
  comboName: '페어',
  comboUsageCount: { '페어': 1 }, // 이미 1번 사용함
  extraMultiplier: 1
});

// result = {
//   gain: 10,              // 디플레이션 적용 후 최종 획득량
//   baseGain: 20,          // 기본 획득량 (10 + 10)
//   comboMult: 2,          // 조합 배율
//   deflationPct: 50,      // 디플레이션 50%
//   deflationMult: 0.5     // 디플레이션 배율
// }
```

---

## 🔍 주의사항

### 1. 함수 의존성
- `comboDetection.js`는 `battleUtils.js`의 `hasTrait`를 import함
- `etherCalculations.js`는 `battleUtils.js`의 `getCardRarity`를 import함
- `combatUtils.js`는 `agilityUtils.js`의 `applyAgility`를 import함

### 2. 상태 관리
- 이 모듈들은 순수 함수(pure functions)로 구성
- 부작용(side effects) 없음
- 상태는 LegacyBattleApp.jsx에서 관리

### 3. 타입 체크
- JavaScript로 작성되어 타입 체크 없음
- JSDoc 주석으로 타입 힌트 제공
- TypeScript로 마이그레이션 시 인터페이스 정의 필요

---

## 🚀 향후 개선 방향

### 단기 목표
1. **TypeScript 마이그레이션**
   - 타입 안정성 확보
   - 인터페이스 정의
   - 런타임 오류 감소

2. **테스트 코드 작성**
   - 각 유틸리티 함수에 대한 단위 테스트
   - 포커 조합 감지 로직 테스트
   - 에테르 계산 정확성 검증

3. **추가 모듈 분리**
   - `applyAction` 함수 분리 → `combatActions.js`
   - 버프/디버프 로직 분리 → `statusEffects.js`
   - 타임라인 로직 분리 → `timelineUtils.js`

### 장기 목표 (Electron 포팅 대비)
1. **상태 관리 라이브러리 도입**
   - Redux 또는 Zustand 고려
   - 전투 상태를 글로벌 스토어로 관리

2. **React Hooks 분리**
   - `useBattleState.js` - 전투 상태 관리
   - `useTimeline.js` - 타임라인 관리
   - `useEtherSystem.js` - 에테르 시스템 관리

3. **UI 컴포넌트 분리**
   - `<Timeline />` - 타임라인 표시
   - `<CardHand />` - 손패 관리
   - `<BattleLog />` - 전투 로그 표시
   - `<EtherDisplay />` - 에테르 UI

---

## 📝 커밋 히스토리

```
cae4824 [리팩토링 4/5] 전투 유틸리티 함수 분리 완료
d36de12 [리팩토링 3/7] 에테르 계산 로직 분리 완료
33293b5 [리팩토링 2/7] 포커 조합 감지 로직 분리 완료
d5f05f8 [리팩토링 1/7] 유틸리티 함수 import 통합 완료
d7294b4 [리팩토링 1/7] 기본 유틸리티 함수 분리
```

---

## 🤝 다른 AI에게 인수인계 시

### 필수 확인 사항
1. `src/components/battle/utils/` 디렉토리의 4개 파일 존재 확인
2. `LegacyBattleApp.jsx`의 import 구문 확인
3. 빌드 성공 여부 확인 (`npm run build`)
4. 게임 실행 시 전투 시스템 정상 작동 확인

### 추가 작업이 필요한 경우
- 새로운 카드 특성 추가: `battleUtils.js`의 `applyTraitModifiers` 수정
- 새로운 포커 조합 추가: `comboDetection.js`의 `detectPokerCombo` 수정
- 조합 배율 조정: `etherCalculations.js`의 `COMBO_MULTIPLIERS` 수정
- 희귀도별 에테르 조정: `etherCalculations.js`의 `CARD_ETHER_BY_RARITY` 수정

---

## 📞 문의 사항

리팩토링 관련 질문이나 버그 발견 시:
1. 이 문서를 먼저 참고
2. 각 유틸리티 파일의 JSDoc 주석 확인
3. `LegacyBattleApp.jsx`에서 함수 사용 패턴 확인

**문서 작성일**: 2025-12-02
**문서 버전**: 1.0
