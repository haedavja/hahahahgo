/**
 * tokens.js
 *
 * 게임 토큰(상태이상) 시스템 정의
 * 다키스트 던전 참고
 */

// 토큰 유형
export const TOKEN_TYPES = {
  USAGE: 'usage',        // 사용소모: 1회 사용 후 소멸
  TURN: 'turn',          // 턴소모: 해당 턴 동안 지속
  PERMANENT: 'permanent' // 반영구: 전투 중 지속
};

// 토큰 카테고리
export const TOKEN_CATEGORIES = {
  POSITIVE: 'positive',  // 긍정
  NEGATIVE: 'negative',  // 부정
  NEUTRAL: 'neutral'     // 중립
};

// 토큰 정의
export const TOKENS = {
  // === 긍정 토큰: 공격 증가 ===
  offense: {
    id: 'offense',
    name: '공세',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '⚔️',
    description: '카드의 공격력을 1회 50% 증가한다.',
    effect: { type: 'ATTACK_BOOST', value: 0.5 }
  },
  offensePlus: {
    id: 'offensePlus',
    name: '공세+',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '⚔️',
    description: '카드의 공격력이 1회 100% 증가한다.',
    effect: { type: 'ATTACK_BOOST', value: 1.0 }
  },
  attack: {
    id: 'attack',
    name: '공격',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '⚔️',
    description: '이번 턴에 내는 모든 카드의 공격력이 50% 증가한다.',
    effect: { type: 'ATTACK_BOOST', value: 0.5 }
  },
  attackPlus: {
    id: 'attackPlus',
    name: '공격+',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '⚔️',
    description: '이번 턴에 내는 모든 카드의 공격력이 100% 증가한다.',
    effect: { type: 'ATTACK_BOOST', value: 1.0 }
  },

  // === 긍정 토큰: 방어 증가 ===
  guard: {
    id: 'guard',
    name: '수세',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🛡️',
    description: '다음 카드로부터 얻는 방어력을 1회 50% 증가한다.',
    effect: { type: 'DEFENSE_BOOST', value: 0.5 }
  },
  guardPlus: {
    id: 'guardPlus',
    name: '수세+',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🛡️',
    description: '다음 카드로부터 얻는 방어력을 1회 100% 증가한다.',
    effect: { type: 'DEFENSE_BOOST', value: 1.0 }
  },
  defense: {
    id: 'defense',
    name: '방어',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🛡️',
    description: '이번 턴에 내는 모든 카드로부터 얻는 방어력이 50% 증가한다.',
    effect: { type: 'DEFENSE_BOOST', value: 0.5 }
  },
  defensePlus: {
    id: 'defensePlus',
    name: '방어+',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🛡️',
    description: '이번 턴에 내는 모든 카드로부터 얻는 방어력이 100% 증가한다.',
    effect: { type: 'DEFENSE_BOOST', value: 1.0 }
  },

  // === 긍정 토큰: 회피 ===
  blur: {
    id: 'blur',
    name: '흐릿함',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💨',
    description: '공격을 1회 50% 확률로 피한다.',
    effect: { type: 'DODGE', value: 0.5 }
  },
  blurPlus: {
    id: 'blurPlus',
    name: '흐릿함+',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💨',
    description: '공격을 1회 75% 확률로 피한다.',
    effect: { type: 'DODGE', value: 0.75 }
  },
  dodge: {
    id: 'dodge',
    name: '회피',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💨',
    description: '이번 턴에 가해지는 모든 공격을 50% 확률로 피한다.',
    effect: { type: 'DODGE', value: 0.5 }
  },
  dodgePlus: {
    id: 'dodgePlus',
    name: '회피+',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💨',
    description: '이번 턴에 가해지는 모든 공격을 75% 확률로 피한다.',
    effect: { type: 'DODGE', value: 0.75 }
  },

  // === 긍정 토큰: 특수 ===
  counter: {
    id: 'counter',
    name: '반격',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '↩️',
    description: '공격 받으면 1회 5(+힘)의 피해를 되돌려줍니다.',
    effect: { type: 'COUNTER', value: 5 }
  },
  absorb: {
    id: 'absorb',
    name: '흡수',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🩸',
    description: '빼앗은 상대의 체력 50%만큼 1회 회복합니다.',
    effect: { type: 'LIFESTEAL', value: 0.5 }
  },
  encouragement: {
    id: 'encouragement',
    name: '고무',
    type: TOKEN_TYPES.PERMANENT,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '✨',
    description: '은총화 1개를 얻을때마다 에너지를 1개 얻는다.',
    effect: { type: 'ETHER_TO_ENERGY', value: 1 }
  },
  revive: {
    id: 'revive',
    name: '부활',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💫',
    description: '체력이 0이 되면 50%의 체력을 갖고 1회 되살아납니다.',
    effect: { type: 'REVIVE', value: 0.5 }
  },
  block: {
    id: 'block',
    name: '차단',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🚫',
    description: '상대의 통찰을 -1 감소시킨다.',
    effect: { type: 'REDUCE_INSIGHT', value: 1 }
  },
  immunity: {
    id: 'immunity',
    name: '면역',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '🛡️',
    description: '모든 부정적 토큰을 1회 막아낸다. (최고 우선순위)',
    effect: { type: 'IMMUNITY', value: 1 }
  },
  warmedUp: {
    id: 'warmedUp',
    name: '몸풀기',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💪',
    description: '이번 턴에 최대 행동력이 2 증가한다.',
    effect: { type: 'ENERGY_BOOST', value: 2 }
  },

  // === 중립 토큰 ===
  insight: {
    id: 'insight',
    name: '통찰',
    type: TOKEN_TYPES.PERMANENT,
    category: TOKEN_CATEGORIES.NEUTRAL,
    emoji: '👁️',
    description: '레벨에따라 (-lv3 망각, -lv2 미련, -lv1 우둔, lv0 평온, lv1 예측, lv2 독심, lv3 혜안)',
    effect: { type: 'INSIGHT', value: 0 }
  },
  strength: {
    id: 'strength',
    name: '힘',
    type: TOKEN_TYPES.PERMANENT,
    category: TOKEN_CATEGORIES.NEUTRAL,
    emoji: '💪',
    description: '공격력과 방어력을 1 증가시킨다.',
    effect: { type: 'STRENGTH', value: 1 }
  },
  agility: {
    id: 'agility',
    name: '민첩',
    type: TOKEN_TYPES.PERMANENT,
    category: TOKEN_CATEGORIES.NEUTRAL,
    emoji: '⚡',
    description: '카드의 시간 소모를 1 감소시킨다.',
    effect: { type: 'AGILITY', value: 1 }
  },
  plunder: {
    id: 'plunder',
    name: '약탈',
    type: TOKEN_TYPES.PERMANENT,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '💰',
    description: '상대의 체력을 빼앗을 때마다 금을 10만큼 빼앗는다.',
    effect: { type: 'GOLD_ON_DAMAGE', value: 10 }
  },

  // === 부정 토큰: 피해 증가 ===
  vulnerable: {
    id: 'vulnerable',
    name: '허약',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '💔',
    description: '이번 턴의 모든 공격 피해로부터 50% 추가 피해를 입는다.',
    effect: { type: 'DAMAGE_TAKEN', value: 0.5 }
  },
  vulnerablePlus: {
    id: 'vulnerablePlus',
    name: '허약+',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '💔',
    description: '이번 턴의 모든 공격 피해로부터 100% 추가피해를 입는다.',
    effect: { type: 'DAMAGE_TAKEN', value: 1.0 }
  },
  pain: {
    id: 'pain',
    name: '아픔',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '💢',
    description: '다음 공격 피해에 1회 50% 추가 피해를 입는다.',
    effect: { type: 'DAMAGE_TAKEN', value: 0.5 }
  },
  painPlus: {
    id: 'painPlus',
    name: '아픔+',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '💢',
    description: '다음 공격 피해에 1회 100% 추가 피해를 입는다.',
    effect: { type: 'DAMAGE_TAKEN', value: 1.0 }
  },

  // === 부정 토큰: 공격 감소 ===
  dullness: {
    id: 'dullness',
    name: '무딤',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '🔻',
    description: '이번 턴에 내는 모든 공격 카드의 피해가 50% 감소한다.',
    effect: { type: 'ATTACK_PENALTY', value: 0.5 }
  },
  dullnessPlus: {
    id: 'dullnessPlus',
    name: '무딤+',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '🔻',
    description: '이번 턴에 내는 모든 공격 카드의 피해가 100% 감소한다.',
    effect: { type: 'ATTACK_PENALTY', value: 1.0 }
  },

  // === 부정 토큰: 방어 감소 ===
  shaken: {
    id: 'shaken',
    name: '흔들림',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '📉',
    description: '다음 방어카드로부터 얻는 방어력이 50% 감소합니다.',
    effect: { type: 'DEFENSE_PENALTY', value: 0.5 }
  },
  shakenPlus: {
    id: 'shakenPlus',
    name: '흔들림+',
    type: TOKEN_TYPES.USAGE,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '📉',
    description: '다음 방어카드로부터 얻는 방어력이 100% 감소합니다.',
    effect: { type: 'DEFENSE_PENALTY', value: 1.0 }
  },
  exposed: {
    id: 'exposed',
    name: '무방비',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '🚨',
    description: '이번 턴에 내는 모든 방어카드로부터 얻는 방어력이 50% 감소합니다.',
    effect: { type: 'DEFENSE_PENALTY', value: 0.5 }
  },
  exposedPlus: {
    id: 'exposedPlus',
    name: '무방비+',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '🚨',
    description: '이번 턴에 내는 모든 방어카드로부터 얻는 방어력이 100% 감소합니다.',
    effect: { type: 'DEFENSE_PENALTY', value: 1.0 }
  },

  // === 부정 토큰: 기타 ===
  dizzy: {
    id: 'dizzy',
    name: '현기증',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '😵',
    description: '이번 턴에 최대 행동력이 2 감소한다',
    effect: { type: 'ENERGY_PENALTY', value: 2 }
  },
  curse: {
    id: 'curse',
    name: '저주',
    type: TOKEN_TYPES.PERMANENT,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '☠️',
    description: '저주마다 특성이 다를 예정. 만들어놓기만 할 것.',
    effect: { type: 'CURSE', value: 1 }
  },

  // === 특수 효과 토큰 ===
  persistent_strike: {
    id: 'persistent_strike',
    name: '집요한 타격',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.POSITIVE,
    emoji: '👊',
    description: '이번 턴에 적이 카드를 사용할 때마다 피해를 입힌다.',
    effect: { type: 'PERSISTENT_STRIKE', value: 20 }
  },
  half_ether: {
    id: 'half_ether',
    name: '에테르 감소',
    type: TOKEN_TYPES.TURN,
    category: TOKEN_CATEGORIES.NEGATIVE,
    emoji: '✨',
    description: '이번 턴 에테르 획득이 50% 감소한다.',
    effect: { type: 'HALF_ETHER', value: 0.5 }
  }
};

