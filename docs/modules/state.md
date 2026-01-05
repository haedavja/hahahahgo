# 상태 관리 API 레퍼런스

**최종 업데이트**: 2026-01-01
**버전**: 1.0.0

---

## 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [상태 접근 패턴](#상태-접근-패턴)
4. [슬라이스 레퍼런스](#슬라이스-레퍼런스)
   - [playerSlice](#playerslice)
   - [battleSlice](#battleslice)
   - [growthSlice](#growthslice)
   - [mapSlice](#mapslice)
   - [dungeonSlice](#dungeonslice)
   - [buildSlice](#buildslice)
   - [relicSlice](#relicslice)
   - [itemSlice](#itemslice)
   - [restSlice](#restslice)
   - [shopSlice](#shopslice)
   - [eventSlice](#eventslice)
   - [devSlice](#devslice)
5. [셀렉터 유틸리티](#셀렉터-유틸리티)
6. [상태 초기화](#상태-초기화)

---

## 개요

하하하GO는 **Zustand**를 사용하여 전역 상태를 관리합니다. 슬라이스 패턴을 통해 관심사별로 액션을 분리하고, 타입 안정성을 보장합니다.

### 주요 특징

- **슬라이스 패턴**: 기능별로 상태와 액션을 분리하여 유지보수성 향상
- **TypeScript**: 완벽한 타입 안정성
- **구독 미들웨어**: `subscribeWithSelector`를 통한 선택적 구독
- **불변성**: 모든 상태 업데이트는 불변 방식으로 처리

---

## 아키텍처

```
src/state/
├── gameStore.ts          # 메인 스토어 (슬라이스 조합)
├── useGameState.ts       # 초기 상태 생성
├── selectors.ts          # 셀렉터 유틸리티
├── slices/
│   ├── types.ts          # 공통 타입 정의
│   ├── index.ts          # Barrel export
│   ├── playerSlice.ts    # 플레이어 HP, 스탯, 자원
│   ├── battleSlice.ts    # 전투 시스템
│   ├── growthSlice.ts    # 피라미드 성장 시스템
│   ├── mapSlice.ts       # 맵 네비게이션
│   ├── dungeonSlice.ts   # 던전 탐험
│   ├── buildSlice.ts     # 캐릭터 빌드, 카드 관리
│   ├── relicSlice.ts     # 상징 관리
│   ├── itemSlice.ts      # 아이템 관리
│   ├── restSlice.ts      # 휴식/각성
│   ├── shopSlice.ts      # 상점
│   ├── eventSlice.ts     # 이벤트 시스템
│   └── devSlice.ts       # 개발자 도구
└── battleHelpers.ts      # 전투 헬퍼 함수
```

### 슬라이스 구조

각 슬라이스는 **상태 타입**과 **액션 타입**으로 구성됩니다:

```typescript
// 슬라이스 상태 타입
export interface PlayerSliceState {
  playerHp: number;
  maxHp: number;
  // ...
}

// 슬라이스 액션 타입
export interface PlayerSliceActions {
  setPlayerHp: (hp: number) => void;
  applyDamage: (damage: number) => void;
  // ...
}

// 액션 생성자
export const createPlayerActions: SliceCreator = (set, get) => ({
  setPlayerHp: (hp) => set((state) => ({ ...state, playerHp: hp })),
  // ...
});
```

---

## 상태 접근 패턴

### 컴포넌트 내부

컴포넌트 내부에서는 `useGameStore` 훅을 사용합니다.

```typescript
import { useGameStore } from '../state/gameStore';

function MyComponent() {
  // 상태 구독 (리렌더링 트리거)
  const playerHp = useGameStore(state => state.playerHp);
  const maxHp = useGameStore(state => state.maxHp);

  // 액션 가져오기 (리렌더링 트리거 안 함)
  const setPlayerHp = useGameStore(state => state.setPlayerHp);

  // 여러 값 한번에 가져오기 (shallow 비교 권장)
  const { gold, intel } = useGameStore(
    useShallow(state => ({
      gold: state.resources.gold,
      intel: state.resources.intel
    }))
  );

  return <div>HP: {playerHp}/{maxHp}</div>;
}
```

### 컴포넌트 외부

컴포넌트 외부(이벤트 핸들러, 유틸리티 함수 등)에서는 `getState()`를 사용합니다.

```typescript
import { useGameStore } from '../state/gameStore';

function applyDamageLogic(damage: number) {
  const state = useGameStore.getState();

  // 상태 읽기
  const currentHp = state.playerHp;

  // 액션 호출
  state.applyDamage(damage);
}
```

### 셀렉터 활용

최적화된 셀렉터를 사용하면 코드가 더 깔끔해집니다.

```typescript
import { usePlayerStats, useResourcesSelector } from '../state/selectors';

function MyComponent() {
  // 플레이어 스탯 한번에 가져오기
  const { playerHp, maxHp, playerStrength } = usePlayerStats();

  // 특정 자원만 선택
  const { gold, intel } = useResourcesSelector(['gold', 'intel']);

  return <div>HP: {playerHp}/{maxHp}, 골드: {gold}</div>;
}
```

---

## 슬라이스 레퍼런스

### playerSlice

플레이어의 HP, 스탯, 자원을 관리합니다.

#### 상태

```typescript
interface PlayerSliceState {
  playerHp: number;              // 현재 HP
  maxHp: number;                 // 최대 HP
  playerStrength: number;        // 힘 (공격력)
  playerAgility: number;         // 민첩성 (카드 속도 감소)
  playerInsight: number;         // 통찰 (적 정보 확인)
  playerTraits: string[];        // 획득한 개성 목록
  playerEgos: PlayerEgo[];       // 레거시: 자아 (growth.identities 사용 권장)
  playerMaxSpeedBonus: number;   // 최대 속도 보너스
  playerEnergyBonus: number;     // 행동력 보너스
  extraSubSpecialSlots: number;  // 보조특기 슬롯 보너스
  resources: Resources;          // 자원 (gold, intel, loot, material, etherPts, memory)
  itemBuffs: Record<string, number>; // 아이템 스탯 버프
  metaBonuses?: { hp: number; gold: number }; // 메타 진행 보너스
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `updatePlayerStrength` | `strength: number` | 힘 스탯 설정 |
| `updatePlayerAgility` | `agility: number` | 민첩성 스탯 설정 |
| `updatePlayerInsight` | `insight: number` | 통찰 스탯 설정 |
| `addResources` | `resources: Partial<Resources>` | 자원 추가/차감 (음수 가능) |
| `applyEtherDelta` | `delta: number` | 에테르 포인트 변경 |
| `applyDamage` | `damage: number` | 플레이어에게 데미지 적용 |
| `setPlayerHp` | `hp: number` | HP 직접 설정 (0 이하 방지) |
| `clearItemBuffs` | - | 아이템 버프 초기화 |

#### 사용 예시

```typescript
// HP 설정
useGameStore.getState().setPlayerHp(80);

// 자원 추가
useGameStore.getState().addResources({ gold: 10, intel: 2 });

// 데미지 적용
useGameStore.getState().applyDamage(15);

// 스탯 업데이트
useGameStore.getState().updatePlayerStrength(3);
```

---

### battleSlice

전투 시스템을 관리합니다.

#### 상태

```typescript
interface BattleSliceState {
  activeBattle: ActiveBattle | null;      // 현재 활성 전투
  lastBattleResult: LastBattleResult | null; // 마지막 전투 결과
}

interface ActiveBattle {
  nodeId: string;                  // 노드 ID
  kind: string;                    // 전투 종류 (combat, elite, boss)
  label: string;                   // 적 이름
  difficulty: number;              // 난이도
  rewards: BattleRewards;          // 보상
  enemyInfo: EnemyInfo;            // 적 정보
  playerHand: BattleCard[];        // 플레이어 핸드
  enemyHand: BattleCard[];         // 적 핸드
  playerLibrary: BattleCard[];     // 플레이어 라이브러리
  playerDrawPile: BattleCard[];    // 플레이어 드로우 파일
  playerDiscardPile: BattleCard[]; // 플레이어 버림 파일
  enemyLibrary: BattleCard[];      // 적 라이브러리
  enemyDrawPile: BattleCard[];     // 적 드로우 파일
  enemyDiscardPile: BattleCard[];  // 적 버림 파일
  selectedCardIds: string[];       // 선택된 카드 ID
  maxSelection: number;            // 최대 선택 가능 수
  preview: BattlePreview;          // 전투 프리뷰
  simulation: SimulationResult;    // 시뮬레이션 결과
  hasCharacterBuild: boolean;      // 캐릭터 빌드 사용 여부
  characterBuild: CharacterBuild | null; // 캐릭터 빌드
  pendingItemEffects: ItemEffect[]; // 대기 중인 아이템 효과
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `startBattle` | `config?: BattleConfig` | 전투 시작 |
| `resolveBattle` | `outcome?: BattleOutcome` | 전투 종료 및 보상 처리 |
| `clearBattleResult` | - | 전투 결과 초기화 |
| `toggleBattleCard` | `cardId: string` | 카드 선택/해제 토글 |
| `commitBattlePlan` | - | 선택한 카드로 전투 계획 실행 |
| `clearPendingItemEffects` | - | 대기 중인 아이템 효과 초기화 |

#### 사용 예시

```typescript
// 전투 시작
useGameStore.getState().startBattle({
  nodeId: 'L2-N1',
  kind: 'combat',
  label: '도적',
  enemyId: 'bandit',
  tier: 2,
  rewards: { gold: { min: 10, max: 20 }, loot: 1 }
});

// 카드 선택
useGameStore.getState().toggleBattleCard('card-instance-123');

// 전투 종료
useGameStore.getState().resolveBattle({
  result: 'victory',
  playerHp: 75,
  damageDealt: 50
});
```

---

### growthSlice

피라미드 성장 시스템을 관리합니다.

#### 상태

```typescript
interface GrowthSliceState {
  growth: {
    pyramidLevel: number;              // 현재 피라미드 레벨 (0~6)
    skillPoints: number;               // 사용 가능한 스킬포인트
    traitCounts: Record<string, number>; // 개성 획득 횟수
    unlockedEthos: string[];           // 해금된 에토스
    unlockedPathos: string[];          // 해금된 파토스
    unlockedNodes: string[];           // 해금된 노드
    pendingNodeSelection: {            // 선택 대기 중인 노드
      nodeId: string;
      type: 'ethos' | 'pathos';
    } | null;
    identities: ('gunslinger' | 'swordsman')[]; // 선택한 자아
    logosLevels: {                     // 로고스 레벨
      common: number;      // 공용 (Lv1-3)
      gunkata: number;     // 건카타 (Lv1-3)
      battleWaltz: number; // 배틀 왈츠 (Lv1-3)
    };
    equippedPathos: string[];          // 장착된 파토스 (최대 3개)
  } | null;
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `updatePyramidLevel` | - | 개성 획득 시 피라미드 레벨 자동 업데이트 |
| `addSkillPoints` | `amount: number` | 스킬포인트 추가 |
| `selectBaseEthos` | `ethosId: string` | 1단계 기초 에토스 선택 |
| `selectBasePathos` | `pathosId: string` | 2단계 기본 파토스 선택 (1SP) |
| `unlockNode` | `nodeId: string, type: 'ethos' \| 'pathos'` | 노드 해금 (1SP, 선택 대기) |
| `selectNodeChoice` | `choiceId: string` | 노드 내 선택지 선택 |
| `selectIdentity` | `identity: 'gunslinger' \| 'swordsman'` | 자아 선택 (피라미드 Lv6) |
| `unlockLogos` | `logosType: 'common' \| 'gunkata' \| 'battleWaltz'` | 로고스 레벨 증가 (1SP) |
| `equipPathos` | `pathosIds: string[]` | 파토스 장착 (최대 3개) |
| `usePathos` | `pathosId: string` | 전투 중 파토스 사용 |
| `resetGrowth` | - | 성장 시스템 초기화 |
| `selectEthos` | `ethosId: string` | [레거시] 에토스 선택 |
| `selectPathos` | `pathosId: string` | [레거시] 파토스 선택 |

#### 사용 예시

```typescript
// 각성으로 개성 획득 후 피라미드 레벨 업데이트
useGameStore.getState().updatePyramidLevel();

// 기초 에토스 선택 (피라미드 Lv1)
useGameStore.getState().selectBaseEthos('brave');

// 노드 해금 (피라미드 Lv3)
useGameStore.getState().unlockNode('ethos_node_1', 'ethos');

// 노드 선택지 선택
useGameStore.getState().selectNodeChoice('ethos_choice_a');

// 자아 선택 (피라미드 Lv6)
useGameStore.getState().selectIdentity('gunslinger');

// 파토스 장착
useGameStore.getState().equipPathos(['dash', 'shield', 'heal']);
```

---

### mapSlice

맵 네비게이션과 위험도를 관리합니다.

#### 상태

```typescript
interface MapSliceState {
  map: MapState;   // 맵 노드 및 현재 위치
  mapRisk: number; // 위험도 (0~100)
}

interface MapState {
  nodes: MapNode[];       // 맵 노드 배열
  currentNodeId: string;  // 현재 노드 ID
  baseLayer?: number;     // 기본 레이어
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `selectNode` | `nodeId: string` | 노드 선택 및 이동 |
| `setMapRisk` | `value: number` | 위험도 설정 (20~80 범위) |

#### 사용 예시

```typescript
// 노드 이동
useGameStore.getState().selectNode('L2-N1');

// 위험도 설정
useGameStore.getState().setMapRisk(50);
```

---

### dungeonSlice

던전 탐험 시스템을 관리합니다.

#### 상태

```typescript
interface DungeonSliceState {
  activeDungeon: ActiveDungeon | null;
}

interface ActiveDungeon {
  nodeId: string;           // 던전 노드 ID
  revealed: boolean;        // 정보 공개 여부
  confirmed: boolean;       // 진입 확인 여부
  dungeonData?: DungeonData; // 던전 데이터
  segmentIndex?: number;    // 세그먼트 인덱스
  playerX?: number;         // 플레이어 X 위치
  currentRoomKey?: string;  // 현재 방 키
  initialResources?: Partial<Resources>; // 던전 진입 시 자원
  dungeonDeltas?: DungeonDeltas; // 던전 자원 변화량
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `confirmDungeon` | - | 던전 진입 확인 |
| `enterDungeon` | - | 던전 진입 |
| `skipDungeon` | - | 던전 건너뛰기 |
| `bypassDungeon` | - | 던전 우회 |
| `completeDungeon` | - | 던전 완료 |
| `revealDungeonInfo` | - | 던전 정보 공개 (인텔 2 소모) |
| `setDungeonData` | `dungeonData: DungeonData \| null` | 던전 데이터 설정 |
| `setDungeonPosition` | `segmentIndex: number, playerX: number` | 플레이어 위치 설정 |
| `setCurrentRoomKey` | `roomKey: string` | 현재 방 설정 |
| `updateMazeRoom` | `roomKey: string, updates: Partial<{visited, cleared}>` | 미로 방 상태 업데이트 |
| `setDungeonInitialResources` | `initialResources: Partial<Resources>` | 던전 진입 시 자원 기록 |
| `setDungeonDeltas` | `dungeonDeltas: DungeonDeltas` | 던전 자원 변화량 기록 |
| `navigateDungeonNode` | `targetNodeId: string` | 던전 노드 이동 |
| `clearDungeonNode` | `nodeId: string` | 던전 노드 클리어 |
| `applyDungeonTimePenalty` | `etherDecay: number` | 던전 시간 페널티 적용 |

#### 사용 예시

```typescript
// 던전 진입
useGameStore.getState().confirmDungeon();
useGameStore.getState().enterDungeon();

// 던전 정보 공개
useGameStore.getState().revealDungeonInfo();

// 던전 완료
useGameStore.getState().completeDungeon();
```

---

### buildSlice

캐릭터 빌드와 카드 성장 시스템을 관리합니다.

#### 상태

```typescript
interface BuildSliceState {
  characterBuild: CharacterBuild;
  cardUpgrades: Record<string, string>;  // 레거시: 카드 ID -> 희귀도
  cardGrowth: Record<string, CardGrowthState>;  // 카드 성장 상태
  storedTraits: string[];  // 획득한 특성 (특화에 사용)
}

interface CharacterBuild {
  mainSpecials: string[];   // 주특기 카드
  subSpecials: string[];    // 보조특기 카드
  cards: Card[];            // 카드 목록
  traits: string[];         // 특성 목록
  egos: string[];           // 자아 목록
  ownedCards?: string[];    // 소유한 카드 ID
}

interface CardGrowthState {
  rarity: 'common' | 'rare' | 'special' | 'legendary'; // 현재 등급
  growthCount: number;        // 강화 + 특화 총 횟수
  enhancementLevel: number;   // 강화 횟수 (스탯 향상)
  specializationCount: number; // 특화 횟수
  traits: string[];           // 특화로 부여된 특성
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `updateCharacterBuild` | `mainSpecials?: string[], subSpecials?: string[]` | 특기 카드 설정 |
| `addOwnedCard` | `cardId: string` | 소유 카드 추가 |
| `removeOwnedCard` | `cardId: string` | 소유 카드 제거 |
| `clearOwnedCards` | - | 소유 카드 모두 제거 |
| `removeCardFromDeck` | `cardId: string, isMainSpecial?: boolean` | 덱에서 카드 제거 |
| `upgradeCardRarity` | `cardId: string` | [레거시] 카드 등급 업그레이드 |
| `enhanceCard` | `cardId: string` | 카드 강화 (스탯 향상) |
| `specializeCard` | `cardId: string, selectedTraits: string[]` | 카드 특화 (특성 부여) |
| `getCardGrowth` | `cardId: string` | 카드 성장 상태 조회 |
| `addStoredTrait` | `traitId: string` | 특성 획득 |
| `removeStoredTrait` | `traitId: string` | 특성 제거 |
| `useStoredTrait` | `traitId: string` | 특성 사용 (특화에 사용 후 제거) |

#### 카드 성장 시스템

**승격 조건**:
- 0회 → `common` (일반)
- 1회 → `rare` (희귀)
- 3회 → `special` (특별)
- 5회 → `legendary` (전설) - 더 이상 성장 불가

**강화 vs 특화**:
- **강화**: 스탯 향상 (데미지, 방어력, 속도 등)
- **특화**: 랜덤 5개 특성 중 선택하여 부여

#### 사용 예시

```typescript
// 특기 카드 설정
useGameStore.getState().updateCharacterBuild(
  ['slash', 'thrust'],  // 주특기
  ['parry', 'dodge']    // 보조특기
);

// 카드 강화
useGameStore.getState().enhanceCard('slash');

// 카드 특화
useGameStore.getState().specializeCard('thrust', ['critical', 'bleeding']);

// 카드 성장 상태 조회
const growth = useGameStore.getState().getCardGrowth('slash');
console.log(growth.rarity); // 'rare'
console.log(growth.growthCount); // 1
```

---

### relicSlice

상징(Relic) 관리를 담당합니다.

#### 상태

```typescript
interface RelicSliceState {
  relics: string[];        // 보유 중인 상징 ID 목록
  orderedRelics: string[]; // 정렬된 상징 ID 목록
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `addRelic` | `relicId: string` | 상징 추가 (패시브 효과 자동 적용) |
| `removeRelic` | `relicId: string` | 상징 제거 |
| `setRelics` | `relicIds: string[]` | 상징 목록 직접 설정 |

#### 패시브 효과

상징을 추가하면 다음 스탯이 자동으로 업데이트됩니다:
- `maxHp`: 최대 HP 보너스
- `playerStrength`: 힘 보너스
- `playerAgility`: 민첩성 보너스

#### 사용 예시

```typescript
// 상징 추가
useGameStore.getState().addRelic('golden_compass');

// 상징 제거
useGameStore.getState().removeRelic('golden_compass');

// 상징 목록 직접 설정
useGameStore.getState().setRelics(['relic_1', 'relic_2']);
```

---

### itemSlice

아이템 관리를 담당합니다.

#### 상태

```typescript
interface ItemSliceState {
  items: (GameItem | null)[]; // 아이템 슬롯 3개 (null = 빈 슬롯)
}

interface GameItem {
  id: string;
  name: string;
  description: string;
  usableIn: 'combat' | 'any';  // 사용 가능 위치
  effect: ItemEffect;           // 효과
  icon?: string;
  tier?: number;
}

interface ItemEffect {
  type: string;   // 효과 타입
  value?: number; // 효과 값
  stat?: string;  // 스탯 이름 (statBoost용)
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `addItem` | `itemId: string` | 아이템 추가 (빈 슬롯에 자동 배치) |
| `removeItem` | `slotIndex: number` | 슬롯에서 아이템 제거 |
| `useItem` | `slotIndex: number, battleContext?: ActiveBattle \| null` | 아이템 사용 |
| `devSetItems` | `itemIds: (string \| null)[]` | [개발자] 아이템 직접 설정 |

#### 아이템 효과 타입

| 타입 | 설명 | 적용 위치 |
|------|------|----------|
| `heal` | HP 회복 | any |
| `healPercent` | 최대 HP의 % 회복 | any |
| `statBoost` | 스탯 임시 버프 | any |
| `etherMultiplier` | 에테르 획득 배율 | combat |
| `etherSteal` | 적 에테르 흡수 | combat |
| `damage` | 직접 데미지 | combat |
| `defense` | 방어력 증가 | combat |
| `attackBoost` | 공격력 증가 | combat |
| `turnEnergy` | 턴 시작 시 행동력 | combat |
| `maxEnergy` | 최대 행동력 증가 | combat |
| `cardDestroy` | 적 카드 파괴 | combat |
| `cardFreeze` | 적 카드 동결 | combat |

#### 사용 예시

```typescript
// 아이템 추가
useGameStore.getState().addItem('healing_potion');

// 아이템 사용 (슬롯 0)
useGameStore.getState().useItem(0);

// 전투 중 아이템 사용
const battle = useGameStore.getState().activeBattle;
useGameStore.getState().useItem(0, battle);
```

---

### restSlice

휴식 및 각성 시스템을 관리합니다.

#### 상태

```typescript
interface RestSliceState {
  activeRest: { nodeId: string } | null;
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `closeRest` | - | 휴식 화면 닫기 |
| `healAtRest` | `healAmount?: number` | 휴식으로 HP 회복 |
| `awakenAtRest` | `choiceId?: string` | 각성 (개성 획득, 기억 10 소모) |

#### 각성 선택지

| ID | 효과 | 개성 |
|-----|------|------|
| `brave` | 힘 +1 | 용맹함 |
| `sturdy` | 최대 HP +10, 현재 HP +10 | 굳건함 |
| `cold` | 통찰 +1 | 냉철함 |
| `thorough` | 보조특기 슬롯 +1 | 철저함 |
| `passionate` | 최대 속도 +5 | 열정적 |
| `lively` | 행동력 +1 | 활력적 |
| `random` | 랜덤 선택 | - |

#### 사용 예시

```typescript
// HP 회복
useGameStore.getState().healAtRest(30);

// 각성 (용맹함)
useGameStore.getState().awakenAtRest('brave');

// 각성 후 피라미드 레벨 자동 업데이트됨
```

---

### shopSlice

상점 시스템을 관리합니다.

#### 상태

```typescript
interface ShopSliceState {
  activeShop: { nodeId?: string; merchantType: string } | null;
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `openShop` | `merchantType?: string` | 상점 열기 |
| `closeShop` | - | 상점 닫기 |

#### 사용 예시

```typescript
// 상점 열기
useGameStore.getState().openShop('shop');

// 상점 닫기
useGameStore.getState().closeShop();
```

---

### eventSlice

이벤트 시스템을 관리합니다.

#### 상태

```typescript
interface EventSliceState {
  activeEvent: ActiveEvent | null;      // 현재 활성 이벤트
  completedEvents: string[];            // 완료된 이벤트 ID
  pendingNextEvent: string | null;      // 다음 연쇄 이벤트 ID
}

interface ActiveEvent {
  id: string;                    // 이벤트 ID
  definition: EventDefinition;   // 이벤트 정의
  currentStage: string | null;   // 현재 스테이지
  resolved: boolean;             // 해결 여부
  outcome: EventOutcome | null;  // 결과
  risk: number;                  // 위험도
  friendlyChance: number;        // 우호 확률
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `chooseEvent` | `choiceId: string` | 이벤트 선택지 선택 |
| `invokePrayer` | `cost: number` | 기도 (에테르 소모, 인텔 획득) |
| `closeEvent` | - | 이벤트 닫기 |
| `setActiveEvent` | `event: ActiveEvent \| null` | 이벤트 직접 설정 |

#### 사용 예시

```typescript
// 선택지 선택
useGameStore.getState().chooseEvent('choice_a');

// 기도 (에테르 5 소모)
useGameStore.getState().invokePrayer(5);

// 이벤트 닫기
useGameStore.getState().closeEvent();
```

---

### devSlice

개발자 도구를 제공합니다.

#### 상태

```typescript
interface DevSliceState {
  devDulledLevel: number | null;    // 강제 둔화 레벨 (0~3)
  devForcedCrossroad: string | null; // 강제 분기점 템플릿
  devBattleTokens: Array<{           // 강제 전투 토큰
    id: string;
    stacks: number;
    target: string;
    timestamp?: number;
  }>;
  devForcedAnomalies: Array<{        // 강제 이변
    anomalyId: string;
    level: number;
  }> | null;
}
```

#### 액션

| 액션 | 파라미터 | 설명 |
|------|----------|------|
| `setDevDulledLevel` | `level: number \| null` | 둔화 레벨 설정 (0~3) |
| `setDevForcedCrossroad` | `templateId: string \| null` | 강제 분기점 설정 |
| `setDevForcedAnomalies` | `anomalies: Array<{anomalyId, level}> \| null` | 강제 이변 설정 |
| `setResources` | `newResources: Partial<Resources>` | 자원 직접 설정 |
| `devClearAllNodes` | - | 모든 노드 클리어 및 선택 가능하게 |
| `devTeleportToNode` | `nodeId: string` | 특정 노드로 텔레포트 |
| `devForceWin` | - | 전투 강제 승리 |
| `devForceLose` | - | 전투 강제 패배 |
| `devAddBattleToken` | `tokenId: string, stacks?: number, target?: string` | 전투 토큰 추가 |
| `devClearBattleTokens` | - | 전투 토큰 모두 제거 |
| `devStartBattle` | `groupId: string` | 특정 적 그룹과 전투 시작 |
| `devOpenRest` | - | 휴식 화면 강제 열기 |
| `devTriggerEvent` | `eventId: string` | 이벤트 강제 트리거 |

#### 사용 예시

```typescript
// 자원 설정
useGameStore.getState().setResources({ gold: 999, intel: 999 });

// 모든 노드 클리어
useGameStore.getState().devClearAllNodes();

// 특정 노드로 텔레포트
useGameStore.getState().devTeleportToNode('L5-N2');

// 전투 강제 승리
useGameStore.getState().devForceWin();

// 전투 시작
useGameStore.getState().devStartBattle('goblin_pack');

// 이벤트 트리거
useGameStore.getState().devTriggerEvent('mysterious_trader');
```

---

## 셀렉터 유틸리티

`src/state/selectors.ts`는 최적화된 셀렉터를 제공합니다.

### 자원 셀렉터

```typescript
// 특정 자원만 선택 (shallow 비교)
const { gold, intel } = useResourcesSelector(['gold', 'intel']);

// 모든 자원 선택
const resources = useAllResources();
```

### 플레이어 셀렉터

```typescript
// 플레이어 스탯
const { playerHp, maxHp, playerStrength } = usePlayerStats();

// 플레이어 액션
const { setPlayerHp, updatePlayerStrength } = usePlayerActions();
```

### 전투 셀렉터

```typescript
// 전투 활성 여부
const isInBattle = useIsInBattle();

// 전투 상태
const battle = useActiveBattle();

// 전투 액션
const { startBattle, resolveBattle } = useBattleActions();
```

### 맵 셀렉터

```typescript
// 맵 상태
const { map, mapRisk } = useMapState();
```

### 인벤토리 셀렉터

```typescript
// 인벤토리 상태
const { relics, items } = useInventory();

// 인벤토리 액션
const { addRelic, addItem } = useInventoryActions();

// 아이템 상태 및 액션
const { items, itemBuffs, useItem } = useItemsWithActions();
```

### 모달 셀렉터

```typescript
// 모달 상태 (이벤트, 휴식, 상점, 던전, 전투 결과)
const { activeEvent, activeRest, activeShop, activeDungeon, lastBattleResult } = useModalState();

// 모달 액션
const { chooseEvent, closeEvent } = useEventActions();
const { awakenAtRest, closeRest, healAtRest } = useRestActions();
const { skipDungeon, confirmDungeon, bypassDungeon } = useDungeonActions();
```

---

## 상태 초기화

### 런 리셋

새로운 게임을 시작하려면 `resetRun` 액션을 사용합니다.

```typescript
useGameStore.getState().resetRun();
```

이 액션은:
- 맵 재생성
- 모든 자원 초기화
- 플레이어 HP/스탯 초기화
- 상징 패시브 효과 재적용
- 활성 전투/이벤트/던전 제거

### 성장 시스템 리셋

피라미드 성장 시스템만 초기화하려면:

```typescript
useGameStore.getState().resetGrowth();
```

### 초기 상태 구조

`src/state/useGameState.ts`의 `createInitialState()`에서 정의됩니다:

```typescript
{
  map: generateMap(),              // 맵 생성
  mapRisk: 0,                      // 위험도 0%
  resources: {                     // 초기 자원
    gold: 40,
    intel: 2,
    loot: 1,
    material: 1,
    etherPts: 0,
    memory: 0
  },
  playerHp: 100,                   // HP 100
  maxHp: 100,                      // 최대 HP 100
  playerStrength: 0,               // 힘 0
  playerAgility: 0,                // 민첩성 0
  playerInsight: 0,                // 통찰 0
  playerTraits: [],                // 개성 없음
  growth: null,                    // 성장 시스템 초기화
  relics: [],                      // 상징 없음
  items: [null, null, null],       // 빈 아이템 슬롯 3개
  characterBuild: {                // 기본 시작 덱
    mainSpecials: [],
    subSpecials: [],
    ownedCards: [...DEFAULT_STARTING_DECK]
  },
  // ... 기타 상태
}
```

---

## 타입 정의

모든 타입은 `src/state/slices/types.ts`에 정의되어 있습니다.

### 주요 타입

```typescript
// 게임 스토어 전체 타입
export type GameStore = GameStoreState & GameStoreActions;

// 전체 상태
export type GameStoreState =
  & PlayerSliceState
  & MapSliceState
  & DungeonSliceState
  & BattleSliceState
  & EventSliceState
  & BuildSliceState
  & RelicSliceState
  & ItemSliceState
  & RestSliceState
  & ShopSliceState
  & DevSliceState
  & GrowthSliceState;

// 전체 액션
export type GameStoreActions =
  & PlayerSliceActions
  & MapSliceActions
  & DungeonSliceActions
  & BattleSliceActions
  & EventSliceActions
  & BuildSliceActions
  & RelicSliceActions
  & ItemSliceActions
  & RestSliceActions
  & ShopSliceActions
  & DevSliceActions
  & GrowthSliceActions
  & { resetRun: () => void };
```

---

## 베스트 프랙티스

### 1. 컴포넌트에서는 셀렉터 사용

```typescript
// ❌ 비효율적
const state = useGameStore(state => state);
const playerHp = state.playerHp;

// ✅ 효율적
const playerHp = useGameStore(state => state.playerHp);
```

### 2. 여러 값을 가져올 때는 shallow 비교

```typescript
import { useShallow } from 'zustand/react/shallow';

// ✅ 불필요한 리렌더링 방지
const { gold, intel } = useGameStore(
  useShallow(state => ({
    gold: state.resources.gold,
    intel: state.resources.intel
  }))
);
```

### 3. 액션은 한번만 가져오기

```typescript
// ✅ 액션은 변경되지 않으므로 리렌더링 트리거 안 함
const setPlayerHp = useGameStore(state => state.setPlayerHp);
```

### 4. 컴포넌트 외부에서는 getState 사용

```typescript
// ✅ 컴포넌트 외부
function applyDamage(damage: number) {
  useGameStore.getState().applyDamage(damage);
}
```

### 5. 상태 구독 최적화

```typescript
// ❌ 전체 상태 구독 (비효율적)
const state = useGameStore();

// ✅ 필요한 값만 구독
const playerHp = useGameStore(state => state.playerHp);
```

---

## 참고 자료

- [Zustand 공식 문서](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [게임 상태 관리 가이드](/docs/STATE_MANAGEMENT_GUIDELINES.md)
- [전투 시스템 문서](/docs/modules/battle.md)
- [성장 시스템 문서](/docs/modules/growth.md)

---

**문서 버전**: 1.0.0
**마지막 업데이트**: 2026-01-01
