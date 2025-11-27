/**
 * 유물 데이터
 *
 * 유물은 게임의 방향성을 결정짓는 아이템으로 개별 유물의 성능만큼이나 각 유물간의 연계가 중요하다.
 */

export const RELIC_RARITIES = {
  COMMON: 'common',
  RARE: 'rare',
  SPECIAL: 'special',
  LEGENDARY: 'legendary',
};

export const RELIC_TAGS = {
  ENERGY: 'energy',      // 행동력
  DRAW: 'draw',          // 드로우
  DEFENSE: 'defense',    // 방어력
  HP: 'hp',              // 체력
  HEAL: 'heal',          // 회복
  STRENGTH: 'strength',  // 힘
  AGILITY: 'agility',    // 민첩
  ETHER: 'ether',        // 에테르
};

/**
 * 유물 효과 타입
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
    description: '플레이어가 낸 카드 1장당 콤보 배율 +2.00',
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
      condition: (state) => state.cardsPlayedThisTurn >= 4,
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
    name: '적색의 지남철',
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
    description: '낸 카드에 비례해 1.x배만큼 곱합니다.',
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
    description: '5장의 카드를 내면 에테르 계산에 5배수를 곱합니다.',
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
      condition: (state) => state.playerHp === state.maxHp,
      maxHpIfFull: 2,
      healIfDamaged: 3,
    },
  },

  // ==================== 개발자 전용 ====================
  infiniteShield: {
    id: 'infiniteShield',
    name: '무한방패',
    emoji: '🛡️',
    rarity: RELIC_RARITIES.SPECIAL,
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
    rarity: RELIC_RARITIES.SPECIAL,
    tags: [RELIC_TAGS.ENERGY],
    description: '최대 행동력이 30 증가합니다. (개발용)',
    effects: {
      type: 'PASSIVE',
      maxEnergy: 30,
    },
  },

  // ==================== 전설 등급 ====================
  // 추가예정
};

/**
 * 등급별 유물 목록 가져오기
 */
export function getRelicsByRarity(rarity) {
  return Object.values(RELICS).filter(relic => relic.rarity === rarity);
}

/**
 * 태그별 유물 목록 가져오기
 */
export function getRelicsByTag(tag) {
  return Object.values(RELICS).filter(relic => relic.tags.includes(tag));
}

/**
 * 유물 ID로 유물 데이터 가져오기
 */
export function getRelicById(id) {
  return RELICS[id] || null;
}

/**
 * 모든 유물 목록 가져오기
 */
export function getAllRelics() {
  return Object.values(RELICS);
}
