# 전투 시스템 API 문서

**모듈**: `src/components/battle/`
**작성일**: 2026-01-01
**프로젝트**: 하하하GO

---

## 목차

1. [전투 시스템 개요](#전투-시스템-개요)
2. [주요 컴포넌트](#주요-컴포넌트)
3. [전투 상태 (BattleState)](#전투-상태-battlestate)
4. [전투 흐름](#전투-흐름)
5. [주요 훅 API](#주요-훅-api)
6. [타임라인 시스템](#타임라인-시스템)
7. [카드 실행 로직](#카드-실행-로직)
8. [전투 액션 (BattleActions)](#전투-액션-battleactions)
9. [타이밍 상수](#타이밍-상수)

---

## 전투 시스템 개요

하하하GO의 전투 시스템은 **포커 조합 기반 턴제 전략 카드 게임**입니다.

### 핵심 특징

- **페이즈 기반 전투**: `select` → `respond` → `resolve` 순서로 진행
- **타임라인 시스템**: 속도(speed) 기반 행동 순서 결정
- **에테르 시스템**: 인플레이션/디플레이션 메커니즘
- **통찰 레벨**: 적 정보 노출 정도 제어
- **다중 유닛**: 여러 적 유닛 동시 전투 지원

### 기술 스택

- **상태 관리**: `useReducer` + 커스텀 훅
- **컨텍스트**: `BattleContext` (prop drilling 방지)
- **애니메이션**: CSS transitions + setTimeout 타이밍 제어
- **타입 안정성**: TypeScript 타입 시스템

---

## 주요 컴포넌트

### BattleScreen

**경로**: `src/components/battle/BattleScreen.tsx`

전투 화면의 진입점 컴포넌트. 게임 스토어에서 전투 데이터를 가져와 `BattlePayload`를 생성하고 `BattleApp`을 렌더링합니다.

#### Props

```typescript
interface BattleScreenProps {
  // Props 없음 - useGameStore에서 상태 가져옴
}
```

#### 주요 기능

- 전투 페이로드 생성 (`buildBattlePayload`)
- 적 유닛 데이터 처리 (단일/다중)
- 전투 결과 처리 (`handleBattleResult`)
- 개발자 도구 토글 (Alt + D)

#### 사용 예시

```typescript
import { BattleScreen } from './components/battle/BattleScreen';

// 게임에서 전투 시작 시
<BattleScreen />
```

---

### BattleApp

**경로**: `src/components/battle/BattleApp.tsx`

전투 시스템의 메인 오케스트레이션 컴포넌트. 모든 전투 로직과 UI를 조율합니다.

#### Props

```typescript
interface BattleAppProps {
  initialPlayer: BattlePayload['player'];   // 플레이어 초기 상태
  initialEnemy: BattlePayload['enemy'];     // 적 초기 상태
  playerEther?: number;                     // 플레이어 에테르
  liveInsight?: number;                     // 동적 통찰 레벨
  onBattleResult?: (result: BattleResult) => void; // 전투 종료 콜백
}
```

#### 주요 책임

1. **상태 초기화**: `useBattleState` 훅으로 전투 상태 관리
2. **훅 오케스트레이션**: 20+ 커스텀 훅 조율
3. **UI 렌더링**: 손패, 타임라인, HP/에테르 바 등
4. **전투 진행**: 페이즈 전환, 카드 실행, 턴 종료

#### 사용하는 주요 훅

```typescript
// 상태 관리
useBattleState()           // 메인 상태 리듀서
useDerivedBattleState()    // 파생 상태

// 전투 로직
useCardSelection()         // 카드 선택
useHandManagement()        // 손패 관리
usePhaseTransition()       // 페이즈 전환
useResolveExecution()      // 타임라인 실행

// 시스템
useBattleTimelines()       // 타임라인 계산
useInsightSystem()         // 통찰 시스템
useComboSystem()           // 콤보 감지
useEtherAnimation()        // 에테르 애니메이션

// UI/UX
useDamagePreview()         // 데미지 미리보기
useCardTooltip()           // 카드 툴팁
useKeyboardShortcuts()     // 키보드 단축키
useMultiTargetSelection()  // 다중 타겟 선택
```

---

### BattleContext

**경로**: `src/components/battle/context/BattleContext.tsx`

전투 관련 상태와 유틸리티를 Context로 제공하여 prop drilling을 방지합니다.

#### Context Value

```typescript
interface BattleContextValue {
  battle: Battle;           // 전투 상태 (phase, hand, selected 등)
  player: Player;           // 플레이어 상태
  enemy: Enemy;             // 적 상태
  enemyUnits: EnemyUnit[];  // 다중 적 유닛 배열
  actions: Actions;         // 상태 변경 액션
  formatters: Formatters;   // 포맷팅 유틸리티
}
```

#### 사용 예시

```typescript
import { useBattleContext } from './context/BattleContext';

function MyComponent() {
  const { battle, player, enemy, actions } = useBattleContext();

  const handleAttack = () => {
    actions.updateEnemy({ hp: enemy.hp - 10 });
  };

  return <div>HP: {player.hp}</div>;
}
```

---

## 전투 상태 (BattleState)

### FullBattleState

**경로**: `src/components/battle/reducer/battleReducerState.ts`

전체 전투 상태를 담는 중앙 타입입니다.

#### 주요 카테고리

```typescript
interface FullBattleState {
  // === 플레이어 & 적 상태 ===
  player: PlayerState;              // 플레이어 유닛
  enemy: EnemyState;                // 적 유닛
  enemyIndex: number;               // 현재 적 인덱스
  selectedTargetUnit: number;       // 선택된 타겟 유닛 ID

  // === 전투 페이즈 ===
  phase: BattlePhase;               // 'select' | 'respond' | 'resolve' | 'victory' | 'defeat'

  // === 카드 관리 ===
  hand: Card[];                     // 손패
  selected: Card[];                 // 선택된 카드
  canRedraw: boolean;               // 재뽑기 가능 여부
  sortType: SortType;               // 'cost' | 'speed' | 'type'
  vanishedCards: Card[];            // 소멸된 카드
  usedCardIndices: number[];        // 사용된 카드 인덱스
  disappearingCards: number[];      // 사라지는 중인 카드
  hiddenCards: number[];            // 숨겨진 카드
  disabledCardIndices: number[];    // 비활성화된 카드
  cardUsageCount: Record<string, number>; // 카드 사용 횟수

  // === 덱/무덤 시스템 ===
  deck: Card[];                     // 덱
  discardPile: Card[];              // 무덤

  // === 적 계획 ===
  enemyPlan: EnemyPlan;             // { actions: AICard[], mode: AIMode | null }

  // === 실행 큐 & 순서 ===
  fixedOrder: OrderItem[] | null;   // 고정 순서 (속도 기반)
  queue: OrderItem[];               // 실행 큐
  qIndex: number;                   // 현재 큐 인덱스

  // === 전투 로그 & 이벤트 ===
  log: string[];                    // 전투 로그
  actionEvents: Record<string, BattleEvent[]>; // 액션별 이벤트

  // === 턴 관리 ===
  turnNumber: number;               // 현재 턴

  // === 에테르 시스템 ===
  turnEtherAccumulated: number;     // 턴당 누적 에테르
  enemyTurnEtherAccumulated: number;
  netEtherDelta: number | null;     // 순 에테르 변화량
  etherAnimationPts: number | null;
  etherFinalValue: number | null;
  enemyEtherFinalValue: number | null;
  etherCalcPhase: EtherCalcPhase;   // 'inflate' | 'deflate' | 'transfer' | null
  enemyEtherCalcPhase: EtherCalcPhase;
  currentDeflation: DeflationInfo | null;
  enemyCurrentDeflation: DeflationInfo | null;
  etherPulse: boolean;
  playerTransferPulse: boolean;
  enemyTransferPulse: boolean;

  // === 기원(Overdrive) 연출 ===
  willOverdrive: boolean;           // 기원 예정 여부
  playerOverdriveFlash: boolean;
  enemyOverdriveFlash: boolean;
  soulShatter: boolean;

  // === 타임라인 ===
  timelineProgress: number;         // 타임라인 진행도 (0~100)
  timelineIndicatorVisible: boolean;
  executingCardIndex: number | null; // 실행 중인 카드 인덱스

  // === UI 상태 ===
  isSimplified: boolean;            // 간소화 모드
  showCharacterSheet: boolean;
  showPtsTooltip: boolean;
  showBarTooltip: boolean;

  // === 상징 ===
  orderedRelics: Relic[];

  // === 전투 종료 후 ===
  postCombatOptions: PostCombatOptions | null;

  // === 다음 턴 효과 ===
  nextTurnEffects: NextTurnEffects;

  // === 애니메이션 ===
  playerHit: boolean;
  enemyHit: boolean;
  playerBlockAnim: boolean;
  enemyBlockAnim: boolean;

  // === 자동진행 & 스냅샷 ===
  autoProgress: boolean;
  resolveStartPlayer: PlayerState | null;
  resolveStartEnemy: EnemyState | null;
  respondSnapshot: RespondSnapshot | null;
  rewindUsed: boolean;

  // === 상징 UI ===
  hoveredRelic: string | null;
  relicActivated: string | null;
  activeRelicSet: Set<string>;
  multiplierPulse: boolean;

  // === 전투 진행 ===
  resolvedPlayerCards: number;

  // === 카드 툴팁 ===
  hoveredCard: HoveredCard | null;
  tooltipVisible: boolean;
  previewDamage: PreviewDamage;
  perUnitPreviewDamage: Record<number, PreviewDamage>;

  // === 통찰 시스템 ===
  insightBadge: InsightBadge;
  insightAnimLevel: number;
  insightAnimPulseKey: number;
  showInsightTooltip: boolean;

  // === 적 행동 툴팁 ===
  hoveredEnemyAction: HoveredEnemyAction | null;

  // === 카드 파괴/빙결 애니메이션 ===
  destroyingEnemyCards: number[];
  freezingEnemyCards: number[];
  frozenOrder: number;

  // === 피해 분배 시스템 ===
  distributionMode: boolean;
  pendingDistributionCard: Card | null;
  damageDistribution: Record<number, number>;
  totalDistributableDamage: number;

  // === 성찰 시스템 (레거시) ===
  reflectionState?: ReflectionBattleState;
}
```

### PlayerState / EnemyState

```typescript
interface PlayerState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;
  strength: number;
  insight: number;
  maxSpeed: number;
  etherPts: number;
  tokens: TokenState;  // { permanent, turn, usage }
}

interface EnemyState {
  name: string;
  hp: number;
  maxHp: number;
  deck: Card[];
  composition: EnemyComposition[];
  etherPts: number;
  etherCapacity: number;
  enemyCount: number;
  maxSpeed: number;
  passives: Record<string, any>;
  cardsPerTurn: number;
  ether: number;
  units: EnemyUnitState[];
  tokens: TokenState;
}
```

### 초기 상태 생성

```typescript
import { createInitialState } from './reducer/battleReducer';

const initialState = createInitialState({
  initialPlayerState: {
    hp: 100,
    maxHp: 100,
    energy: 6,
    maxEnergy: 6,
    // ...
  },
  initialEnemyState: {
    name: '구울',
    hp: 40,
    maxHp: 40,
    // ...
  },
  initialPlayerRelics: [],
  simplifiedMode: false,
  sortType: 'cost'
});
```

---

## 전투 흐름

### 페이즈 전환

```
┌──────────┐
│  select  │  카드 선택 단계
└────┬─────┘
     │ [제출] 버튼
     ▼
┌──────────┐
│ respond  │  적 대응 단계 (통찰 레벨에 따라 정보 노출)
└────┬─────┘
     │ [진행] 버튼
     ▼
┌──────────┐
│ resolve  │  타임라인 진행 단계
└────┬─────┘
     │ 모든 카드 실행 완료
     ▼
┌──────────┐
│  select  │  다음 턴 시작
└──────────┘
```

### 1. Select 페이즈

**목적**: 플레이어가 이번 턴에 사용할 카드를 선택합니다.

**주요 동작**:
- 손패에서 카드 선택/해제
- 최대 제출 가능 카드 수 확인 (`MAX_SUBMIT_CARDS`)
- 에너지 소모 미리보기
- 데미지 미리보기 (`useDamagePreview`)
- 카드 재뽑기 (턴당 1회)

**주요 함수**:
```typescript
// 카드 선택
const handleSelectCard = (card: Card, index: number) => {
  if (selected.length < maxSubmitCards) {
    actions.addSelected(card);
  }
};

// 제출
const handleSubmit = () => {
  actions.setPhase('respond');
};
```

---

### 2. Respond 페이즈

**목적**: 적이 대응 행동을 결정하고, 플레이어는 적 정보를 확인합니다.

**주요 동작**:
- 적 AI가 행동 계획 생성 (`generateEnemyActions`)
- 통찰 레벨에 따라 적 카드 노출
- 플레이어가 전략 조정 가능 (되감기 가능)
- 타임라인 순서 계산

**통찰 레벨별 정보 노출**:

| 레벨 | 이름 | 효과 |
|------|------|------|
| -3 | 망각 | 타임라인, 적 체력/에테르 확인 불가 |
| -2 | 미련 | 진행단계에서 적 타임라인 확인 불가 |
| -1 | 우둔 | 대응단계에서 적 타임라인 확인 불가 |
| 0 | 평온 | 선택단계에서 적 카드 3개 확인 |
| +1 | 예측 | 선택단계에서 적 카드 2개 확인 |
| +2 | 독심 | 선택단계에서 적 카드 모두 확인 |
| +3 | 혜안 | 적 카드 모두 + 카드 정보 확인 |

**주요 함수**:
```typescript
const handleProceed = () => {
  // 타임라인 생성
  const fixedOrder = createFixedOrder(
    player,
    enemy,
    selected,
    enemyPlan.actions
  );

  actions.setFixedOrder(fixedOrder);
  actions.setQueue(fixedOrder);
  actions.setPhase('resolve');
};
```

---

### 3. Resolve 페이즈

**목적**: 타임라인 순서대로 카드를 실행합니다.

**주요 동작**:
- 타임라인 시곗바늘 이동 (250ms)
- 카드 발동 + 흔들림 애니메이션 (200ms)
- 카드 효과 실행 (`executeCardAction`)
- 자동진행 대기 (450ms)
- 모든 카드 실행 완료 시 턴 종료

**타임라인 진행**:
```typescript
const stepOnce = () => {
  const currentQIndex = battle.qIndex;
  const action = battle.queue[currentQIndex];

  if (!action) {
    finishTurn();
    return;
  }

  // 1. 시곗바늘 이동 애니메이션
  actions.setTimelineProgress((currentQIndex / queue.length) * 100);

  setTimeout(() => {
    // 2. 카드 실행 애니메이션
    actions.setExecutingCardIndex(currentQIndex);

    setTimeout(() => {
      // 3. 카드 효과 적용
      executeCardAction(action);

      // 4. 다음 카드로 이동
      actions.incrementQIndex();

      if (autoProgress && currentQIndex < queue.length - 1) {
        setTimeout(stepOnce, TIMING.AUTO_PROGRESS_DELAY); // 450ms
      }
    }, TIMING.CARD_SHAKE_DURATION); // 200ms
  }, TIMING.TIMELINE_TICK); // 250ms
};
```

**타이밍 동기화 (중요!)**:

| 항목 | 값 | 위치 |
|------|-----|------|
| 시곗바늘 이동 | 0.25s (250ms) | `TimelineDisplay.tsx` transition |
| 카드 발동 대기 | 250ms | `BattleApp.tsx` |
| 카드 흔들림 | 200ms | `BattleApp.tsx` |
| 자동진행 딜레이 | 450ms | `BattleApp.tsx` |

⚠️ **주의**: 자동진행 딜레이를 450ms 미만으로 줄이면 카드 실행 버그 발생!

---

## 주요 훅 API

### useBattleState

**경로**: `src/components/battle/hooks/useBattleState.ts`

전투 상태를 관리하는 메인 훅입니다. `useReducer` 기반으로 구현되었습니다.

#### 사용법

```typescript
import { useBattleState } from './hooks/useBattleState';

const { battle, actions } = useBattleState({
  player: initialPlayerState,
  enemy: initialEnemyState,
  phase: 'select',
  hand: [],
  selected: [],
  // ...
});

// 상태 읽기
console.log(battle.player.hp);
console.log(battle.phase);

// 상태 변경
actions.updatePlayer({ hp: 90 });
actions.setPhase('respond');
```

#### 반환 타입

```typescript
interface UseBattleStateResult {
  battle: FullBattleState;
  actions: BattleActions;
}
```

---

### useTimeline

**경로**: `src/components/battle/hooks/useTimeline.ts`

타임라인 진행 상태를 관리합니다.

#### 사용법

```typescript
import { useTimeline } from './hooks/useTimeline';

const {
  progress,          // 진행도 (0~100)
  isPlaying,         // 재생 중 여부
  currentCard,       // 현재 카드
  currentIndex,      // 현재 인덱스
  hasNext,           // 다음 카드 존재 여부
  hasPrev,           // 이전 카드 존재 여부
  totalCards,        // 총 카드 수
  completionRatio,   // 완료율 (%)
  play,              // 재생
  pause,             // 일시정지
  toggle,            // 토글
  reset,             // 리셋
} = useTimeline(queue, currentIndex, {
  speed: 100,        // 진행 속도 (ms)
  auto: false,       // 자동 진행
  onProgress: (idx) => console.log('Progress:', idx)
});
```

#### 옵션

```typescript
interface TimelineOptions {
  speed?: number;                      // 진행 속도 (ms) default: 100
  auto?: boolean;                      // 자동 진행 여부 default: false
  onProgress?: ((index: number) => void) | null; // 진행 시 콜백
}
```

---

### useDamagePreview

**경로**: `src/components/battle/hooks/useDamagePreview.ts`

선택한 카드의 예상 데미지를 계산합니다.

#### 사용법

```typescript
import { useDamagePreview } from './hooks/useDamagePreview';

const {
  totalDamage,       // 총 데미지
  isLethal,          // 치명타 여부
  perUnitDamage,     // 유닛별 데미지
  updatePreview,     // 미리보기 갱신
} = useDamagePreview({
  selected: selectedCards,
  player: playerState,
  enemy: enemyState,
  enemyUnits: enemyUnits
});
```

---

### useInsightSystem

**경로**: `src/components/battle/hooks/useInsightSystem.ts`

통찰 레벨 시스템을 관리합니다.

#### 사용법

```typescript
import { useInsightSystem } from './hooks/useInsightSystem';

const {
  currentInsight,    // 현재 통찰 레벨
  insightName,       // 통찰 레벨 이름
  canSeeTimeline,    // 타임라인 확인 가능 여부
  canSeeEnemyCards,  // 적 카드 확인 가능 여부
  visibleEnemyCount, // 확인 가능한 적 카드 수
  modifyInsight,     // 통찰 레벨 변경
} = useInsightSystem(initialInsight);
```

---

### useComboSystem

**경로**: `src/components/battle/hooks/useComboSystem.ts`

포커 조합을 감지하고 배수를 계산합니다.

#### 사용법

```typescript
import { useComboSystem } from './hooks/useComboSystem';

const {
  comboType,         // 조합 타입 ('PAIR', 'TRIPLE', 'STRAIGHT' 등)
  multiplier,        // 배수 (1.0 ~ 3.0)
  comboName,         // 조합 이름 (한글)
  isComboActive,     // 조합 활성 여부
} = useComboSystem(selectedCards);
```

---

### useCardSelection

**경로**: `src/components/battle/hooks/useCardSelection.ts`

카드 선택 로직을 처리합니다.

#### 사용법

```typescript
import { useCardSelection } from './hooks/useCardSelection';

const {
  selectCard,        // 카드 선택
  deselectCard,      // 카드 선택 해제
  clearSelection,    // 선택 초기화
  isCardSelected,    // 카드 선택 여부 확인
  canSelectMore,     // 추가 선택 가능 여부
} = useCardSelection({
  selected: battle.selected,
  maxSubmitCards: 5,
  onSelect: actions.addSelected,
  onDeselect: actions.removeSelected
});
```

---

### useHandManagement

**경로**: `src/components/battle/hooks/useHandManagement.ts`

손패 관리 (드로우, 정렬, 재뽑기)를 처리합니다.

#### 사용법

```typescript
import { useHandManagement } from './hooks/useHandManagement';

const {
  drawCards,         // 카드 뽑기
  sortHand,          // 손패 정렬
  redrawHand,        // 손패 재뽑기
  shuffleDiscardIntoDeck, // 무덤 → 덱
} = useHandManagement({
  deck: battle.deck,
  hand: battle.hand,
  discardPile: battle.discardPile,
  actions: actions
});
```

---

### useEtherAnimation

**경로**: `src/components/battle/hooks/useEtherAnimation.ts`

에테르 증감 애니메이션을 처리합니다.

#### 사용법

```typescript
import { useEtherAnimation } from './hooks/useEtherAnimation';

const {
  animateEther,      // 에테르 애니메이션 시작
  isAnimating,       // 애니메이션 진행 중
  currentValue,      // 현재 애니메이션 값
} = useEtherAnimation();

// 에테르 증가 애니메이션
animateEther({
  from: 100,
  to: 150,
  duration: 1000,
  onComplete: () => console.log('Done!')
});
```

---

## 타임라인 시스템

### 속도 기반 순서 결정

타임라인은 카드의 `speed` 값에 따라 행동 순서를 결정합니다.

#### 속도 계산

```typescript
// 카드 속도 = 기본 속도 + 플레이어/적 민첩성
const playerCardSpeed = card.speed + player.agility;
const enemyCardSpeed = card.speed + enemy.agility;
```

#### 순서 생성

```typescript
import { createFixedOrder } from './utils/cardOrdering';

const fixedOrder = createFixedOrder(
  player,
  enemy,
  playerSelectedCards,
  enemyActions
);

// 결과: OrderItem[]
// OrderItem = { actor: 'player' | 'enemy', card: Card, speed: number }
```

#### OrderItem 타입

```typescript
interface OrderItem {
  actor: 'player' | 'enemy';
  card: Card;
  speed: number;
  sourceUnitId?: number; // 다중 유닛 시 출처
}
```

### 타임라인 표시

```typescript
import { TimelineDisplay } from './ui/TimelineDisplay';

<TimelineDisplay
  queue={battle.queue}
  qIndex={battle.qIndex}
  progress={battle.timelineProgress}
  executingCardIndex={battle.executingCardIndex}
  visible={battle.timelineIndicatorVisible}
/>
```

### 타임라인 진행 제어

```typescript
// 한 단계씩 진행
const stepOnce = () => {
  // 구현은 BattleApp.tsx 참조
};

// 자동 진행
const runAll = () => {
  actions.setAutoProgress(true);
  stepOnce();
};

// 일시정지
const pause = () => {
  actions.setAutoProgress(false);
};
```

---

## 카드 실행 로직

### executeCardAction

**경로**: `src/components/battle/logic/battleExecution.ts`

카드를 실행하고 효과를 적용합니다.

#### 처리 흐름

```
1. 전처리 (Pre-processing)
   ├─ 카드 특성 확인 (Traits)
   ├─ 토큰 소모 (Burn, Required 등)
   └─ 카드 변조 효과 적용

2. 카드 타입별 실행
   ├─ attack: applyAttack()
   ├─ defense: applyDefense()
   ├─ special: processSpecialCard()
   └─ combo: applyComboEffects()

3. 후처리 (Post-processing)
   ├─ 이벤트 애니메이션 (processActionEventAnimations)
   ├─ 상징 효과 (processCardPlayedRelicEffects)
   ├─ 카드 창조 (generateBreachCards 등)
   └─ 턴 종료 효과 (processAllNextTurnEffects)

4. 상태 업데이트
   ├─ HP/에너지/블록 갱신
   ├─ 토큰 만료 처리
   ├─ 승패 판정
   └─ 로그 기록
```

#### 사용 예시

```typescript
import { executeCardActionCore } from './logic/battleExecution';

// 카드 실행
const result = executeCardActionCore({
  action: orderItem,
  battleRef: battleRef,
  actions: actions,
  // ... 기타 파라미터
});

// 결과 반영
actions.updatePlayer(result.newPlayer);
actions.updateEnemy(result.newEnemy);
actions.addLog(result.logs);
```

---

### applyAttack / applyDefense

**경로**: `src/components/battle/logic/combatActions.ts`

공격/방어 행동을 처리합니다.

#### applyAttack

```typescript
import { applyAttack } from './logic/combatActions';

const result = applyAttack(
  attacker,          // 공격자 Combatant
  defender,          // 방어자 Combatant
  card,              // 사용된 카드
  attackerName,      // 'player' | 'enemy'
  battleContext      // 전투 컨텍스트
);

// AttackResult 타입
interface AttackResult {
  attacker: Combatant;
  defender: Combatant;
  dealt: number;           // 입힌 데미지
  taken: number;           // 받은 데미지 (반격)
  events: BattleEvent[];   // 이벤트 목록
  logs: string[];          // 로그 메시지
  isCritical?: boolean;    // 치명타 여부
  createdCards?: Card[];   // 생성된 카드
  defenderTimelineAdvance?: number; // 방어자 타임라인 전진
  queueModifications?: any; // 큐 수정 정보
}
```

#### applyDefense

```typescript
import { applyDefense } from './logic/combatActions';

const result = applyDefense(
  defender,          // 방어자 Combatant
  card,              // 사용된 카드
  defenderName,      // 'player' | 'enemy'
  battleContext      // 전투 컨텍스트
);

// 방어 효과 적용
const newBlock = defender.block + card.block;
```

---

### 다중 타격 처리

**경로**: `src/components/battle/logic/multiHitExecution.ts`

`hits` 속성이 있는 카드의 다중 타격을 처리합니다.

#### 사용 예시

```typescript
import { executeMultiHitAsync } from './logic/multiHitExecution';

// 다중 타격 비동기 실행
await executeMultiHitAsync({
  card: { name: '연타', damage: 5, hits: 3 },
  attacker: player,
  defender: enemy,
  attackerName: 'player',
  battleContext: context,
  onHitComplete: (hitIndex, result) => {
    console.log(`${hitIndex + 1}번째 타격: ${result.damage} 데미지`);
  }
});
```

---

## 전투 액션 (BattleActions)

### BattleActions 인터페이스

**경로**: `src/components/battle/hooks/useBattleState.ts`

`useBattleState`가 반환하는 액션 객체입니다.

```typescript
interface BattleActions {
  // === 플레이어 & 적 상태 ===
  setPlayer: (player: PlayerState) => void;
  updatePlayer: (updates: Partial<PlayerState>) => void;
  setEnemy: (enemy: EnemyState) => void;
  updateEnemy: (updates: Partial<EnemyState>) => void;
  setEnemyIndex: (index: number) => void;
  setSelectedTargetUnit: (unitId: number) => void;
  setEnemyUnits: (units: EnemyUnit[]) => void;
  updateEnemyUnit: (unitId: number, updates: Partial<EnemyUnit>) => void;

  // === 페이즈 ===
  setPhase: (phase: BattlePhase) => void;

  // === 카드 관리 ===
  setHand: (hand: Card[]) => void;
  setSelected: (selected: Card[]) => void;
  addSelected: (card: Card) => void;
  removeSelected: (index: number) => void;
  setCanRedraw: (canRedraw: boolean) => void;
  setSortType: (sortType: SortType) => void;
  setVanishedCards: (cards: Card[]) => void;
  addVanishedCard: (card: Card) => void;
  setUsedCardIndices: (indices: number[]) => void;
  setDisappearingCards: (indices: number[]) => void;
  setHiddenCards: (indices: number[]) => void;
  setDisabledCardIndices: (indices: number[]) => void;
  setCardUsageCount: (count: Record<string, number>) => void;
  incrementCardUsage: (cardId: string) => void;

  // === 덱/무덤 ===
  setDeck: (deck: Card[]) => void;
  setDiscardPile: (pile: Card[]) => void;
  addToDiscard: (cards: Card | Card[]) => void;
  drawFromDeck: (count: number) => void;
  shuffleDiscardIntoDeck: () => void;

  // === 적 계획 ===
  setEnemyPlan: (plan: EnemyPlan) => void;

  // === 실행 큐 ===
  setFixedOrder: (order: OrderItem[] | null) => void;
  setQueue: (queue: OrderItem[]) => void;
  setQIndex: (index: number) => void;
  incrementQIndex: () => void;

  // === 로그 & 이벤트 ===
  addLog: (message: string) => void;
  setLog: (log: string[]) => void;
  setActionEvents: (events: Record<string, BattleEvent[]>) => void;

  // === 턴 ===
  setTurnNumber: (turn: number) => void;
  incrementTurn: () => void;

  // === 에테르 ===
  setTurnEtherAccumulated: (ether: number) => void;
  setEnemyTurnEtherAccumulated: (ether: number) => void;
  setNetEtherDelta: (delta: number | null) => void;
  setEtherAnimationPts: (pts: number | null) => void;
  setEtherFinalValue: (value: number | null) => void;
  setEnemyEtherFinalValue: (value: number | null) => void;
  setEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setEnemyEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setCurrentDeflation: (info: DeflationInfo | null) => void;
  setEnemyCurrentDeflation: (info: DeflationInfo | null) => void;
  setEtherPulse: (pulse: boolean) => void;
  setPlayerTransferPulse: (pulse: boolean) => void;
  setEnemyTransferPulse: (pulse: boolean) => void;

  // === 기원 ===
  setWillOverdrive: (will: boolean) => void;
  setPlayerOverdriveFlash: (flash: boolean) => void;
  setEnemyOverdriveFlash: (flash: boolean) => void;
  setSoulShatter: (shatter: boolean) => void;

  // === 타임라인 ===
  setTimelineProgress: (progress: number) => void;
  setTimelineIndicatorVisible: (visible: boolean) => void;
  setExecutingCardIndex: (index: number | null) => void;

  // === UI ===
  setIsSimplified: (simplified: boolean) => void;
  setShowCharacterSheet: (show: boolean) => void;
  toggleCharacterSheet: () => void;
  setShowPtsTooltip: (show: boolean) => void;
  setShowBarTooltip: (show: boolean) => void;

  // === 상징 ===
  setOrderedRelics: (relics: Relic[]) => void;

  // === 전투 종료 ===
  setPostCombatOptions: (options: PostCombatOptions | null) => void;

  // === 다음 턴 효과 ===
  setNextTurnEffects: (effects: NextTurnEffects) => void;
  updateNextTurnEffects: (updates: Partial<NextTurnEffects>) => void;

  // === 애니메이션 ===
  setPlayerHit: (hit: boolean) => void;
  setEnemyHit: (hit: boolean) => void;
  setPlayerBlockAnim: (anim: boolean) => void;
  setEnemyBlockAnim: (anim: boolean) => void;

  // === 자동진행 & 스냅샷 ===
  setAutoProgress: (auto: boolean) => void;
  setResolveStartPlayer: (player: PlayerState | null) => void;
  setResolveStartEnemy: (enemy: EnemyState | null) => void;
  setRespondSnapshot: (snapshot: RespondSnapshot | null) => void;
  setRewindUsed: (used: boolean) => void;

  // === 상징 UI ===
  setHoveredRelic: (relic: string | null) => void;
  setRelicActivated: (relic: string | null) => void;
  setActiveRelicSet: (relics: Set<string>) => void;
  setMultiplierPulse: (pulse: boolean) => void;

  // === 전투 진행 ===
  setResolvedPlayerCards: (count: number) => void;

  // === 카드 툴팁 ===
  setHoveredCard: (card: HoveredCard | null) => void;
  setTooltipVisible: (visible: boolean) => void;
  setPreviewDamage: (damage: PreviewDamage) => void;
  setPerUnitPreviewDamage: (damage: Record<number, PreviewDamage>) => void;

  // === 통찰 시스템 ===
  setInsightBadge: (badge: InsightBadge) => void;
  setInsightAnimLevel: (level: number) => void;
  setInsightAnimPulseKey: (key: number) => void;
  setShowInsightTooltip: (show: boolean) => void;

  // === 적 행동 툴팁 ===
  setHoveredEnemyAction: (action: HoveredEnemyAction | null) => void;

  // === 카드 파괴 애니메이션 ===
  setDestroyingEnemyCards: (indices: number[]) => void;
  setFreezingEnemyCards: (indices: number[]) => void;
  setFrozenOrder: (order: number) => void;

  // === 피해 분배 ===
  setDistributionMode: (mode: boolean) => void;
  setPendingDistributionCard: (card: Card | null) => void;
  setDamageDistribution: (distribution: Record<number, number>) => void;
  updateDamageDistribution: (unitId: number, damage: number) => void;
  setTotalDistributableDamage: (damage: number) => void;
  resetDistribution: () => void;

  // === 토큰 시스템 ===
  updatePlayerTokens: (tokens: TokenState) => void;
  updateEnemyTokens: (tokens: TokenState) => void;
  addPlayerToken: (token: TokenInstance) => TokenResult;
  addEnemyToken: (token: TokenInstance) => TokenResult;
  removePlayerToken: (tokenId: string, count?: number) => TokenResult;
  removeEnemyToken: (tokenId: string, count?: number) => TokenResult;

  // === 복합 액션 ===
  resetTurn: () => void;
  resetEtherAnimation: () => void;
  resetBattle: (config: ResetConfig) => void;
}
```

### 사용 예시

```typescript
const { battle, actions } = useBattleState({ /* ... */ });

// 플레이어 HP 감소
actions.updatePlayer({ hp: battle.player.hp - 10 });

// 페이즈 전환
actions.setPhase('respond');

// 카드 선택
actions.addSelected(card);

// 타임라인 진행
actions.incrementQIndex();

// 자동진행 시작
actions.setAutoProgress(true);

// 전투 리셋
actions.resetBattle({
  player: { hp: 100, maxHp: 100 },
  enemy: { hp: 40, maxHp: 40 }
});
```

---

## 타이밍 상수

### TIMING

**경로**: `src/components/battle/logic/battleConstants.ts`

전투 애니메이션 타이밍을 정의하는 상수입니다.

```typescript
export const TIMING = {
  // 타임라인
  TIMELINE_TICK: 250,              // 시곗바늘 이동 (ms)

  // 카드 실행
  CARD_SHAKE_DURATION: 200,        // 카드 흔들림 (ms)
  CARD_FADEOUT_DELAY: 500,         // 마지막 카드 페이드아웃 지연 (ms)

  // 카드 소멸
  CARD_DISAPPEAR_START: 300,       // 카드 사라지기 시작 (ms)
  CARD_DISAPPEAR_DURATION: 200,    // 카드 사라지는 시간 (ms)

  // 자동진행
  AUTO_PROGRESS_DELAY: 450,        // 자동진행 대기 시간 (ms)

  // 애니메이션
  HIT_ANIMATION_DURATION: 300,     // 피격 애니메이션 (ms)
  BLOCK_ANIMATION_DURATION: 200,   // 블록 애니메이션 (ms)

  // 에테르
  ETHER_PULSE_DURATION: 800,       // 에테르 펄스 (ms)
  ETHER_TRANSFER_DURATION: 1200,   // 에테르 전송 (ms)

  // 다중 타격
  MULTI_HIT_INTERVAL: 150,         // 타격 간격 (ms)
};
```

---

## 예시: 전투 시스템 사용

### 기본 전투 설정

```typescript
import { BattleApp } from './components/battle/BattleApp';

function GameComponent() {
  const handleBattleResult = (result: BattleResult) => {
    if (result.result === 'victory') {
      console.log('승리!');
      // 보상 지급 로직
    } else {
      console.log('패배...');
      // 게임 오버 처리
    }
  };

  return (
    <BattleApp
      initialPlayer={{
        hp: 100,
        maxHp: 100,
        energy: 6,
        maxEnergy: 6,
        block: 0,
        strength: 0,
        insight: 0,
        maxSpeed: 30,
        etherPts: 0,
      }}
      initialEnemy={{
        name: '구울',
        hp: 40,
        maxHp: 40,
        deck: ENEMY_CARDS,
        composition: [{
          name: '구울',
          emoji: '💀',
          hp: 40,
          maxHp: 40,
          ether: 100,
          count: 1,
        }],
        etherPts: 100,
        etherCapacity: 100,
        enemyCount: 1,
        maxSpeed: 10,
        passives: {},
        cardsPerTurn: 2,
        ether: 100,
        units: [],
      }}
      playerEther={0}
      liveInsight={0}
      onBattleResult={handleBattleResult}
    />
  );
}
```

### 커스텀 전투 로직 구현

```typescript
import { useBattleState } from './hooks/useBattleState';
import { applyAttack } from './logic/combatActions';

function CustomBattle() {
  const { battle, actions } = useBattleState({ /* ... */ });

  const handlePlayerAttack = (card: Card) => {
    const result = applyAttack(
      battle.player,
      battle.enemy,
      card,
      'player',
      { /* battleContext */ }
    );

    actions.updatePlayer(result.attacker);
    actions.updateEnemy(result.defender);

    result.logs.forEach(log => actions.addLog(log));
  };

  return (
    <div>
      <button onClick={() => handlePlayerAttack(myCard)}>
        공격!
      </button>
    </div>
  );
}
```

---

## 참고 문서

- **프로젝트 가이드**: `/home/user/hahahahgo/CLAUDE.md`
- **개발 로그**: `/home/user/hahahahgo/DEVLOG.md`
- **인수인계**: `/home/user/hahahahgo/HANDOVER.md`
- **상태 관리 가이드**: `/home/user/hahahahgo/docs/STATE_MANAGEMENT_GUIDELINES.md`

---

## 변경 이력

- **2026-01-01**: 초기 문서 작성

---

**작성자**: Claude Code
**버전**: 1.0.0
**라이선스**: MIT
