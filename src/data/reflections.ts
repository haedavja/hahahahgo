/**
 * @file reflections.js
 * @description 개성과 성찰 시스템 정의
 *
 * ## 개성 (Personality Traits)
 * - 용맹함, 열정적, 냉철함, 철저함, 활력적, 굳건함
 *
 * ## 성찰 (Reflection)
 * - 자아 획득 시 활성화
 * - 개성 조합에 따라 매 턴 확률적 효과 발동
 *
 * @typedef {Object} Reflection
 * @property {string} id - 성찰 ID
 * @property {string[]} requiredTraits - 필요 개성
 * @property {Object} effects - 효과
 */

// 한국어 개성 이름 → 영어 ID 매핑
export const TRAIT_NAME_TO_ID = {
  '용맹함': 'valiant',
  '열정적': 'passionate',
  '냉철함': 'calm',
  '철저함': 'thorough',
  '활력적': 'energetic',
  '굳건함': 'steadfast'
};

// 한국어 자아 이름 → 성찰 ID 매핑
export const EGO_NAME_TO_REFLECTION_ID = {
  '헌신': 'devotion',
  '지략': 'strategy',
  '추격': 'pursuit',
  '역동': 'dynamism',
  '결의': 'resolve',
  '추진': 'drive',
  '신념': 'faith',
  '완성': 'completion',
  '분석': 'analysis',
  '실행': 'execution',
  '정열': 'passion',
  '지배': 'dominance'
};

/**
 * 한국어 개성 이름 배열을 영어 ID 배열로 변환
 * @param {string[]} koreanTraits - 한국어 개성 이름 배열
 * @returns {string[]} 영어 개성 ID 배열
 */
export function convertTraitsToIds(koreanTraits) {
  if (!koreanTraits || !Array.isArray(koreanTraits)) return [];
  return koreanTraits
    .map(trait => TRAIT_NAME_TO_ID[trait])
    .filter(id => id); // 매핑되지 않은 값 제외
}

// 기본 개성 정의
export const PERSONALITY_TRAITS = {
  valiant: {
    id: 'valiant',
    name: '용맹함',
    emoji: '⚔️',
    description: '두려움 없이 전진하는 성향'
  },
  passionate: {
    id: 'passionate',
    name: '열정적',
    emoji: '🔥',
    description: '뜨거운 열정으로 임하는 성향'
  },
  calm: {
    id: 'calm',
    name: '냉철함',
    emoji: '❄️',
    description: '차분하게 상황을 분석하는 성향'
  },
  thorough: {
    id: 'thorough',
    name: '철저함',
    emoji: '🎯',
    description: '꼼꼼하게 준비하는 성향'
  },
  energetic: {
    id: 'energetic',
    name: '활력적',
    emoji: '⚡',
    description: '활기차게 움직이는 성향'
  },
  steadfast: {
    id: 'steadfast',
    name: '굳건함',
    emoji: '🛡️',
    description: '흔들리지 않는 단단한 성향'
  }
};

// 성찰 효과 타입
export const REFLECTION_EFFECT_TYPES = {
  ADD_TOKEN: 'addToken',           // 토큰 추가
  ENERGY_BOOST: 'energyBoost',     // 행동력 증가
  HEAL_PERCENT: 'healPercent',     // 체력 % 회복
  ETHER_MULTIPLIER: 'etherMultiplier', // 에테르 배율
  TIMELINE_BOOST: 'timelineBoost', // 타임라인 최대치 증가
  CARD_FREEZE: 'cardFreeze'        // 적 타임라인 동결
};

