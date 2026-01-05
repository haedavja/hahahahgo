/**
 * @file game-states.ts
 * @description E2E 테스트용 게임 상태 Fixtures
 *
 * ## 사용법
 * ```typescript
 * import { GAME_STATES } from '../fixtures/game-states';
 *
 * await page.evaluate((state) => {
 *   window.__INJECT_STATE__(state);
 * }, GAME_STATES.BATTLE_READY);
 * ```
 */

/**
 * 카드 Mock 데이터
 */
export const MOCK_CARDS = {
  // 기본 공격 카드들 (actionCost별로 그룹화)
  ATTACK_COST_1: {
    id: 'mock_slash_1',
    name: '베기',
    type: 'attack',
    actionCost: 1,
    damage: 5,
    speedCost: 3,
  },
  ATTACK_COST_2: {
    id: 'mock_strike_2',
    name: '강타',
    type: 'attack',
    actionCost: 2,
    damage: 8,
    speedCost: 5,
  },
  ATTACK_COST_3: {
    id: 'mock_heavy_3',
    name: '헤비 슬래시',
    type: 'attack',
    actionCost: 3,
    damage: 12,
    speedCost: 8,
  },

  // 방어 카드들
  DEFENSE_COST_1: {
    id: 'mock_guard_1',
    name: '가드',
    type: 'defense',
    actionCost: 1,
    block: 5,
    speedCost: 4,
  },
  DEFENSE_COST_2: {
    id: 'mock_shield_2',
    name: '실드',
    type: 'defense',
    actionCost: 2,
    block: 10,
    speedCost: 6,
  },

  // 특수 카드
  MULTI_HIT: {
    id: 'mock_multi_hit',
    name: '연속 공격',
    type: 'attack',
    actionCost: 2,
    damage: 3,
    hits: 3,
    speedCost: 7,
  },
  POISON: {
    id: 'mock_poison',
    name: '독 공격',
    type: 'attack',
    actionCost: 1,
    damage: 2,
    statusEffect: { type: 'poison', value: 3, duration: 3 },
    speedCost: 4,
  },
  BUFF: {
    id: 'mock_buff',
    name: '힘 강화',
    type: 'support',
    actionCost: 1,
    buff: { type: 'strength', value: 2, duration: 3 },
    speedCost: 3,
  },
};

/**
 * 포커 조합별 카드 세트
 */
export const COMBO_CARD_SETS = {
  // 페어 (같은 actionCost 2장)
  PAIR: [
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'pair_1' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'pair_2', name: '강타 2' },
  ],

  // 트리플 (같은 actionCost 3장)
  TRIPLE: [
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'triple_1' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'triple_2', name: '베기 2' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'triple_3', name: '베기 3' },
  ],

  // 투페어 (2개의 페어)
  TWO_PAIR: [
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'tp_1' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'tp_2', name: '베기 2' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'tp_3' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'tp_4', name: '강타 2' },
  ],

  // 풀하우스 (트리플 + 페어)
  FULL_HOUSE: [
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'fh_1' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'fh_2', name: '베기 2' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'fh_3', name: '베기 3' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'fh_4' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'fh_5', name: '강타 2' },
  ],

  // 플러쉬 (같은 타입 4장 이상)
  FLUSH_ATTACK: [
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'flush_1' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'flush_2' },
    { ...MOCK_CARDS.ATTACK_COST_3, id: 'flush_3' },
    { ...MOCK_CARDS.ATTACK_COST_2, id: 'flush_4', name: '강타 2' },
  ],

  // 포카드 (같은 actionCost 4장)
  FOUR_OF_A_KIND: [
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'foak_1' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'foak_2', name: '베기 2' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'foak_3', name: '베기 3' },
    { ...MOCK_CARDS.ATTACK_COST_1, id: 'foak_4', name: '베기 4' },
  ],
};

/**
 * 상징 Mock 데이터
 */
export const MOCK_RELICS = {
  ETHER_CRYSTAL: {
    id: 'etherCrystal',
    name: '에테르 수정',
    rarity: 'common',
    effects: { type: 'PASSIVE', maxEnergy: 1 },
  },
  STRENGTH_AMULET: {
    id: 'strengthAmulet',
    name: '힘의 부적',
    rarity: 'rare',
    effects: { type: 'ON_COMBAT_START', strength: 2 },
  },
};

/**
 * 이변 Mock 데이터
 */
export const MOCK_ANOMALIES = {
  DEFLATION: {
    id: 'deflation_curse',
    name: '디플레이션의 저주',
    level: 1,
    effectType: 'ETHER_BAN',
  },
  ENERGY_DRAIN: {
    id: 'energy_drain',
    name: '활력 고갈',
    level: 2,
    effectType: 'ENERGY_REDUCTION',
    value: 2,
  },
};

/**
 * 게임 상태 Fixtures
 */
