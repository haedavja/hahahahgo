/**
 * @file relics.ts
 * @description 상징(Relic) 데이터
 *
 * 상징은 게임의 방향성을 결정짓는 아이템으로 개별 상징의 성능만큼이나 각 상징간의 연계가 중요하다.
 */

import type { RelicRarity } from '../types';

/** 상징 조건 평가용 상태 */
interface RelicConditionState {
  cardsPlayedThisTurn?: number;
  playerHp?: number;
  maxHp?: number;
  allCardsDefense?: boolean;
  allCardsLowCost?: boolean;
  timesAttackedThisTurn?: number;
}

/** 상징 희귀도 상수 */
export const RELIC_RARITIES: Record<string, RelicRarity | 'dev'> = {
  COMMON: 'common',
  RARE: 'rare',
  SPECIAL: 'special',
  LEGENDARY: 'legendary',
  DEV: 'dev',  // 개발자 전용
} as const;

export const RELIC_TAGS = {
  ENERGY: 'energy',      // 행동력
  DRAW: 'draw',          // 드로우
  DEFENSE: 'defense',    // 방어력
  HP: 'hp',              // 체력
  HEAL: 'heal',          // 회복
  STRENGTH: 'strength',  // 힘
  AGILITY: 'agility',    // 민첩
  ETHER: 'ether',        // 에테르
  SPEED: 'speed',        // 속도
  TIMELINE: 'timeline',  // 타임라인
  TOKEN: 'token',        // 토큰
};

/**
 * 상징 효과 타입
 * - PASSIVE: 항상 적용되는 효과
 * - ON_COMBAT_START: 전투 시작 시
 * - ON_COMBAT_END: 전투 종료 시
 * - ON_TURN_START: 턴 시작 시
 * - ON_TURN_END: 턴 종료 시
 * - ON_CARD_PLAYED: 카드 사용 시
 * - ON_DAMAGE_TAKEN: 피해를 받을 때
 * - ON_CARD_DRAW: 카드 뽑을 때
 */

