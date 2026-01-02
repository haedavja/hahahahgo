# 성장 시스템 (Growth System) API 문서

**최종 업데이트**: 2026-01-01
**버전**: 1.0.0

---

## 목차

1. [개요](#개요)
2. [피라미드 구조](#피라미드-구조)
3. [에토스/파토스 시스템](#에토스파토스-시스템)
4. [노드 해금 로직](#노드-해금-로직)
5. [상태 관리 (growthSlice)](#상태-관리-growthslice)
6. [데이터 파일](#데이터-파일)
7. [컴포넌트 API](#컴포넌트-api)
8. [헬퍼 함수](#헬퍼-함수)

---

## 개요

피라미드 성장 시스템은 개성(Personality Traits) 획득을 통해 스킬포인트를 얻고, 에토스(패시브)와 파토스(액티브) 능력을 해금하는 게임의 핵심 성장 메커니즘입니다.

### 핵심 흐름

```
개성 획득 → 스킬포인트 → 노드 해금 → 선택지 선택 → 능력 획득
```

### 주요 특징

- **6단계 피라미드 구조** (1-6 Tier)
- **개성 기반 성장**: 개성 2개당 피라미드 레벨 1 상승
- **선택지 시스템**: 대부분의 노드는 2개 선택지 중 1개만 선택 가능
- **에토스 (Ethos)**: 패시브 스킬 (홀수 티어: 1, 3, 5)
- **파토스 (Pathos)**: 액티브 스킬 (짝수 티어: 2, 4, 6)
- **자아 (Identity)**: 검사/총잡이 선택 (피라미드 정점)
- **로고스 (Logos)**: 자아별 특수 능력

---

## 피라미드 구조

### 티어 개요

| 티어 | 타입 | 노드 수 | 해금 조건 | 스킬포인트 | 선택지 |
|------|------|---------|-----------|-----------|--------|
| **1단계** | 에토스 | 6개 | 개성 1회 획득 | 무료 (자동) | 없음 |
| **2단계** | 파토스 | 6개 | 개성 1회 획득 | 1P | 2선택지 |
| **3단계** | 에토스 | 6개 | 개성 2회 획득 | 1P | 2선택지 |
| **4단계** | 파토스 | 5개 | 인접 하위 2개 | 1P | 2선택지 |
| **5단계** | 에토스 | 4개 | 인접 하위 2개 | 1P | 2선택지 |
| **6단계** | 파토스 | 3개 | 인접 하위 2개 | 1P | 2선택지 |
| **정점** | 자아 + 로고스 | - | 피라미드 Lv3+ | - | 검사/총잡이 |

### 1단계 - 기초 에토스 (BASE_ETHOS)

**특징**: 개성 1회 획득 시 자동 해금, 스킬포인트 불필요

| ID | 이름 | 타입 | 효과 |
|----|------|------|------|
| `bravery` | 용맹함 | sword | 전투 시작 시 공격력 +1 |
| `steadfast` | 굳건함 | common | 최대 체력 +5 |
| `composure` | 냉철함 | gun | 치명타 확률 +5% |
| `vitality` | 활력적 | sword | 턴 시작 시 10% 확률로 기교 획득 |
| `passion` | 열정적 | common | 연계 시 피해량 +2 |
| `thorough` | 철저함 | gun | 장전 시 탄약 +1 |

**개성-에토스 매핑**:
- 개성 '용맹함' 1회 획득 → `bravery` 에토스 자동 해금
- 이후 동일 개성 추가 획득 시 스킬포인트만 획득

### 2단계 - 파토스 노드 (TIER2_PATHOS)

**특징**: 개성 1회 획득으로 노드 해금 가능, 스킬포인트 1P 소모

| 노드 ID | 이름 | 선택지 1 (검) | 선택지 2 (총) |
|---------|------|--------------|--------------|
| `pierce` | 관통 | 교차 (방어력 획득) | 철갑탄 (관통탄 토큰) |
| `ignite` | 점화 | 춤사위 (회피 획득) | 소이탄 (화염탄 토큰) |
| `defense` | 방어 | 에페 (검격 시 방어) | 엄호 (총격 시 방어) |
| `focus` | 집중 | 일섬 (검격 강화) | 조준 (치명타 보장) |
| `chain` | 연쇄 | 연환 (드로우) | 연발 (장전) |
| `recovery` | 회복 | 참선 (체력 회복) | 정비 (탄약 회복) |

### 3단계 - 에토스 노드 (TIER3_ETHOS)

**특징**: 개성 2회 획득으로 노드 해금 가능, 스킬포인트 1P 소모

| 노드 ID | 이름 | 선택지 1 | 선택지 2 | 설명 |
|---------|------|----------|----------|------|
| `advance` | 전진 | 연막 (회피 시 기교) | 틈새 (회피 시 사격) | 회피 성공 보너스 |
| `constancy` | 불변 | 몸풀기 (시작 시 기교) | 심호흡 (시작 시 집중) | 전투 시작 토큰 |
| `competence` | 유능 | 빠른 손 (검격 속도 -1) | 최신 탄창 (탄걸림 방지) | 장전 관련 |
| `persistence` | 끈기 | 고고학 (상징 피해) | 저격 (사거리 +1) | 피해/사거리 |
| `endurance` | 인내 | 압축 (연계 강화) | 회심 (치명타 피해 +50%) | 연계 효과 |
| `confirmation` | 확인 | 도박꾼 (연계 누적) | 잭팟 (치명타 누적) | 누적 보너스 |

### 4~6단계 - 상위 노드

**특징**: 인접 하위 노드 2개 해금 필요

**4단계 파토스 (TIER4_PATHOS)**:
- `ironman` (철인): 교차 강제 / 회피 무시
- `glacier` (빙하): 속도 1 / 범위 공격
- `pride` (긍지): 연계 강화 / 검총술
- `diligence` (성실): 총검술 / 치명타 보장
- `expertise` (전문): 창조 강화

**5단계 에토스 (TIER5_ETHOS)**:
- `emperor` (제왕): 기교 추가 / 회피 무시
- `grit` (근성): 유령 강화
- `respect` (존경): 기교 피해 / 화상 부여
- `dignity` (위엄): 반격 / 무력화

**6단계 파토스 (TIER6_PATHOS)**:
- `ultimate` (극한): 자원 소모 없음
- `transcend` (초월): 확정 교차/치명타
- `fusion` (융합): 검/총 크로스오버

### 정점 - 자아 (Identity) + 로고스 (Logos)

**자아 선택 조건**: 피라미드 레벨 3 이상

| 자아 | ID | 연결 로고스 | 권장 빌드 |
|------|----|-----------|---------|
| 검사 ⚔️ | `swordsman` | 배틀 왈츠 | 기교, 교차, 연계 중심 |
| 총잡이 🔫 | `gunslinger` | 건카타 | 치명타, 탄약, 명중 중심 |

**로고스 레벨**:
- Lv1: 피라미드 레벨 3+ (첫 자아 선택 시 무료)
- Lv2: 피라미드 레벨 5+ (스킬포인트 1P)
- Lv3: 피라미드 레벨 7+ (스킬포인트 1P)

---

## 에토스/파토스 시스템

### 에토스 (Ethos) - 패시브 스킬

**위치**: `src/data/growth/ethosData.ts`

#### 인터페이스

```typescript
export interface Ethos {
  id: string;
  name: string;
  type: EthosType;        // 'gun' | 'sword' | 'common'
  description: string;
  effect: EthosEffect;
  pyramidLevel: number;   // 해금 가능 피라미드 레벨
  nodeId?: string;        // 소속 노드 ID (선택지인 경우)
}

export interface EthosEffect {
  trigger: string;        // 'battleStart', 'turnStart', 'evadeSuccess' 등
  action: string;         // 'attackBonus', 'addToken', 'damageBonus' 등
  value?: number;
  token?: string;
  source?: string;
  percent?: number;
}

export interface EthosNode {
  id: string;
  name: string;
  tier: number;           // 1, 3, 5
  choices: [string, string]; // 두 개의 에토스 ID
  description: string;
}
```

#### 주요 상수

```typescript
export const BASE_ETHOS: Record<string, Ethos>      // 1단계 기초 에토스
export const TIER3_ETHOS: Record<string, Ethos>     // 3단계 에토스
export const TIER5_ETHOS: Record<string, Ethos>     // 5단계 에토스
export const ETHOS_NODES: Record<string, EthosNode> // 에토스 노드 정의
export const ETHOS: Record<string, Ethos>           // 전체 에토스 (통합)
```

#### 헬퍼 함수

```typescript
// 피라미드 레벨별 해금 가능 에토스 조회
getEthosForLevel(level: number, type?: EthosType): Ethos[]

// 노드별 선택지 조회
getEthosNodeChoices(nodeId: string): [Ethos, Ethos] | null

// 티어별 노드 조회
getEthosNodesForTier(tier: number): EthosNode[]

// 기초 에토스 조회
getBaseEthos(): Ethos[]
```

### 파토스 (Pathos) - 액티브 스킬

**위치**: `src/data/growth/pathosData.ts`

#### 인터페이스

```typescript
export interface Pathos {
  id: string;
  name: string;
  type: PathosType;       // 'gun' | 'sword' | 'common'
  description: string;
  effect: PathosEffect;
  cooldown?: number;      // 쿨다운 (턴)
  pyramidLevel: number;
  nodeId?: string;
}

export interface PathosEffect {
  action: string;         // 'addToken', 'nextSwordDamage', 'forceCross' 등
  value?: number;
  token?: string;
  duration?: string;      // 'turn', 'next', 'permanent'
  target?: string;        // 'self', 'enemy', 'all'
  percent?: number;
}

export interface PathosNode {
  id: string;
  name: string;
  tier: number;           // 2, 4, 6
  choices: [string, string];
  description: string;
}
```

#### 주요 상수

```typescript
export const TIER2_PATHOS: Record<string, Pathos>   // 2단계 파토스
export const TIER4_PATHOS: Record<string, Pathos>   // 4단계 파토스
export const TIER6_PATHOS: Record<string, Pathos>   // 6단계 파토스
export const PATHOS_NODES: Record<string, PathosNode> // 파토스 노드 정의
export const PATHOS: Record<string, Pathos>          // 전체 파토스 (통합)
export const MAX_EQUIPPED_PATHOS = 3                 // 최대 장착 수
```

#### 헬퍼 함수

```typescript
// 피라미드 레벨별 해금 가능 파토스 조회
getPathosForLevel(level: number, type?: PathosType): Pathos[]

// 노드별 선택지 조회
getPathosNodeChoices(nodeId: string): [Pathos, Pathos] | null

// 티어별 노드 조회
getPathosNodesForTier(tier: number): PathosNode[]
```

---

## 노드 해금 로직

**위치**: `src/data/growth/pyramidTreeData.ts`

### 개성 ID 매핑

```typescript
export type TraitId = 'bravery' | 'steadfast' | 'composure' |
                      'vitality' | 'passion' | 'thorough';

export const TRAIT_NAME_TO_ID: Record<string, TraitId> = {
  '용맹함': 'bravery',
  '굳건함': 'steadfast',
  '냉철함': 'composure',
  '활력적': 'vitality',
  '열정적': 'passion',
  '철저함': 'thorough',
};
```

### 개성별 노드 경로

각 개성은 1→2→3단계의 수직 경로를 가집니다:

```typescript
export const TRAIT_NODE_PATH: Record<TraitId, {
  tier1: string;  // 1단계 에토스
  tier2: string;  // 2단계 파토스
  tier3: string;  // 3단계 에토스
}> = {
  bravery: { tier1: 'bravery', tier2: 'pierce', tier3: 'advance' },
  steadfast: { tier1: 'steadfast', tier2: 'ignite', tier3: 'constancy' },
  composure: { tier1: 'composure', tier2: 'defense', tier3: 'competence' },
  vitality: { tier1: 'vitality', tier2: 'focus', tier3: 'persistence' },
  passion: { tier1: 'passion', tier2: 'chain', tier3: 'endurance' },
  thorough: { tier1: 'thorough', tier2: 'recovery', tier3: 'confirmation' },
};
```

### 노드 순서

```typescript
export const NODE_ORDER = {
  tier1: ['bravery', 'steadfast', 'composure', 'vitality', 'passion', 'thorough'],
  tier2: ['pierce', 'ignite', 'defense', 'focus', 'chain', 'recovery'],
  tier3: ['advance', 'constancy', 'competence', 'persistence', 'endurance', 'confirmation'],
  tier4: ['ironman', 'glacier', 'pride', 'diligence', 'expertise'],
  tier5: ['emperor', 'grit', 'respect', 'dignity'],
  tier6: ['ultimate', 'transcend', 'fusion'],
};
```

### 4단계 이상 노드 요구사항

4단계 이상은 인접한 하위 노드 2개가 필요합니다:

```typescript
export const NODE_REQUIREMENTS: Record<string, [string, string]> = {
  // 4단계 파토스 (3단계 에토스 2개 필요)
  ironman: ['advance', 'constancy'],
  glacier: ['constancy', 'competence'],
  pride: ['competence', 'persistence'],
  diligence: ['persistence', 'endurance'],
  expertise: ['endurance', 'confirmation'],

  // 5단계 에토스 (4단계 파토스 2개 필요)
  emperor: ['ironman', 'glacier'],
  grit: ['glacier', 'pride'],
  respect: ['pride', 'diligence'],
  dignity: ['diligence', 'expertise'],

  // 6단계 파토스 (5단계 에토스 2개 필요)
  ultimate: ['emperor', 'grit'],
  transcend: ['grit', 'respect'],
  fusion: ['respect', 'dignity'],
};
```

### 노드 해금 가능 여부 확인

```typescript
/**
 * 노드 해금 가능 여부 확인
 * @param nodeId 노드 ID
 * @param traitCounts 개성별 획득 횟수 { bravery: 2, composure: 1, ... }
 * @param unlockedNodes 이미 해금된 노드 ID 목록
 * @returns { canUnlock: boolean, reason?: string }
 */
export function canUnlockNode(
  nodeId: string,
  traitCounts: Record<string, number>,
  unlockedNodes: string[]
): { canUnlock: boolean; reason?: string }
```

**해금 조건**:

- **1단계**: 해당 개성 1회 획득 시 자동 해금
- **2단계**: 해당 개성 1회 획득 필요
- **3단계**: 해당 개성 2회 획득 필요
- **4~6단계**: 인접 하위 노드 2개 해금 필요

### 자동 해금 노드 조회

```typescript
/**
 * 개성 획득 시 자동 해금되는 노드 목록 반환
 * @param traitId 개성 ID
 * @param newCount 새로운 획득 횟수
 * @param currentUnlockedNodes 현재 해금된 노드 목록
 * @returns 자동 해금될 노드 ID 목록 (1단계 에토스만)
 */
export function getAutoUnlockNodes(
  traitId: TraitId,
  newCount: number,
  currentUnlockedNodes: string[]
): string[]
```

### 노드 티어/타입 조회

```typescript
// 노드의 티어 반환 (1~6)
export function getNodeTier(nodeId: string): number

// 노드의 타입 반환 ('ethos' | 'pathos')
// 홀수 티어 = 에토스, 짝수 티어 = 파토스
export function getNodeType(nodeId: string): 'ethos' | 'pathos'
```

---

## 상태 관리 (growthSlice)

**위치**: `src/state/slices/growthSlice.ts`

### GrowthState 인터페이스

```typescript
export interface GrowthState {
  // 피라미드 진행
  pyramidLevel: number;              // 현재 피라미드 레벨 (개성 2개당 1)
  skillPoints: number;               // 사용 가능한 스킬포인트

  // 개성 획득 횟수 (피라미드 트리 해금용)
  traitCounts: Record<string, number>;  // { bravery: 2, steadfast: 1, ... }

  // 해금된 항목
  unlockedEthos: string[];           // 해금된 에토스 ID 목록
  unlockedPathos: string[];          // 해금된 파토스 ID 목록
  unlockedNodes: string[];           // 해금된 노드 ID 목록 (에토스/파토스 공통)

  // 선택 대기 상태
  pendingNodeSelection: {
    nodeId: string;
    type: 'ethos' | 'pathos';
  } | null;

  // 자아
  identities: IdentityType[];        // 선택한 자아들 (['swordsman', 'gunslinger'] 가능)

  // 로고스 레벨
  logosLevels: {
    common: number;                  // 0~3
    gunkata: number;                 // 0~3
    battleWaltz: number;             // 0~3
  };

  // 전투 장착
  equippedPathos: string[];          // 장착된 파토스 (최대 3개)
}
```

### GrowthSliceActions 인터페이스

```typescript
export interface GrowthSliceActions {
  // 피라미드 레벨 업데이트 (개성 획득 시 자동 호출)
  updatePyramidLevel: () => void;

  // 스킬포인트 추가
  addSkillPoints: (amount: number) => void;

  // 기초 에토스 선택 (1단계, 스킬포인트 불필요)
  selectBaseEthos: (ethosId: string) => void;

  // 기본 파토스 선택 (2단계, 스킬포인트 1P 소모)
  selectBasePathos: (pathosId: string) => void;

  // 노드 해금 (스킬포인트 1P 소모, 선택 대기 상태로 전환)
  unlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;

  // 노드 내 선택지 선택 (대기 중인 노드의 선택지 확정)
  selectNodeChoice: (choiceId: string) => void;

  // 자아 선택 (피라미드 Lv3+ 필요)
  selectIdentity: (identity: IdentityType) => void;

  // 로고스 해금 (스킬포인트 1P 소모)
  unlockLogos: (logosType: 'common' | 'gunkata' | 'battleWaltz') => void;

  // 파토스 장착 (전투 전, 최대 3개)
  equipPathos: (pathosIds: string[]) => void;

  // [레거시 호환성] 에토스 선택
  selectEthos: (ethosId: string) => void;

  // [레거시 호환성] 파토스 선택
  selectPathos: (pathosId: string) => void;

  // 파토스 사용 (전투 중)
  usePathos: (pathosId: string) => void;

  // 성장 상태 초기화
  resetGrowth: () => void;
}
```

### 초기 상태

```typescript
export const initialGrowthState: GrowthState = {
  pyramidLevel: 0,
  skillPoints: 0,
  traitCounts: {},
  unlockedEthos: [],
  unlockedPathos: [],
  unlockedNodes: [],
  pendingNodeSelection: null,
  identities: [],
  logosLevels: {
    common: 0,
    gunkata: 0,
    battleWaltz: 0,
  },
  equippedPathos: [],
};
```

### 상태 흐름 예시

#### 1. 개성 획득 시

```typescript
// 1. 개성 '용맹함' 첫 획득
playerTraits = ['용맹함']

// 2. updatePyramidLevel() 자동 호출
// - traitCounts: { bravery: 1 }
// - pyramidLevel: 0 → 0 (개성 2개당 1레벨)
// - skillPoints: 0 → 1 (개성 1개당 1P)
// - unlockedNodes: ['bravery'] (1단계 자동 해금)
// - unlockedEthos: ['bravery']
```

#### 2. 노드 해금 및 선택

```typescript
// 1. 2단계 파토스 노드 해금 (pierce)
unlockNode('pierce', 'pathos')
// - skillPoints: 1 → 0
// - unlockedNodes: [..., 'pierce']
// - pendingNodeSelection: { nodeId: 'pierce', type: 'pathos' }

// 2. 선택지 선택 (cross 또는 armorPiercing)
selectNodeChoice('cross')
// - unlockedPathos: ['cross']
// - pendingNodeSelection: null
```

#### 3. 자아 및 로고스

```typescript
// 1. 자아 선택 (피라미드 Lv3+ 필요)
selectIdentity('swordsman')
// - identities: ['swordsman']
// - logosLevels.common: 0 → 1 (첫 자아 선택 시 무료)
// - logosLevels.battleWaltz: 0 → 1 (검사 로고스 무료)

// 2. 로고스 레벨업
unlockLogos('common')
// - skillPoints: n → n-1
// - logosLevels.common: 1 → 2
```

---

## 데이터 파일

### ethosData.ts

**경로**: `src/data/growth/ethosData.ts`

#### 주요 export

```typescript
export const BASE_ETHOS: Record<string, Ethos>
export const TIER3_ETHOS: Record<string, Ethos>
export const TIER5_ETHOS: Record<string, Ethos>
export const ETHOS_NODES: Record<string, EthosNode>
export const ETHOS: Record<string, Ethos>

export function getEthosForLevel(level: number, type?: EthosType): Ethos[]
export function getEthosNodeChoices(nodeId: string): [Ethos, Ethos] | null
export function getEthosNodesForTier(tier: number): EthosNode[]
export function getBaseEthos(): Ethos[]
```

### pathosData.ts

**경로**: `src/data/growth/pathosData.ts`

#### 주요 export

```typescript
export const TIER2_PATHOS: Record<string, Pathos>
export const TIER4_PATHOS: Record<string, Pathos>
export const TIER6_PATHOS: Record<string, Pathos>
export const PATHOS_NODES: Record<string, PathosNode>
export const PATHOS: Record<string, Pathos>
export const MAX_EQUIPPED_PATHOS = 3

export function getPathosForLevel(level: number, type?: PathosType): Pathos[]
export function getPathosNodeChoices(nodeId: string): [Pathos, Pathos] | null
export function getPathosNodesForTier(tier: number): PathosNode[]
```

### pyramidTreeData.ts

**경로**: `src/data/growth/pyramidTreeData.ts`

#### 주요 export

```typescript
export type TraitId = 'bravery' | 'steadfast' | 'composure' |
                      'vitality' | 'passion' | 'thorough'

export const TRAIT_NAME_TO_ID: Record<string, TraitId>
export const TRAIT_NODE_PATH: Record<TraitId, { tier1: string; tier2: string; tier3: string }>
export const NODE_ORDER: { tier1: string[]; tier2: string[]; ... }
export const NODE_REQUIREMENTS: Record<string, [string, string]>

export function canUnlockNode(
  nodeId: string,
  traitCounts: Record<string, number>,
  unlockedNodes: string[]
): { canUnlock: boolean; reason?: string }

export function getAutoUnlockNodes(
  traitId: TraitId,
  newCount: number,
  currentUnlockedNodes: string[]
): string[]

export function getNodeTier(nodeId: string): number
export function getNodeType(nodeId: string): 'ethos' | 'pathos'
```

### logosData.ts

**경로**: `src/data/growth/logosData.ts`

#### 인터페이스

```typescript
export type LogosType = 'common' | 'gunkata' | 'battleWaltz';

export interface LogosEffect {
  type: string;
  value?: number;
  description: string;
}

export interface LogosLevel {
  level: number;
  name: string;
  effect: LogosEffect;
}

export interface Logos {
  id: LogosType;
  name: string;
  description: string;
  levels: LogosLevel[];
}
```

#### 주요 export

```typescript
export const COMMON_LOGOS: Logos       // 공용 로고스 (3레벨)
export const GUNKATA_LOGOS: Logos      // 건카타 (총잡이)
export const BATTLE_WALTZ_LOGOS: Logos // 배틀 왈츠 (검사)
export const LOGOS: Record<LogosType, Logos>

export const LOGOS_LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 3,  // 로고스 Lv1: 피라미드 레벨 3
  2: 5,  // 로고스 Lv2: 피라미드 레벨 5
  3: 7,  // 로고스 Lv3: 피라미드 레벨 7
}

export function getLogosLevelFromPyramid(pyramidLevel: number): number
```

#### 로고스 상세

**공용 로고스 (COMMON_LOGOS)**:
- Lv1: 교차로 (교차 범위 확장)
- Lv2: 보조특기 (슬롯 +2)
- Lv3: 주특기 (슬롯 +1)

**건카타 (GUNKATA_LOGOS)**:
- Lv1: 반격 (방어 시 총격)
- Lv2: 정밀 (탄걸림 확률 감소)
- Lv3: 명중 (치명타 확률 +3%, 치명타 시 장전)

**배틀 왈츠 (BATTLE_WALTZ_LOGOS)**:
- Lv1: 유지 (기교 최소 1 유지)
- Lv2: 관통 (방어력 50% 추가 피해)
- Lv3: 흐름 (공격 시 흐릿함, 방어 시 수세 토큰)

### identityData.ts

**경로**: `src/data/growth/identityData.ts`

#### 인터페이스

```typescript
export type IdentityType = 'gunslinger' | 'swordsman';

export interface Identity {
  id: IdentityType;
  name: string;
  emoji: string;
  description: string;
  logos: LogosType;           // 연결된 로고스
  preferredEthos: string[];   // 권장 에토스 타입
  preferredPathos: string[];  // 권장 파토스 타입
}
```

#### 주요 export

```typescript
export const IDENTITIES: Record<IdentityType, Identity> = {
  gunslinger: { /* 총잡이 */ },
  swordsman: { /* 검사 */ },
}

export const IDENTITY_REQUIRED_PYRAMID_LEVEL = 3

export function canSelectIdentity(pyramidLevel: number): boolean
```

### reflections.ts

**경로**: `src/data/reflections.ts`

#### 개성 시스템

```typescript
export const TRAIT_NAME_TO_ID: Record<string, string> = {
  '용맹함': 'valiant',
  '열정적': 'passionate',
  '냉철함': 'calm',
  '철저함': 'thorough',
  '활력적': 'energetic',
  '굳건함': 'steadfast'
};

/**
 * 개성 수로 피라미드 레벨 계산
 * @param traitCount 보유 개성 수
 * @returns 피라미드 레벨 (0부터 시작, 개성 2개당 1레벨)
 */
export function getPyramidLevelFromTraits(traitCount: number): number {
  return Math.floor(traitCount / 2);
}
```

**피라미드 레벨 예시**:
- 개성 0~1개: 피라미드 Lv0
- 개성 2~3개: 피라미드 Lv1
- 개성 4~5개: 피라미드 Lv2
- 개성 6~7개: 피라미드 Lv3 (자아 선택 가능)
- 개성 10~11개: 피라미드 Lv5 (로고스 Lv2)
- 개성 14+개: 피라미드 Lv7 (로고스 Lv3)

---

## 컴포넌트 API

### GrowthPyramidModal

**위치**: `src/components/growth/GrowthPyramidModal.tsx`

**설명**: 피라미드 성장 시스템 메인 UI 컴포넌트

#### Props

```typescript
interface GrowthPyramidModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

#### 사용 예시

```typescript
import { GrowthPyramidModal } from '@/components/growth/GrowthPyramidModal';

function GameUI() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>성장</button>
      <GrowthPyramidModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

#### 하위 컴포넌트

**StatusSummary**: 상태 요약 (개성 수, 피라미드 레벨, 스킬포인트 등)

**PyramidView**: 피라미드 메인 뷰
- LogosSection: 로고스 영역
- IdentitySection: 자아 선택 영역
- TierRow: 각 티어 노드 행
- TraitEthosSection: 1단계 기초 에토스
- UnlockedSummary: 해금 현황 요약
- PyramidConnections: SVG 연결선

### TierRow

**위치**: `src/components/growth/TierRow.tsx`

**설명**: 피라미드 티어 행 컴포넌트 (2~6단계)

#### Props

```typescript
interface TierRowProps {
  tier: number;                        // 티어 번호 (2~6)
  label: string;                       // 티어 레이블 ("3단계 에토스")
  requirement: string;                 // 해금 조건 ("개성 3개 (Lv3) + 1P")
  nodes: (EthosNode | PathosNode)[];   // 노드 목록
  type: 'ethos' | 'pathos';            // 노드 타입
  growth: GrowthState;                 // 성장 상태
  skillPoints: number;                 // 스킬포인트
  pyramidLevel: number;                // 피라미드 레벨
  onUnlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  onSelectChoice: (choiceId: string) => void;
  pendingSelection: GrowthState['pendingNodeSelection'];
}
```

#### 하위 컴포넌트

**TierHeader**: 티어 헤더 (레이블, 진행 상태, 조건)

**NodeCard**: 노드 카드
- 노드 이름
- 해금 버튼 (조건 충족 시)
- 선택지 2개 (ChoiceBadge)
- 해금 불가 사유 표시

**ChoiceBadge**: 선택지 배지
- 능력 이름
- 타입 (검/총/공용)
- 설명
- 선택 버튼 (대기 중인 경우)

### TraitEthosSection

**위치**: `src/components/growth/TraitEthosSection.tsx`

**설명**: 1단계 기초 에토스 섹션

#### 특징

- 개성별 수직 정렬
- 개성 획득 횟수 표시
- 에토스 자동 해금 표시
- 2~3단계 연결 노드 상태 표시

### LogosSection

**위치**: `src/components/growth/LogosSection.tsx`

**설명**: 로고스 해금 및 레벨업 UI

#### 기능

- 공용/건카타/배틀왈츠 로고스 표시
- 레벨별 효과 표시
- 레벨업 버튼 (조건 충족 시)
- 피라미드 레벨 요구사항 표시

### IdentitySection

**위치**: `src/components/growth/IdentitySection.tsx`

**설명**: 자아 선택 UI

#### 기능

- 검사/총잡이 선택
- 하이브리드 가능 (둘 다 선택)
- 선택 시 연결 로고스 Lv1 무료 해금
- 권장 빌드 표시

### UnlockedSummary

**위치**: `src/components/growth/UnlockedSummary.tsx`

**설명**: 해금 현황 요약 및 파토스 장착

#### 기능

- 해금된 에토스 목록
- 해금된 파토스 목록
- 파토스 장착 UI (최대 3개)
- 장착/해제 토글

### PyramidConnections

**위치**: `src/components/growth/PyramidConnections.tsx`

**설명**: 노드 간 연결선 SVG

#### 기능

- 1~3단계: 수직 연결 (개성 경로)
- 4~6단계: 인접 노드 연결
- 해금된 노드는 밝은 색상
- 미해금 노드는 어두운 색상

---

## 헬퍼 함수

**위치**: `src/state/slices/growthSlice.ts`

### getAvailableBaseEthos

```typescript
/**
 * 선택 가능한 기초 에토스 (1단계)
 * @param state 성장 상태
 * @returns 선택 가능한 에토스 목록
 */
export function getAvailableBaseEthos(state: GrowthState): Ethos[]
```

**조건**:
- 피라미드 레벨 1 이상
- 아직 해금하지 않은 에토스

### getAvailableBasePathos

```typescript
/**
 * 선택 가능한 기본 파토스 (2단계)
 * @param state 성장 상태
 * @returns 선택 가능한 파토스 목록
 */
export function getAvailableBasePathos(state: GrowthState): Pathos[]
```

**조건**:
- 피라미드 레벨 2 이상
- 아직 해금하지 않은 파토스

### getAvailableEthosNodes

```typescript
/**
 * 해금 가능한 에토스 노드 (3, 5단계)
 * @param state 성장 상태
 * @returns 해금 가능한 에토스 노드 목록
 */
export function getAvailableEthosNodes(state: GrowthState): EthosNode[]
```

**조건**:
- 아직 해금하지 않은 노드
- canUnlockNode() 결과가 true

### getAvailablePathosNodes

```typescript
/**
 * 해금 가능한 파토스 노드 (2, 4, 6단계)
 * @param state 성장 상태
 * @returns 해금 가능한 파토스 노드 목록
 */
export function getAvailablePathosNodes(state: GrowthState): PathosNode[]
```

### getNodeChoices

```typescript
/**
 * 노드의 선택지 조회
 * @param nodeId 노드 ID
 * @param type 노드 타입 ('ethos' | 'pathos')
 * @returns [선택지1, 선택지2] 또는 null
 */
export function getNodeChoices(
  nodeId: string,
  type: 'ethos' | 'pathos'
): [Ethos | Pathos, Ethos | Pathos] | null
```

### canSelectIdentity

```typescript
/**
 * 자아 선택 가능 여부
 * @param state 성장 상태
 * @returns true if 피라미드 레벨 >= 3
 */
export function canSelectIdentity(state: GrowthState): boolean
```

### getUnlockedEthos

```typescript
/**
 * 해금된 에토스 목록 조회
 * @param state 성장 상태
 * @returns 에토스 객체 배열
 */
export function getUnlockedEthos(state: GrowthState): Ethos[]
```

### getUnlockedPathos

```typescript
/**
 * 해금된 파토스 목록 조회
 * @param state 성장 상태
 * @returns 파토스 객체 배열
 */
export function getUnlockedPathos(state: GrowthState): Pathos[]
```

### getNodeUnlockStatus

```typescript
/**
 * 노드 해금 가능 여부 및 사유 조회
 * @param nodeId 노드 ID
 * @param state 성장 상태
 * @returns { canUnlock: boolean, reason?: string }
 */
export function getNodeUnlockStatus(
  nodeId: string,
  state: GrowthState
): { canUnlock: boolean; reason?: string }
```

**반환 예시**:
```typescript
// 해금 가능
{ canUnlock: true }

// 해금 불가 (이유 포함)
{ canUnlock: false, reason: "개성 '용맹함' 2회 필요 (현재 1회)" }
{ canUnlock: false, reason: "필요: 전진, 불변" }
{ canUnlock: false, reason: "이미 해금됨" }
```

---

## 사용 예시

### 1. 개성 획득 및 피라미드 레벨 업데이트

```typescript
import { useGameStore } from '@/state/gameStore';

function acquireTrait(traitName: string) {
  const { playerTraits, updatePyramidLevel } = useGameStore.getState();

  // 개성 추가
  useGameStore.setState({
    playerTraits: [...playerTraits, traitName]
  });

  // 피라미드 레벨 업데이트 (자동 해금 포함)
  updatePyramidLevel();
}

// 사용
acquireTrait('용맹함');  // 1단계 'bravery' 에토스 자동 해금
acquireTrait('용맹함');  // 스킬포인트 +1, 2단계 'pierce' 해금 가능
```

### 2. 노드 해금 및 선택

```typescript
function unlockAndSelectNode() {
  const { unlockNode, selectNodeChoice, growth } = useGameStore.getState();

  // 1. 노드 해금 (스킬포인트 1P 소모)
  unlockNode('pierce', 'pathos');
  // growth.pendingNodeSelection = { nodeId: 'pierce', type: 'pathos' }

  // 2. 선택지 선택 ('cross' 또는 'armorPiercing')
  selectNodeChoice('cross');
  // growth.unlockedPathos = ['cross']
  // growth.pendingNodeSelection = null
}
```

### 3. 자아 선택 및 로고스 해금

```typescript
function selectIdentityAndLogos() {
  const { selectIdentity, unlockLogos, growth } = useGameStore.getState();

  // 1. 자아 선택 (피라미드 Lv3+ 필요)
  if (growth.pyramidLevel >= 3) {
    selectIdentity('swordsman');
    // growth.identities = ['swordsman']
    // growth.logosLevels.common = 1 (무료)
    // growth.logosLevels.battleWaltz = 1 (무료)

    // 2. 로고스 레벨업 (스킬포인트 1P 소모)
    if (growth.pyramidLevel >= 5) {
      unlockLogos('battleWaltz');
      // growth.logosLevels.battleWaltz = 2
    }
  }
}
```

### 4. 파토스 장착 및 사용

```typescript
function equipAndUsePathos() {
  const { equipPathos, usePathos, growth } = useGameStore.getState();

  // 1. 전투 전: 파토스 장착 (최대 3개)
  equipPathos(['cross', 'flash', 'aim']);
  // growth.equippedPathos = ['cross', 'flash', 'aim']

  // 2. 전투 중: 파토스 사용
  usePathos('flash');  // 일섬 사용
  // TODO: 쿨다운 및 효과는 전투 시스템에서 처리
}
```

### 5. 노드 해금 가능 여부 확인

```typescript
import { canUnlockNode } from '@/data/growth/pyramidTreeData';
import { getNodeUnlockStatus } from '@/state/slices/growthSlice';

function checkNodeUnlock(nodeId: string) {
  const { growth } = useGameStore.getState();

  // 방법 1: pyramidTreeData 직접 사용
  const result1 = canUnlockNode(
    nodeId,
    growth.traitCounts,
    growth.unlockedNodes
  );
  console.log(result1);
  // { canUnlock: false, reason: "개성 '용맹함' 2회 필요 (현재 1회)" }

  // 방법 2: growthSlice 헬퍼 사용 (추천)
  const result2 = getNodeUnlockStatus(nodeId, growth);
  console.log(result2);
  // { canUnlock: false, reason: "개성 '용맹함' 2회 필요 (현재 1회)" }
}
```

---

## 주의사항

### 1. 선택 대기 상태

- 노드를 해금하면 `pendingNodeSelection` 상태가 설정됩니다.
- 선택지를 선택해야 다른 노드를 해금할 수 있습니다.
- UI에서 "선택 대기" 메시지를 표시해야 합니다.

### 2. 스킬포인트 관리

- 1단계 에토스: 스킬포인트 불필요 (자동 해금)
- 2~6단계 노드: 스킬포인트 1P 필요
- 로고스 레벨업: 스킬포인트 1P 필요
- 스킬포인트 부족 시 해금 불가

### 3. 개성 획득 횟수

- `traitCounts`는 개성별 획득 횟수를 추적합니다.
- 개성 이름(한글)이 아닌 ID(영어)로 저장됩니다.
- `TRAIT_NAME_TO_ID` 매핑을 사용하여 변환합니다.

### 4. 피라미드 레벨 계산

```typescript
// 개성 수 → 피라미드 레벨
pyramidLevel = Math.floor(traitCount / 2)

// 예시:
// 0~1개 → Lv0
// 2~3개 → Lv1
// 4~5개 → Lv2
// 6~7개 → Lv3 (자아 선택 가능)
```

### 5. 노드 해금 순서

- 1~3단계: 수직 경로 (개성별)
- 4~6단계: 인접 하위 노드 2개 필요
- 피라미드 구조를 따라 아래에서 위로 해금

---

## 테스트

### 단위 테스트

- `src/data/growth/ethosData.test.ts`
- `src/data/growth/pathosData.test.ts`
- `src/data/growth/identityData.test.ts`
- `src/data/growth/logosData.test.ts`
- `src/state/slices/growthSlice.test.ts`

### 테스트 실행

```bash
npm test growth
```

---

## 변경 이력

### v1.0.0 (2026-01-01)
- 초기 문서 작성
- 피라미드 성장 시스템 전체 구조 문서화
- 에토스/파토스/로고스/자아 시스템 문서화
- 노드 해금 로직 상세 설명
- 컴포넌트 및 상태 관리 API 문서화

---

## 참고 문서

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 가이드
- [상태 관리 가이드](../STATE_MANAGEMENT_GUIDELINES.md)
- [통합규칙.md](../../통합규칙.md) - 게임 규칙
- [card A #1.md](../../card%20A%20%231.md) - 카드 설정
- [Characteristic #1.md](../../Characteristic%20%231.md) - 특성 설정

---

**문서 작성**: Claude (AI Assistant)
**프로젝트**: 하하하GO
**라이선스**: 프로젝트 라이선스 준수