export const GAME_STATES = {
  /**
   * 새 게임 초기 상태
   */
  NEW_GAME: {
    gold: 100,
    hp: 80,
    maxHp: 80,
    currentLayer: 1,
    deck: [
      MOCK_CARDS.ATTACK_COST_1,
      MOCK_CARDS.ATTACK_COST_2,
      MOCK_CARDS.DEFENSE_COST_1,
      MOCK_CARDS.DEFENSE_COST_2,
    ],
    relics: [],
    completedNodes: [],
  },

  /**
   * 전투 준비 상태 (맵에서 전투 노드 선택 가능)
   */
  BATTLE_READY: {
    gold: 150,
    hp: 70,
    maxHp: 80,
    currentLayer: 2,
    deck: [...COMBO_CARD_SETS.PAIR, ...COMBO_CARD_SETS.TRIPLE.slice(0, 2)],
    relics: [MOCK_RELICS.ETHER_CRYSTAL],
    completedNodes: ['node_1_1'],
  },

  /**
   * 전투 중 상태
   */
  IN_BATTLE: {
    phase: 'select',
    playerHp: 60,
    playerMaxHp: 80,
    playerEther: 30,
    enemyHp: 50,
    enemyMaxHp: 50,
    enemyEther: 20,
    hand: COMBO_CARD_SETS.FULL_HOUSE,
    timeline: [],
    turn: 1,
  },

  /**
   * 상점 이용 가능 상태
   */
  SHOP_READY: {
    gold: 300,
    hp: 50,
    maxHp: 80,
    currentLayer: 3,
    deck: [...COMBO_CARD_SETS.PAIR, ...COMBO_CARD_SETS.TRIPLE],
    relics: [MOCK_RELICS.ETHER_CRYSTAL],
    completedNodes: ['node_1_1', 'node_2_1'],
  },

  /**
   * 저체력 상태 (휴식 필요)
   */
  LOW_HP: {
    gold: 200,
    hp: 20,
    maxHp: 80,
    currentLayer: 4,
    deck: [...COMBO_CARD_SETS.FULL_HOUSE],
    relics: [MOCK_RELICS.ETHER_CRYSTAL, MOCK_RELICS.STRENGTH_AMULET],
    completedNodes: ['node_1_1', 'node_2_1', 'node_3_1'],
  },

  /**
   * 이변 활성 상태
   */
  WITH_ANOMALY: {
    gold: 150,
    hp: 60,
    maxHp: 80,
    currentLayer: 5,
    mapRisk: 50, // 50% 위험도
    activeAnomalies: [MOCK_ANOMALIES.DEFLATION],
    deck: [...COMBO_CARD_SETS.PAIR],
    relics: [],
  },

  /**
   * 에테르 버스트 직전 상태
   */
  NEAR_BURST: {
    phase: 'select',
    playerHp: 60,
    playerMaxHp: 80,
    playerEther: 90, // 버스트까지 10 남음
    enemyHp: 30,
    enemyMaxHp: 50,
    enemyEther: 40,
    hand: COMBO_CARD_SETS.TRIPLE,
    turn: 5,
  },
};

/**
 * 적 Mock 데이터
 */
export const MOCK_ENEMIES = {
  BASIC_SLIME: {
    id: 'slime_basic',
    name: '슬라임',
    hp: 30,
    maxHp: 30,
    attack: 5,
    defense: 0,
  },
  ARMORED_GOLEM: {
    id: 'golem_armored',
    name: '철갑 골렘',
    hp: 60,
    maxHp: 60,
    attack: 8,
    defense: 5,
  },
  BOSS_DRAGON: {
    id: 'dragon_boss',
    name: '화염 드래곤',
    hp: 150,
    maxHp: 150,
    attack: 15,
    defense: 3,
    isBoss: true,
  },
};

/**
 * 상태이상 Mock 데이터
 */
export const MOCK_STATUS_EFFECTS = {
  POISON: {
    type: 'poison',
    value: 3,
    duration: 3,
    description: '턴 종료 시 3 피해',
  },
  WEAKNESS: {
    type: 'weakness',
    value: 25,
    duration: 2,
    description: '공격력 25% 감소',
  },
  STRENGTH: {
    type: 'strength',
    value: 2,
    duration: 3,
    description: '공격력 +2',
  },
  VULNERABLE: {
    type: 'vulnerable',
    value: 50,
    duration: 2,
    description: '받는 피해 50% 증가',
  },
  BLOCK: {
    type: 'block',
    value: 10,
    duration: 1,
    description: '10 데미지 방어',
  },
};

/**
 * 테스트 시나리오
 */
export const TEST_SCENARIOS = {
  /**
   * 빠른 전투 종료 시나리오
   */
  QUICK_BATTLE_WIN: {
    player: { hp: 80, maxHp: 80, ether: 0 },
    enemy: { hp: 10, maxHp: 50, ether: 0 },
    hand: [MOCK_CARDS.ATTACK_COST_3], // 12 데미지로 즉시 승리
  },

  /**
   * 에테르 버스트 시나리오
   */
  ETHER_BURST: {
    player: { hp: 60, maxHp: 80, ether: 95 },
    enemy: { hp: 40, maxHp: 50, ether: 20 },
    hand: COMBO_CARD_SETS.TRIPLE, // 트리플로 에테르 대량 획득
  },

  /**
   * 상태이상 테스트 시나리오
   */
  STATUS_EFFECT_TEST: {
    player: { hp: 50, maxHp: 80, ether: 30, statusEffects: [MOCK_STATUS_EFFECTS.STRENGTH] },
    enemy: { hp: 40, maxHp: 50, ether: 10, statusEffects: [MOCK_STATUS_EFFECTS.POISON] },
    hand: [MOCK_CARDS.ATTACK_COST_2, MOCK_CARDS.POISON],
  },
};