export const RELICS = {
  // ==================== 일반 등급 ====================
  etherCrystal: {
    id: 'etherCrystal',
    name: '에테르 수정',
    emoji: '🔮',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.ENERGY],
    description: '최대 행동력 1 증가',
    effects: {
      type: 'PASSIVE',
      maxEnergy: 1,
    },
  },

  etherGem: {
    id: 'etherGem',
    name: '에테르 결정',
    emoji: '💎',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.ETHER],
    description: '카드 1장이 발동할 때마다 곱배수에 2배수를 더합니다.',
    effects: {
      type: 'PASSIVE',
      comboMultiplierPerCard: 2.0,
    },
  },

  longCoat: {
    id: 'longCoat',
    name: '긴 옷',
    emoji: '🧥',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.DRAW],
    description: '보조특기 1개를 추가 선택가능해집니다.',
    effects: {
      type: 'PASSIVE',
      subSpecialSlots: 1,
    },
  },

  sturdyArmor: {
    id: 'sturdyArmor',
    name: '피피한 갑옷',
    emoji: '🛡️',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.DEFENSE],
    description: '매 턴 시작시 방어력 8획득',
    effects: {
      type: 'ON_TURN_START',
      block: 8,
    },
  },

  trainingBoots: {
    id: 'trainingBoots',
    name: '트레이닝 부츠',
    emoji: '👟',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.HP],
    description: '최대체력이 10 증가합니다.',
    effects: {
      type: 'PASSIVE',
      maxHp: 10,
    },
  },

  redHerb: {
    id: 'redHerb',
    name: '붉은약초',
    emoji: '🌿',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.HEAL],
    description: '전투가 끝날 때마다 체력 5회복',
    effects: {
      type: 'ON_COMBAT_END',
      heal: 5,
    },
  },

  contract: {
    id: 'contract',
    name: '계약서',
    emoji: '📜',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.ENERGY],
    description: '카드를 4장이상 내면 다음턴에 행동력 2를 얻습니다.',
    effects: {
      type: 'ON_TURN_END',
      condition: (state: RelicConditionState) => (state.cardsPlayedThisTurn ?? 0) >= 4,
      energyNextTurn: 2,
    },
  },

  rareStone: {
    id: 'rareStone',
    name: '희귀한 조약돌',
    emoji: '🪨',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.ETHER],
    description: '카드의 기본 획득 에테르량을 2배로 늘립니다.',
    effects: {
      type: 'PASSIVE',
      etherMultiplier: 2,
    },
  },

  coin: {
    id: 'coin',
    name: '은화',
    emoji: '🪙',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.STRENGTH],
    description: '매 턴 종료시 힘 1 획득',
    effects: {
      type: 'ON_TURN_END',
      strength: 1,
    },
  },

  bloodShackles: {
    id: 'bloodShackles',
    name: '피의 족쇄',
    emoji: '⛓️',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.STRENGTH, RELIC_TAGS.HP],
    description: '매 전투마다 체력을 5 잃는 대신 힘 2 획득',
    effects: {
      type: 'ON_COMBAT_START',
      damage: 5,
      strength: 2,
    },
  },

  // ==================== 희귀 등급 ====================
  goldenHerb: {
    id: 'goldenHerb',
    name: '황금 약초',
    emoji: '✨',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.HEAL],
    description: '전투가 끝날 때마다 체력 10회복',
    effects: {
      type: 'ON_COMBAT_END',
      heal: 10,
    },
  },

  immortalMask: {
    id: 'immortalMask',
    name: '불멸의 가면',
    emoji: '🎭',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.HEAL],
    description: '카드가 사용될 때마다 체력 1 회복',
    effects: {
      type: 'ON_CARD_PLAYED',
      heal: 1,
    },
  },

  ironRing: {
    id: 'ironRing',
    name: '강철반지',
    emoji: '💍',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ENERGY],
    description: '최대 행동력 2 증가',
    effects: {
      type: 'PASSIVE',
      maxEnergy: 2,
    },
  },

  wizardGloves: {
    id: 'wizardGloves',
    name: '현자주먹 장갑',
    emoji: '🧤',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.DRAW],
    description: '보조특기 2개를 추가 선택가능해집니다.',
    effects: {
      type: 'PASSIVE',
      subSpecialSlots: 2,
    },
  },

  luckyCoin: {
    id: 'luckyCoin',
    name: '행운의 동전',
    emoji: '🍀',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.DRAW],
    description: '카드 추출확률이 20% 증가합니다.',
    effects: {
      type: 'PASSIVE',
      cardDrawBonus: 0.2,
    },
  },

  celeryCarrot: {
    id: 'celeryCarrot',
    name: '셀러리와 당근',
    emoji: '🥕',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.AGILITY],
    description: '민첩 1을 제공합니다.',
    effects: {
      type: 'PASSIVE',
      agility: 1,
    },
  },

  steelBoots: {
    id: 'steelBoots',
    name: '강철 군화',
    emoji: '🥾',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.STRENGTH, RELIC_TAGS.AGILITY],
    description: '민첩 1을 잃고 힘3을 얻습니다.',
    effects: {
      type: 'PASSIVE',
      agility: -1,
      strength: 3,
    },
  },

  redCompass: {
    id: 'redCompass',
    name: '황금 나침반',
    emoji: '🧭',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '맵에서 이동할 때마다 2% 에테르 획득',
    effects: {
      type: 'ON_NODE_MOVE',
      etherPercent: 2,
    },
  },

  referenceBook: {
    id: 'referenceBook',
    name: '참고서',
    emoji: '📚',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '낸 카드 수에 비례해 1.x배만큼 마지막 카드 발동된 다음 곱배수에 곱합니다.',
    effects: {
      type: 'PASSIVE',
      etherCardMultiplier: true, // 카드 수에 따라 배율 증가 (예: 3장 = 1.3배)
    },
  },

  // ==================== 특별 등급 ====================
  effortDiary: {
    id: 'effortDiary',
    name: '노력의 일지',
    emoji: '📓',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.DRAW],
    description: '주특기 1개를 추가 선택가능해집니다.',
    effects: {
      type: 'PASSIVE',
      mainSpecialSlots: 1,
    },
  },

  loyaltyPotion: {
    id: 'loyaltyPotion',
    name: '충성물약',
    emoji: '🧪',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.DRAW],
    description: '카드 추출확률이 30% 증가합니다.',
    effects: {
      type: 'PASSIVE',
      cardDrawBonus: 0.3,
    },
  },

  ironHeart: {
    id: 'ironHeart',
    name: '철의 심장',
    emoji: '❤️',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.HEAL, RELIC_TAGS.DEFENSE],
    description: '피해를 받았을때마다 다음턴에 방어력과 체력을 1 얻습니다.',
    effects: {
      type: 'ON_DAMAGE_TAKEN',
      blockNextTurn: 1,
      healNextTurn: 1,
    },
  },

  devilDice: {
    id: 'devilDice',
    name: '악마의 주사위',
    emoji: '🎲',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.ETHER],
    description: '5번째 카드가 발동된 다음 곱배수에 5배수를 곱합니다.',
    effects: {
      type: 'PASSIVE',
      etherFiveCardBonus: 5, // 5장 내면 5배
    },
  },

  healthCheck: {
    id: 'healthCheck',
    name: '건강검진표',
    emoji: '📋',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.HP],
    description: '전투종료시 체력이 최대치면 최대체력 +2, 체력이 다쳤으면 회복 +3',
    effects: {
      type: 'ON_COMBAT_END',
      condition: (state: RelicConditionState) => state.playerHp === state.maxHp,
      maxHpIfFull: 2,
      healIfDamaged: 3,
    },
  },

  // ==================== 개발자 전용 ====================
  infiniteShield: {
    id: 'infiniteShield',
    name: '무한방패',
    emoji: '🛡️',
    rarity: RELIC_RARITIES.DEV,
    tags: [RELIC_TAGS.DEFENSE],
    description: '턴 시작 시 방어력 1000을 얻습니다. (개발용)',
    effects: {
      type: 'ON_TURN_START',
      block: 1000,
    },
  },

  perpetualEngine: {
    id: 'perpetualEngine',
    name: '영구동력',
    emoji: '♾️',
    rarity: RELIC_RARITIES.DEV,
    tags: [RELIC_TAGS.ENERGY],
    description: '최대 행동력이 30 증가합니다. (개발용)',
    effects: {
      type: 'PASSIVE',
      maxEnergy: 30,
    },
  },

  lightShoes: {
    id: 'lightShoes',
    name: '빛의 신발',
    emoji: '👟',
    rarity: RELIC_RARITIES.DEV,
    tags: [RELIC_TAGS.SPEED],
    description: '최대 속도가 100 증가합니다. (개발용)',
    effects: {
      type: 'PASSIVE',
      maxSpeed: 100,
    },
  },

  superArmor: {
    id: 'superArmor',
    name: '슈퍼-장갑',
    emoji: '🧤',
    rarity: RELIC_RARITIES.DEV,
    tags: [RELIC_TAGS.DRAW],
    description: '최대 10장까지 카드를 낼 수 있습니다. (개발용)',
    effects: {
      type: 'PASSIVE',
      maxSubmitCards: 10,
    },
  },

  // ==================== 추가 상징 ====================
  mockingMask: {
    id: 'mockingMask',
    name: '비웃는 가면',
    emoji: '🎭',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '카드의 부정적 특성 하나당 2배수를 더합니다.',
    effects: {
      type: 'PASSIVE',
      negativeTraitMultiplier: 2,
    },
  },

  celebrationWreath: {
    id: 'celebrationWreath',
    name: '축하의 화환',
    emoji: '💐',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '카드의 긍정적 특성 하나당 2배수를 더합니다.',
    effects: {
      type: 'PASSIVE',
      positiveTraitMultiplier: 2,
    },
  },

  windCloak: {
    id: 'windCloak',
    name: '바람망토',
    emoji: '🧣',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.SPEED],
    description: '속도를 5 얻습니다.',
    effects: {
      type: 'PASSIVE',
      speed: 5,
    },
  },

  lightBag: {
    id: 'lightBag',
    name: '가벼운 가방',
    emoji: '🎒',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.SPEED, RELIC_TAGS.ENERGY],
    description: '최대 행동력 1을 잃고 속도를 12 얻습니다.',
    effects: {
      type: 'PASSIVE',
      maxEnergy: -1,
      speed: 12,
    },
  },

  prostheticArm: {
    id: 'prostheticArm',
    name: '의수',
    emoji: '🦾',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.TIMELINE],
    description: '방어카드만 냈다면 상대의 타임라인을 동결합니다.',
    effects: {
      type: 'ON_TURN_END',
      condition: (state: RelicConditionState) => (state.cardsPlayedThisTurn ?? 0) > 0 && state.allCardsDefense,
      freezeEnemyTimeline: true,
    },
  },

  charityGold: {
    id: 'charityGold',
    name: '적선의 금화',
    emoji: '🪙',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.TIMELINE],
    description: '행동력 2 이하의 카드만 냈다면 상대의 타임라인을 동결합니다.',
    effects: {
      type: 'ON_TURN_END',
      condition: (state: RelicConditionState) => (state.cardsPlayedThisTurn ?? 0) > 0 && state.allCardsLowCost,
      freezeEnemyTimeline: true,
    },
  },

  laughingBell: {
    id: 'laughingBell',
    name: '웃는 종',
    emoji: '🔔',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.TIMELINE],
    description: '낸 카드가 3장 이하면 카드의 시간소모 5 감소.',
    effects: {
      type: 'ON_TURN_END',
      condition: (state: RelicConditionState) => (state.cardsPlayedThisTurn ?? 0) <= 3,
      speedCostReduction: 5,
    },
  },

  wreath: {
    id: 'wreath',
    name: '화환',
    emoji: '🌸',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '은총화를 획득하면 공격, 방어 1회 부여.',
    effects: {
      type: 'ON_GRACE_GAIN',
      grantOffense: 1,
      grantDefense: 1,
    },
  },

  pocketWatch: {
    id: 'pocketWatch',
    name: '시계',
    emoji: '⏱️',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.TIMELINE],
    description: '되감기 1회를 추가합니다.',
    effects: {
      type: 'PASSIVE',
      rewindCount: 1,
    },
  },

  dud: {
    id: 'dud',
    name: '불발탄',
    emoji: '💣',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.TOKEN, RELIC_TAGS.HEAL],
    description: '긍정 토큰 1회 얻을때마다 체력 3회복, 부정 토큰 1회 얻을때마다 체력 1 상실.',
    effects: {
      type: 'ON_TOKEN_GAIN',
      healOnPositive: 3,
      damageOnNegative: 1,
    },
  },

  bulletproofVest: {
    id: 'bulletproofVest',
    name: '방탄복',
    emoji: '🦺',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.DEFENSE],
    description: '한 턴에 공격을 2번 이상 받으면 다음 턴 시작시 수세 1회 획득.',
    effects: {
      type: 'ON_TURN_END',
      condition: (state: RelicConditionState) => (state.timesAttackedThisTurn ?? 0) >= 2,
      grantDefensiveNextTurn: 1,
    },
  },

  neckGlove: {
    id: 'neckGlove',
    name: '목장갑',
    emoji: '🧤',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '투페어 이상 내면 공세+ 1회 획득.',
    effects: {
      type: 'ON_COMBO',
      condition: (comboRank: number) => comboRank >= 3, // 투페어 이상
      grantOffensePlus: 1,
    },
  },

  windTear: {
    id: 'windTear',
    name: '바람의 눈물',
    emoji: '💧',
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.DRAW],
    description: '카드를 한 장 더 낼 수 있습니다.',
    effects: {
      type: 'PASSIVE',
      extraCardPlay: 1,
    },
  },

  rosary: {
    id: 'rosary',
    name: '묵주',
    emoji: '📿',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '상징이 발동될때마다 에테르 50pt 획득.',
    effects: {
      type: 'ON_RELIC_ACTIVATE',
      etherGain: 50,
    },
  },

  bullet: {
    id: 'bullet',
    name: '총알',
    emoji: '🔫',
    rarity: RELIC_RARITIES.RARE,
    tags: [RELIC_TAGS.ETHER],
    description: '하이카드일 경우 5배수를 더합니다.',
    effects: {
      type: 'ON_COMBO',
      condition: (comboRank: number) => comboRank === 1, // 하이카드
      comboMultiplierBonus: 5,
    },
  },

  tonic: {
    id: 'tonic',
    name: '보약',
    emoji: '🍵',
    rarity: RELIC_RARITIES.COMMON,
    tags: [RELIC_TAGS.DEFENSE],
    description: '전투 시작시 면역 1회 획득.',
    effects: {
      type: 'ON_COMBAT_START',
      grantImmunity: 1,
    },
  },

  // ==================== 이벤트 전용 상징 ====================
  // 이벤트에서만 획득 가능한 특별한 상징들

  bloodPactSeal: {
    id: 'bloodPactSeal',
    name: '피의 계약인',
    emoji: '🩸',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.STRENGTH],
    description: '피해를 입을 때마다 힘 2 획득. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'ON_DAMAGE_TAKEN',
      strength: 2,
    },
  },

  soulForge: {
    id: 'soulForge',
    name: '영혼의 용광로',
    emoji: '🔥',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.ETHER],
    description: '카드가 소멸될 때마다 에테르 100pt 획득. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'ON_CARD_EXHAUST',
      etherGain: 100,
    },
  },

  soulFragment: {
    id: 'soulFragment',
    name: '영혼 파편',
    emoji: '👻',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.ENERGY, RELIC_TAGS.HP],
    description: '최대 HP가 낮을수록 행동력 증가. HP 50% 이하시 +1, 25% 이하시 +2. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      conditionalEnergy: {
        hpThreshold50: 1,
        hpThreshold25: 2,
      },
    },
  },

  voidHeart: {
    id: 'voidHeart',
    name: '공허의 심장',
    emoji: '🖤',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.STRENGTH, RELIC_TAGS.DEFENSE],
    description: 'HP가 30% 이하일 때 피해량 50% 증가, 받는 피해 30% 감소. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      lowHpBonus: {
        threshold: 0.3,
        damageBonus: 0.5,
        damageReduction: 0.3,
      },
    },
  },

  forbiddenPower: {
    id: 'forbiddenPower',
    name: '금단의 힘',
    emoji: '⚡',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.STRENGTH],
    description: '힘 +3. 매 전투마다 HP 5 손실. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      strength: 3,
      combatDamage: 5,
    },
  },

  forbiddenWisdom: {
    id: 'forbiddenWisdom',
    name: '금단의 지혜',
    emoji: '📖',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.DRAW],
    description: '매 턴 카드 1장 추가 드로우. 덱 크기 -3. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      drawPerTurn: 1,
      deckSizePenalty: 3,
    },
  },

  deathsEmbrace: {
    id: 'deathsEmbrace',
    name: '죽음의 포옹',
    emoji: '💀',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.HP, RELIC_TAGS.STRENGTH],
    description: 'HP 1로 전투 시작. 대신 힘 +5, 첫 턴 무적. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'ON_COMBAT_START',
      setHp: 1,
      strength: 5,
      grantInvincible: 1,
    },
  },

  phoenixFeather: {
    id: 'phoenixFeather',
    name: '불사조의 깃털',
    emoji: '🪶',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.HP, RELIC_TAGS.HEAL],
    description: '치명상 시 HP 50%로 부활 (1회). (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'ON_DEATH',
      revive: true,
      reviveHpPercent: 0.5,
      usesPerRun: 1,
    },
  },

  phoenixAsh: {
    id: 'phoenixAsh',
    name: '불사조의 재',
    emoji: '🔥',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.STRENGTH],
    description: 'HP가 낮을수록 피해량 증가. HP 1%당 피해량 +1%. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      lowHpDamageScaling: true,
    },
  },

  abyssalCore: {
    id: 'abyssalCore',
    name: '심연의 핵',
    emoji: '🌀',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.ETHER, RELIC_TAGS.STRENGTH],
    description: '콤보 배수 +5. 매 턴 HP 3 손실. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      comboMultiplierBonus: 5,
      hpLossPerTurn: 3,
    },
  },

  timeloop: {
    id: 'timeloop',
    name: '시간의 고리',
    emoji: '⏰',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.TIMELINE],
    description: '전투 시작 시 타임라인 2칸 먼저 시작. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'ON_COMBAT_START',
      timelineAdvance: 2,
    },
  },

  paradoxShard: {
    id: 'paradoxShard',
    name: '역설의 파편',
    emoji: '💎',
    rarity: RELIC_RARITIES.LEGENDARY,
    tags: [RELIC_TAGS.ENERGY],
    description: '첫 턴 행동력 +2. 마지막 턴 행동력 +2. (이벤트 전용)',
    eventOnly: true,
    effects: {
      type: 'PASSIVE',
      firstTurnEnergy: 2,
      lastTurnEnergy: 2,
    },
  },

  // ==================== 전설 등급 ====================
  // 추가예정
};

/**
 * 등급별 상징 목록 가져오기
 */
export function getRelicsByRarity(rarity: RelicRarity | 'dev') {
  return Object.values(RELICS).filter((relic) => relic.rarity === rarity);
}

/**
 * 태그별 상징 목록 가져오기
 */
export function getRelicsByTag(tag: string) {
  return Object.values(RELICS).filter((relic) => relic.tags.includes(tag));
}

/**
 * 상징 ID로 상징 데이터 가져오기
 */
type Relic = typeof RELICS[keyof typeof RELICS];
const relicsRecord = RELICS as Record<string, Relic>;

export function getRelicById(id: string): Relic | null {
  return relicsRecord[id] || null;
}

/**
 * 모든 상징 목록 가져오기
 */
export function getAllRelics() {
  return Object.values(RELICS);
}
