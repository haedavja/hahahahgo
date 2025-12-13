// 아이템 데이터
// usableIn: 'combat' = 전투 대응단계에서만, 'any' = 언제든지
// duration: 'instant' = 즉시 효과, 'node' = 1노드 지속

export const ITEMS = {
  // === 에테르 증폭제 (에테르 획득량 배율 증가) ===
  'ether-amplifier-small': {
    id: 'ether-amplifier-small',
    name: '에테르 증폭제 (소)',
    icon: '💎',
    description: '이번 턴 에테르 획득량 1.5배',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'etherMultiplier', value: 1.5 }
  },
  'ether-amplifier-large': {
    id: 'ether-amplifier-large',
    name: '에테르 증폭제 (대)',
    icon: '💠',
    description: '이번 턴 에테르 획득량 2배',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'etherMultiplier', value: 2.0 }
  },

  // === 에테르 흡수기 (적 에테르 흡수) ===
  'ether-absorber-small': {
    id: 'ether-absorber-small',
    name: '에테르 흡수기 (소)',
    icon: '🔮',
    description: '즉시 에테르 50을 적으로부터 얻어옵니다',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'etherSteal', value: 50 }
  },
  'ether-absorber-large': {
    id: 'ether-absorber-large',
    name: '에테르 흡수기 (대)',
    icon: '🔯',
    description: '즉시 에테르 100을 적으로부터 얻어옵니다',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'etherSteal', value: 100 }
  },

  // === 폭발물 (즉시 피해) ===
  'explosive-small': {
    id: 'explosive-small',
    name: '폭발물 (소)',
    icon: '💣',
    description: '즉시 적에게 50만큼 피해를 줍니다',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'damage', value: 50 }
  },
  'explosive-large': {
    id: 'explosive-large',
    name: '폭발물 (대)',
    icon: '🧨',
    description: '즉시 적에게 100만큼 피해를 줍니다',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'damage', value: 100 }
  },

  // === 방어력 부여 ===
  'defense-grant-small': {
    id: 'defense-grant-small',
    name: '방어력 부여 (소)',
    icon: '🛡️',
    description: '방어력 20 획득',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'defense', value: 20 }
  },
  'defense-grant-large': {
    id: 'defense-grant-large',
    name: '방어력 부여 (대)',
    icon: '🛡️',
    description: '방어력 50 획득',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'defense', value: 50 }
  },

  // === 공격 강화제 (공격 상태 부여) ===
  'attack-boost-small': {
    id: 'attack-boost-small',
    name: '공격 강화제 (소)',
    icon: '⚔️',
    description: '공격 상태를 얻습니다',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'grantTokens', tokens: [{ id: 'attack', stacks: 1 }] }
  },
  'attack-boost-large': {
    id: 'attack-boost-large',
    name: '공격 강화제 (대)',
    icon: '🗡️',
    description: '공격+ 상태를 얻습니다',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'grantTokens', tokens: [{ id: 'attackPlus', stacks: 1 }] }
  },

  // === 에너지 충전기 (턴 에너지 회복) ===
  'energy-charger-small': {
    id: 'energy-charger-small',
    name: '에너지 충전기 (소)',
    icon: '🔋',
    description: '에너지 3 회복',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'turnEnergy', value: 3 }
  },
  'energy-charger-large': {
    id: 'energy-charger-large',
    name: '에너지 충전기 (대)',
    icon: '⚡',
    description: '에너지 4 회복',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'turnEnergy', value: 4 }
  },

  // === 에너지 확장기 (최대 에너지 증가) ===
  'energy-expander-small': {
    id: 'energy-expander-small',
    name: '에너지 확장기 (소)',
    icon: '📦',
    description: '이번 전투 최대 에너지 +1',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'maxEnergy', value: 1 }
  },
  'energy-expander-large': {
    id: 'energy-expander-large',
    name: '에너지 확장기 (대)',
    icon: '🎁',
    description: '이번 전투 최대 에너지 +2',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'maxEnergy', value: 2 }
  },

  // === 카드 파쇄기 (적 카드 파괴) ===
  'card-destroyer-small': {
    id: 'card-destroyer-small',
    name: '카드 파쇄기 (소)',
    icon: '✂️',
    description: '적 카드 1장 파괴',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'cardDestroy', value: 1 }
  },
  'card-destroyer-large': {
    id: 'card-destroyer-large',
    name: '카드 파쇄기 (대)',
    icon: '🔥',
    description: '적 카드 2장 파괴',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'cardDestroy', value: 2 }
  },

  // === 빙결 장치 (적 카드 빙결) ===
  'freeze-device-small': {
    id: 'freeze-device-small',
    name: '빙결 장치 (소)',
    icon: '❄️',
    description: '적 카드 1장 빙결 (1턴)',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'cardFreeze', value: 1 }
  },
  'freeze-device-large': {
    id: 'freeze-device-large',
    name: '빙결 장치 (대)',
    icon: '🧊',
    description: '적 카드 2장 빙결 (2턴)',
    tier: 2,
    usableIn: 'combat',
    effect: { type: 'cardFreeze', value: 2 }
  },

  // === 치유제 (체력 회복) - 언제든 사용 가능 ===
  'healing-potion-small': {
    id: 'healing-potion-small',
    name: '치유제 (소)',
    icon: '🧪',
    description: '체력 15 회복',
    tier: 1,
    usableIn: 'any',
    effect: { type: 'heal', value: 15 }
  },
  'healing-potion-large': {
    id: 'healing-potion-large',
    name: '치유제 (대)',
    icon: '⚗️',
    description: '체력 40 회복',
    tier: 2,
    usableIn: 'any',
    effect: { type: 'heal', value: 40 }
  },

  // === 근력 강화제 (힘 증가) - 1노드 지속 ===
  'strength-boost-small': {
    id: 'strength-boost-small',
    name: '근력 강화제 (소)',
    icon: '💪',
    description: '힘 +2 (1노드)',
    tier: 1,
    usableIn: 'any',
    duration: 'node',
    effect: { type: 'statBoost', stat: 'strength', value: 2 }
  },
  'strength-boost-large': {
    id: 'strength-boost-large',
    name: '근력 강화제 (대)',
    icon: '🦾',
    description: '힘 +5 (1노드)',
    tier: 2,
    usableIn: 'any',
    duration: 'node',
    effect: { type: 'statBoost', stat: 'strength', value: 5 }
  },

  // === 민첩 강화제 (민첩 증가) - 1노드 지속 ===
  'agility-boost-small': {
    id: 'agility-boost-small',
    name: '민첩 강화제 (소)',
    icon: '🏃',
    description: '민첩 +2 (1노드)',
    tier: 1,
    usableIn: 'any',
    duration: 'node',
    effect: { type: 'statBoost', stat: 'agility', value: 2 }
  },
  'agility-boost-large': {
    id: 'agility-boost-large',
    name: '민첩 강화제 (대)',
    icon: '⚡',
    description: '민첩 +5 (1노드)',
    tier: 2,
    usableIn: 'any',
    duration: 'node',
    effect: { type: 'statBoost', stat: 'agility', value: 5 }
  },

  // === 통찰 강화제 (통찰 증가) - 1노드 지속 ===
  'insight-boost-small': {
    id: 'insight-boost-small',
    name: '통찰 강화제 (소)',
    icon: '👁️',
    description: '통찰 +2 (1노드)',
    tier: 1,
    usableIn: 'any',
    duration: 'node',
    effect: { type: 'statBoost', stat: 'insight', value: 2 }
  },
  'insight-boost-large': {
    id: 'insight-boost-large',
    name: '통찰 강화제 (대)',
    icon: '🔮',
    description: '통찰 +5 (1노드)',
    tier: 2,
    usableIn: 'any',
    duration: 'node',
    effect: { type: 'statBoost', stat: 'insight', value: 5 }
  }
};

// 아이템 ID 목록
export const ITEM_IDS = Object.keys(ITEMS);

// 전투용 아이템만 필터
export const COMBAT_ITEMS = Object.values(ITEMS).filter(item => item.usableIn === 'combat');

// 언제든 사용 가능한 아이템만 필터
export const ANYTIME_ITEMS = Object.values(ITEMS).filter(item => item.usableIn === 'any');

// 아이템 가져오기 헬퍼
export const getItem = (itemId) => ITEMS[itemId] || null;