// 성찰 정의
export const REFLECTIONS = {
  // === 50% 확률 (용맹함 조합) ===
  devotion: {
    id: 'devotion',
    name: '헌신',
    emoji: '💪',
    description: '공세 획득',
    requires: ['passionate', 'valiant'],
    probability: 0.5,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'offense',
      stacks: 1
    }
  },
  strategy: {
    id: 'strategy',
    name: '지략',
    emoji: '🧠',
    description: '수세 획득',
    requires: ['calm', 'valiant'],
    probability: 0.5,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'guard',
      stacks: 1
    }
  },
  pursuit: {
    id: 'pursuit',
    name: '추격',
    emoji: '💨',
    description: '흐릿함 획득',
    requires: ['thorough', 'valiant'],
    probability: 0.5,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'blur',
      stacks: 1
    }
  },
  dynamism: {
    id: 'dynamism',
    name: '역동',
    emoji: '🌟',
    description: '행동력 +1',
    requires: ['energetic', 'valiant'],
    probability: 0.5,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ENERGY_BOOST,
      value: 1
    }
  },

  // === 30% 확률 (굳건함 조합) ===
  resolve: {
    id: 'resolve',
    name: '결의',
    emoji: '❤️',
    description: '체력 2% 회복 (최대 4회)',
    requires: ['steadfast', 'calm'],
    probability: 0.3,
    maxTriggers: 4,
    effect: {
      type: REFLECTION_EFFECT_TYPES.HEAL_PERCENT,
      value: 0.02
    }
  },
  drive: {
    id: 'drive',
    name: '추진',
    emoji: '💪',
    description: '힘 +1',
    requires: ['steadfast', 'energetic'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'strength',
      stacks: 1
    }
  },
  faith: {
    id: 'faith',
    name: '신념',
    emoji: '✨',
    description: '면역 +1',
    requires: ['steadfast', 'passionate'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'immunity',
      stacks: 1
    }
  },
  completion: {
    id: 'completion',
    name: '완성',
    emoji: '💎',
    description: '에테르 1.5배 획득',
    requires: ['steadfast', 'thorough'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ETHER_MULTIPLIER,
      value: 1.5
    }
  },

  // === 30% 확률 (기타 조합) ===
  analysis: {
    id: 'analysis',
    name: '분석',
    emoji: '👁️',
    description: '통찰 +1',
    requires: ['calm', 'passionate'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'insight',
      stacks: 1
    }
  },
  execution: {
    id: 'execution',
    name: '실행',
    emoji: '⏱️',
    description: '타임라인 +5',
    requires: ['calm', 'thorough'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.TIMELINE_BOOST,
      value: 5
    }
  },
  passion: {
    id: 'passion',
    name: '정열',
    emoji: '🔥',
    description: '민첩 +1',
    requires: ['energetic', 'passionate'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.ADD_TOKEN,
      tokenId: 'agility',
      stacks: 1
    }
  },
  dominance: {
    id: 'dominance',
    name: '지배',
    emoji: '❄️',
    description: '적 타임라인 동결',
    requires: ['energetic', 'thorough'],
    probability: 0.3,
    effect: {
      type: REFLECTION_EFFECT_TYPES.CARD_FREEZE,
      value: 1
    }
  }
};

/**
 * 개성 배열로 활성화된 성찰 목록 반환 (모든 조합 체크)
 * @param {string[]} traits - 개성 ID 배열
 * @returns {Object[]} 활성화된 성찰 목록
 * @deprecated 자아 기반 성찰 시스템으로 변경됨. getReflectionsByEgos 사용 권장
 */
export function getActiveReflections(traits) {
  if (!traits || traits.length < 2) return [];

  const traitSet = new Set(traits);
  const activeReflections = [];

  for (const reflection of Object.values(REFLECTIONS)) {
    const hasAll = reflection.requires.every(req => traitSet.has(req));
    if (hasAll) {
      activeReflections.push(reflection);
    }
  }

  return activeReflections;
}

/**
 * 획득한 자아로 활성화된 성찰 목록 반환
 * @param {(string|Object)[]} egos - 자아 배열 (문자열 또는 { name, consumedTraits, effects } 객체)
 * @returns {Object[]} 활성화된 성찰 목록
 */
export function getReflectionsByEgos(egos) {
  if (!egos || egos.length === 0) return [];

  const activeReflections = [];

  for (const ego of egos) {
    // 자아가 객체인 경우 name 속성 사용, 문자열인 경우 그대로 사용
    const egoName = typeof ego === 'object' ? ego.name : ego;
    const reflectionId = EGO_NAME_TO_REFLECTION_ID[egoName];
    if (reflectionId && REFLECTIONS[reflectionId]) {
      activeReflections.push(REFLECTIONS[reflectionId]);
    }
  }

  return activeReflections;
}

/**
 * 개성 수에 따른 확률 보너스 계산
 * @param {number} traitCount - 개성 개수
 * @returns {number} 추가 확률 (0 ~ 0.25)
 */
export function getTraitCountBonus(traitCount) {
  // 5개 초과 시 개당 5% 추가
  if (traitCount <= 5) return 0;
  return (traitCount - 5) * 0.05;
}