// 토큰 상쇄 매핑 (반대되는 긍정/부정 토큰)
export const TOKEN_CANCELLATION_MAP = {
  // 공격 증가 ↔ 공격 감소
  offense: 'dullness',
  offensePlus: 'dullness',
  attack: 'dullness',
  attackPlus: 'dullness',
  dullness: 'attack',
  dullnessPlus: 'attack',

  // 방어 증가 ↔ 방어 감소
  guard: 'exposed',
  guardPlus: 'exposed',
  defense: 'exposed',
  defensePlus: 'exposed',
  exposed: 'defense',
  exposedPlus: 'defense',
  shaken: 'defense',
  shakenPlus: 'defense',

  // 행동력 증가 ↔ 행동력 감소
  warmedUp: 'dizzy',
  dizzy: 'warmedUp'
};

// 토큰 배지 색상 (UI용)
export const TOKEN_COLORS = {
  [TOKEN_TYPES.USAGE]: '#fbbf24',      // 노란색
  [TOKEN_TYPES.TURN]: '#60a5fa',       // 파란색
  [TOKEN_TYPES.PERMANENT]: '#a78bfa'   // 보라색
};

// 카테고리별 색상
export const TOKEN_CATEGORY_COLORS = {
  [TOKEN_CATEGORIES.POSITIVE]: '#22c55e',  // 초록색
  [TOKEN_CATEGORIES.NEGATIVE]: '#ef4444',  // 빨간색
  [TOKEN_CATEGORIES.NEUTRAL]: '#94a3b8'    // 회색
};
