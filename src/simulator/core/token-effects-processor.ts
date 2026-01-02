/**
 * @file token-effects-processor.ts
 * @description 세부 토큰 효과 처리기 - 모든 토큰 효과 완전 구현
 *
 * ## 토큰 카테고리
 * - 공격 수정: offense, attack, strength, dull, sharpened
 * - 방어 수정: guard, defense, shaken, exposed
 * - 회피: blur, evasion, dodge
 * - 피해 수정: vulnerable, pain, thorns
 * - 상태이상: burn, poison, bleed, stun, freeze
 * - 특수: counter, counterShot, roulette, jam, reload
 * - 기교: finesse, focus
 * - 탄약: ammo, armorPiercing, incendiary, fragmentation
 */

import type { TokenState, GameBattleState, GameCard } from './game-types';
import { addToken, removeToken, getTokenStacks, hasToken, clearToken } from './token-system';

// ==================== 타입 정의 ====================

export interface TokenEffect {
  id: string;
  name: string;
  description: string;
  category: 'positive' | 'negative' | 'neutral';
  type: 'usage' | 'turn' | 'permanent' | 'stack';
  onApply?: (state: GameBattleState, actor: 'player' | 'enemy', stacks: number) => void;
  onRemove?: (state: GameBattleState, actor: 'player' | 'enemy') => void;
  onTurnStart?: (state: GameBattleState, actor: 'player' | 'enemy') => TokenEffectResult;
  onTurnEnd?: (state: GameBattleState, actor: 'player' | 'enemy') => TokenEffectResult;
  onAttack?: (state: GameBattleState, actor: 'player' | 'enemy', damage: number) => TokenEffectResult;
  onDefend?: (state: GameBattleState, actor: 'player' | 'enemy', block: number) => TokenEffectResult;
  onTakeDamage?: (state: GameBattleState, actor: 'player' | 'enemy', damage: number) => TokenEffectResult;
  onDealDamage?: (state: GameBattleState, actor: 'player' | 'enemy', damage: number) => TokenEffectResult;
}

export interface TokenEffectResult {
  /** 수정된 수치 */
  modifiedValue?: number;
  /** 추가 피해 */
  bonusDamage?: number;
  /** 추가 방어 */
  bonusBlock?: number;
  /** 자해 피해 */
  selfDamage?: number;
  /** 회복량 */
  heal?: number;
  /** 회피 여부 */
  evaded?: boolean;
  /** 소모된 토큰 */
  consumedTokens?: string[];
  /** 적용된 효과 */
  appliedEffects?: string[];
  /** 새로 부여된 토큰 */
  appliedTokens?: { id: string; stacks: number; target: 'player' | 'enemy' }[];
}

// ==================== 토큰 효과 정의 ====================

export const TOKEN_EFFECTS: Record<string, TokenEffect> = {
  // ========== 공격 관련 ==========

  offense: {
    id: 'offense',
    name: '공세',
    description: '다음 공격의 피해량 50% 증가',
    category: 'positive',
    type: 'usage',
    onAttack: (_state, _actor, damage) => ({
      modifiedValue: Math.floor(damage * 1.5),
      consumedTokens: ['offense'],
      appliedEffects: ['공세: 피해 50% 증가'],
    }),
  },

  offensePlus: {
    id: 'offensePlus',
    name: '공세+',
    description: '다음 공격의 피해량 100% 증가',
    category: 'positive',
    type: 'usage',
    onAttack: (_state, _actor, damage) => ({
      modifiedValue: damage * 2,
      consumedTokens: ['offensePlus'],
      appliedEffects: ['공세+: 피해 100% 증가'],
    }),
  },

  strength: {
    id: 'strength',
    name: '힘',
    description: '스택당 공격력 +1',
    category: 'positive',
    type: 'permanent',
    onAttack: (state, actor, damage) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'strength');
      return {
        modifiedValue: damage + stacks,
        appliedEffects: stacks > 0 ? [`힘: +${stacks} 피해`] : [],
      };
    },
  },

  dull: {
    id: 'dull',
    name: '무딤',
    description: '다음 공격의 피해량 50% 감소',
    category: 'negative',
    type: 'usage',
    onAttack: (_state, _actor, damage) => ({
      modifiedValue: Math.floor(damage * 0.5),
      consumedTokens: ['dull'],
      appliedEffects: ['무딤: 피해 50% 감소'],
    }),
  },

  dullPlus: {
    id: 'dullPlus',
    name: '무딤+',
    description: '다음 공격의 피해량 75% 감소',
    category: 'negative',
    type: 'usage',
    onAttack: (_state, _actor, damage) => ({
      modifiedValue: Math.floor(damage * 0.25),
      consumedTokens: ['dullPlus'],
      appliedEffects: ['무딤+: 피해 75% 감소'],
    }),
  },

  sharpened: {
    id: 'sharpened',
    name: '날 세우기',
    description: '검격 카드의 피해량 +3',
    category: 'positive',
    type: 'turn',
  },

  // ========== 방어 관련 ==========

  guard: {
    id: 'guard',
    name: '수세',
    description: '다음 방어력 50% 증가',
    category: 'positive',
    type: 'usage',
    onDefend: (_state, _actor, block) => ({
      modifiedValue: Math.floor(block * 1.5),
      consumedTokens: ['guard'],
      appliedEffects: ['수세: 방어력 50% 증가'],
    }),
  },

  guardPlus: {
    id: 'guardPlus',
    name: '수세+',
    description: '다음 방어력 100% 증가',
    category: 'positive',
    type: 'usage',
    onDefend: (_state, _actor, block) => ({
      modifiedValue: block * 2,
      consumedTokens: ['guardPlus'],
      appliedEffects: ['수세+: 방어력 100% 증가'],
    }),
  },

  shaken: {
    id: 'shaken',
    name: '흔들림',
    description: '다음 방어력 50% 감소',
    category: 'negative',
    type: 'usage',
    onDefend: (_state, _actor, block) => ({
      modifiedValue: Math.floor(block * 0.5),
      consumedTokens: ['shaken'],
      appliedEffects: ['흔들림: 방어력 50% 감소'],
    }),
  },

  exposed: {
    id: 'exposed',
    name: '무방비',
    description: '턴 동안 방어력 50% 감소',
    category: 'negative',
    type: 'turn',
    onDefend: (_state, _actor, block) => ({
      modifiedValue: Math.floor(block * 0.5),
      appliedEffects: ['무방비: 방어력 50% 감소'],
    }),
  },

  exposedPlus: {
    id: 'exposedPlus',
    name: '무방비+',
    description: '턴 동안 방어력 획득 불가',
    category: 'negative',
    type: 'turn',
    onDefend: () => ({
      modifiedValue: 0,
      appliedEffects: ['무방비+: 방어력 획득 불가'],
    }),
  },

  // ========== 회피 관련 ==========

  blur: {
    id: 'blur',
    name: '흐릿함',
    description: '50% 확률로 피해 회피',
    category: 'positive',
    type: 'usage',
    onTakeDamage: (_state, _actor, damage) => {
      if (Math.random() < 0.5) {
        return {
          modifiedValue: 0,
          evaded: true,
          consumedTokens: ['blur'],
          appliedEffects: ['흐릿함: 피해 회피!'],
        };
      }
      return {
        modifiedValue: damage,
        consumedTokens: ['blur'],
        appliedEffects: ['흐릿함: 회피 실패'],
      };
    },
  },

  evasion: {
    id: 'evasion',
    name: '회피',
    description: '피해 1회 완전 회피',
    category: 'positive',
    type: 'usage',
    onTakeDamage: () => ({
      modifiedValue: 0,
      evaded: true,
      consumedTokens: ['evasion'],
      appliedEffects: ['회피: 피해 무효!'],
    }),
  },

  vigilance: {
    id: 'vigilance',
    name: '경계',
    description: '피해를 막을 때 반격',
    category: 'positive',
    type: 'usage',
  },

  // ========== 피해 수정 ==========

  vulnerable: {
    id: 'vulnerable',
    name: '허약',
    description: '받는 피해 50% 증가',
    category: 'negative',
    type: 'usage',
    onTakeDamage: (_state, _actor, damage) => ({
      modifiedValue: Math.floor(damage * 1.5),
      consumedTokens: ['vulnerable'],
      appliedEffects: ['허약: 받는 피해 50% 증가'],
    }),
  },

  vulnerablePlus: {
    id: 'vulnerablePlus',
    name: '허약+',
    description: '받는 피해 100% 증가',
    category: 'negative',
    type: 'usage',
    onTakeDamage: (_state, _actor, damage) => ({
      modifiedValue: damage * 2,
      consumedTokens: ['vulnerablePlus'],
      appliedEffects: ['허약+: 받는 피해 100% 증가'],
    }),
  },

  pain: {
    id: 'pain',
    name: '아픔',
    description: '받는 피해 50% 증가',
    category: 'negative',
    type: 'usage',
    onTakeDamage: (_state, _actor, damage) => ({
      modifiedValue: Math.floor(damage * 1.5),
      consumedTokens: ['pain'],
      appliedEffects: ['아픔: 받는 피해 50% 증가'],
    }),
  },

  thorns: {
    id: 'thorns',
    name: '가시',
    description: '피해를 받으면 공격자에게 반사 피해',
    category: 'positive',
    type: 'permanent',
    onTakeDamage: (state, actor, damage) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'thorns');
      return {
        modifiedValue: damage,
        appliedEffects: stacks > 0 ? [`가시: ${stacks} 반사 피해`] : [],
        appliedTokens: stacks > 0 ? [{ id: 'thorns_damage', stacks, target: actor === 'player' ? 'enemy' : 'player' }] : [],
      };
    },
  },

  // ========== 상태이상 ==========

  burn: {
    id: 'burn',
    name: '화상',
    description: '턴 시작 시 스택 x 3 피해',
    category: 'negative',
    type: 'stack',
    onTurnStart: (state, actor) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'burn');
      if (stacks > 0) {
        const damage = stacks * 3;
        return {
          selfDamage: damage,
          appliedEffects: [`화상: ${damage} 피해 (${stacks}스택)`],
        };
      }
      return {};
    },
  },

  poison: {
    id: 'poison',
    name: '독',
    description: '턴 종료 시 스택만큼 피해, 스택 1 감소',
    category: 'negative',
    type: 'stack',
    onTurnEnd: (state, actor) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'poison');
      if (stacks > 0) {
        return {
          selfDamage: stacks,
          consumedTokens: ['poison_1'], // 1 스택 감소
          appliedEffects: [`독: ${stacks} 피해`],
        };
      }
      return {};
    },
  },

  bleed: {
    id: 'bleed',
    name: '출혈',
    description: '행동 시 스택 x 2 피해, 스택 1 감소',
    category: 'negative',
    type: 'stack',
    onAttack: (state, actor, damage) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'bleed');
      if (stacks > 0) {
        return {
          modifiedValue: damage,
          selfDamage: stacks * 2,
          consumedTokens: ['bleed_1'],
          appliedEffects: [`출혈: ${stacks * 2} 자해`],
        };
      }
      return { modifiedValue: damage };
    },
  },

  stun: {
    id: 'stun',
    name: '기절',
    description: '다음 카드 사용 불가',
    category: 'negative',
    type: 'usage',
  },

  freeze: {
    id: 'freeze',
    name: '빙결',
    description: '속도 2 증가',
    category: 'negative',
    type: 'usage',
  },

  slow: {
    id: 'slow',
    name: '둔화',
    description: '속도 1 증가',
    category: 'negative',
    type: 'turn',
  },

  // ========== 특수 토큰 ==========

  counter: {
    id: 'counter',
    name: '반격',
    description: '피해를 받으면 자동 공격',
    category: 'positive',
    type: 'usage',
    onTakeDamage: (state, actor, damage) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      if (hasToken(tokens, 'counter')) {
        const strength = getTokenStacks(tokens, 'strength');
        return {
          modifiedValue: damage,
          consumedTokens: ['counter'],
          appliedEffects: [`반격: ${5 + strength} 피해`],
          appliedTokens: [{ id: 'counter_damage', stacks: 5 + strength, target: actor === 'player' ? 'enemy' : 'player' }],
        };
      }
      return { modifiedValue: damage };
    },
  },

  counterShot: {
    id: 'counterShot',
    name: '대응사격',
    description: '피해를 받으면 사격',
    category: 'positive',
    type: 'usage',
    onTakeDamage: (state, actor, damage) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      if (hasToken(tokens, 'counterShot')) {
        return {
          modifiedValue: damage,
          consumedTokens: ['counterShot'],
          appliedEffects: ['대응사격: 8 피해'],
          appliedTokens: [
            { id: 'counterShot_damage', stacks: 8, target: actor === 'player' ? 'enemy' : 'player' },
            { id: 'roulette', stacks: 1, target: actor },
          ],
        };
      }
      return { modifiedValue: damage };
    },
  },

  roulette: {
    id: 'roulette',
    name: '룰렛',
    description: '스택 x 5% 확률로 탄걸림',
    category: 'neutral',
    type: 'stack',
  },

  gun_jam: {
    id: 'gun_jam',
    name: '탄걸림',
    description: '사격 불가, 장전 필요',
    category: 'negative',
    type: 'permanent',
  },

  jam_immunity: {
    id: 'jam_immunity',
    name: '탄걸림 면역',
    description: '탄걸림 발생 방지',
    category: 'positive',
    type: 'usage',
  },

  // ========== 기교/집중 ==========

  finesse: {
    id: 'finesse',
    name: '기교',
    description: '검격 카드 강화, 연계 보너스',
    category: 'positive',
    type: 'stack',
    onAttack: (state, actor, damage) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'finesse');
      // 기교는 특정 카드에서만 소모됨
      return { modifiedValue: damage };
    },
  },

  focus: {
    id: 'focus',
    name: '집중',
    description: '치명타 확률 증가',
    category: 'positive',
    type: 'stack',
  },

  // ========== 탄약 ==========

  armorPiercing: {
    id: 'armorPiercing',
    name: '철갑탄',
    description: '방어력 무시',
    category: 'positive',
    type: 'usage',
    onAttack: () => ({
      appliedEffects: ['철갑탄: 방어력 무시'],
      consumedTokens: ['armorPiercing'],
    }),
  },

  incendiary: {
    id: 'incendiary',
    name: '소이탄',
    description: '피해 시 화상 2 부여',
    category: 'positive',
    type: 'usage',
    onDealDamage: (_state, actor) => ({
      consumedTokens: ['incendiary'],
      appliedEffects: ['소이탄: 화상 2 부여'],
      appliedTokens: [{ id: 'burn', stacks: 2, target: actor === 'player' ? 'enemy' : 'player' }],
    }),
  },

  fragmentation: {
    id: 'fragmentation',
    name: '파쇄탄',
    description: '피해 +6',
    category: 'positive',
    type: 'usage',
    onAttack: (_state, _actor, damage) => ({
      modifiedValue: damage + 6,
      consumedTokens: ['fragmentation'],
      appliedEffects: ['파쇄탄: +6 피해'],
    }),
  },

  // ========== 기타 ==========

  regeneration: {
    id: 'regeneration',
    name: '재생',
    description: '턴 시작 시 스택만큼 회복',
    category: 'positive',
    type: 'stack',
    onTurnStart: (state, actor) => {
      const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
      const stacks = getTokenStacks(tokens, 'regeneration');
      if (stacks > 0) {
        return {
          heal: stacks,
          appliedEffects: [`재생: ${stacks} 회복`],
        };
      }
      return {};
    },
  },

  absorb: {
    id: 'absorb',
    name: '흡수',
    description: '피해의 50% 회복',
    category: 'positive',
    type: 'usage',
    onDealDamage: (_state, _actor, damage) => ({
      heal: Math.floor(damage * 0.5),
      consumedTokens: ['absorb'],
      appliedEffects: [`흡수: ${Math.floor(damage * 0.5)} 회복`],
    }),
  },

  immunity: {
    id: 'immunity',
    name: '면역',
    description: '부정 효과 1회 차단',
    category: 'positive',
    type: 'usage',
  },

  revive: {
    id: 'revive',
    name: '부활',
    description: '체력 0 시 50% 체력으로 부활',
    category: 'positive',
    type: 'usage',
  },

  agility: {
    id: 'agility',
    name: '민첩',
    description: '카드 속도 1 감소',
    category: 'positive',
    type: 'stack',
  },

  warmedUp: {
    id: 'warmedUp',
    name: '몸풀기',
    description: '행동력 +2',
    category: 'positive',
    type: 'turn',
  },

  dizzy: {
    id: 'dizzy',
    name: '현기증',
    description: '행동력 -2',
    category: 'negative',
    type: 'turn',
  },
};

// ==================== 효과 처리 함수 ====================

/**
 * 공격 시 토큰 효과 처리
 */
export function processAttackTokenEffects(
  state: GameBattleState,
  actor: 'player' | 'enemy',
  baseDamage: number,
  card?: GameCard
): TokenEffectResult {
  const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
  let modifiedDamage = baseDamage;
  const effects: string[] = [];
  const consumedTokens: string[] = [];
  const appliedTokens: { id: string; stacks: number; target: 'player' | 'enemy' }[] = [];

  // 공세 처리
  if (hasToken(tokens, 'offensePlus')) {
    modifiedDamage *= 2;
    consumedTokens.push('offensePlus');
    effects.push('공세+: 피해 100% 증가');
  } else if (hasToken(tokens, 'offense')) {
    modifiedDamage = Math.floor(modifiedDamage * 1.5);
    consumedTokens.push('offense');
    effects.push('공세: 피해 50% 증가');
  }

  // 힘 처리
  const strength = getTokenStacks(tokens, 'strength');
  if (strength > 0) {
    modifiedDamage += strength;
    effects.push(`힘: +${strength} 피해`);
  }

  // 무딤 처리
  if (hasToken(tokens, 'dullPlus')) {
    modifiedDamage = Math.floor(modifiedDamage * 0.25);
    consumedTokens.push('dullPlus');
    effects.push('무딤+: 피해 75% 감소');
  } else if (hasToken(tokens, 'dull')) {
    modifiedDamage = Math.floor(modifiedDamage * 0.5);
    consumedTokens.push('dull');
    effects.push('무딤: 피해 50% 감소');
  }

  // 날 세우기 (검격 카드)
  if (card?.cardCategory === 'fencing' && hasToken(tokens, 'sharpened')) {
    modifiedDamage += 3;
    effects.push('날 세우기: +3 피해');
  }

  // 파쇄탄
  if (card?.cardCategory === 'gun' && hasToken(tokens, 'fragmentation')) {
    modifiedDamage += 6;
    consumedTokens.push('fragmentation');
    effects.push('파쇄탄: +6 피해');
  }

  // 출혈 자해
  const bleedStacks = getTokenStacks(tokens, 'bleed');
  if (bleedStacks > 0) {
    effects.push(`출혈: ${bleedStacks * 2} 자해`);
  }

  return {
    modifiedValue: modifiedDamage,
    consumedTokens,
    appliedEffects: effects,
    appliedTokens,
    selfDamage: bleedStacks > 0 ? bleedStacks * 2 : undefined,
  };
}

/**
 * 방어 시 토큰 효과 처리
 */
export function processDefenseTokenEffects(
  state: GameBattleState,
  actor: 'player' | 'enemy',
  baseBlock: number
): TokenEffectResult {
  const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
  let modifiedBlock = baseBlock;
  const effects: string[] = [];
  const consumedTokens: string[] = [];

  // 수세 처리
  if (hasToken(tokens, 'guardPlus')) {
    modifiedBlock *= 2;
    consumedTokens.push('guardPlus');
    effects.push('수세+: 방어력 100% 증가');
  } else if (hasToken(tokens, 'guard')) {
    modifiedBlock = Math.floor(modifiedBlock * 1.5);
    consumedTokens.push('guard');
    effects.push('수세: 방어력 50% 증가');
  }

  // 힘 처리 (방어력에도 적용)
  const strength = getTokenStacks(tokens, 'strength');
  if (strength > 0) {
    modifiedBlock += strength;
    effects.push(`힘: +${strength} 방어력`);
  }

  // 흔들림 처리
  if (hasToken(tokens, 'shakenPlus')) {
    modifiedBlock = 0;
    consumedTokens.push('shakenPlus');
    effects.push('흔들림+: 방어력 획득 불가');
  } else if (hasToken(tokens, 'shaken')) {
    modifiedBlock = Math.floor(modifiedBlock * 0.5);
    consumedTokens.push('shaken');
    effects.push('흔들림: 방어력 50% 감소');
  }

  // 무방비 처리
  if (hasToken(tokens, 'exposedPlus')) {
    modifiedBlock = 0;
    effects.push('무방비+: 방어력 획득 불가');
  } else if (hasToken(tokens, 'exposed')) {
    modifiedBlock = Math.floor(modifiedBlock * 0.5);
    effects.push('무방비: 방어력 50% 감소');
  }

  return {
    modifiedValue: modifiedBlock,
    consumedTokens,
    appliedEffects: effects,
  };
}

/**
 * 피해를 받을 때 토큰 효과 처리
 */
export function processDamageTakenTokenEffects(
  state: GameBattleState,
  actor: 'player' | 'enemy',
  incomingDamage: number
): TokenEffectResult {
  const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
  let modifiedDamage = incomingDamage;
  const effects: string[] = [];
  const consumedTokens: string[] = [];
  const appliedTokens: { id: string; stacks: number; target: 'player' | 'enemy' }[] = [];
  let evaded = false;

  // 회피 처리 (evasion > blur)
  if (hasToken(tokens, 'evasion')) {
    modifiedDamage = 0;
    evaded = true;
    consumedTokens.push('evasion');
    effects.push('회피: 피해 무효!');
    return { modifiedValue: 0, evaded: true, consumedTokens, appliedEffects: effects };
  }

  if (hasToken(tokens, 'blur')) {
    if (Math.random() < 0.5) {
      modifiedDamage = 0;
      evaded = true;
      effects.push('흐릿함: 피해 회피!');
    } else {
      effects.push('흐릿함: 회피 실패');
    }
    consumedTokens.push('blur');
  }

  if (!evaded) {
    // 허약/아픔 처리
    if (hasToken(tokens, 'vulnerablePlus')) {
      modifiedDamage *= 2;
      consumedTokens.push('vulnerablePlus');
      effects.push('허약+: 받는 피해 100% 증가');
    } else if (hasToken(tokens, 'vulnerable')) {
      modifiedDamage = Math.floor(modifiedDamage * 1.5);
      consumedTokens.push('vulnerable');
      effects.push('허약: 받는 피해 50% 증가');
    }

    if (hasToken(tokens, 'painPlus')) {
      modifiedDamage *= 2;
      consumedTokens.push('painPlus');
      effects.push('아픔+: 받는 피해 100% 증가');
    } else if (hasToken(tokens, 'pain')) {
      modifiedDamage = Math.floor(modifiedDamage * 1.5);
      consumedTokens.push('pain');
      effects.push('아픔: 받는 피해 50% 증가');
    }

    // 반격 처리
    if (hasToken(tokens, 'counter')) {
      const strength = getTokenStacks(tokens, 'strength');
      const counterDamage = 5 + strength;
      consumedTokens.push('counter');
      effects.push(`반격: ${counterDamage} 피해`);
      appliedTokens.push({
        id: 'counter_damage',
        stacks: counterDamage,
        target: actor === 'player' ? 'enemy' : 'player',
      });
    }

    // 대응사격 처리
    if (hasToken(tokens, 'counterShot')) {
      consumedTokens.push('counterShot');
      effects.push('대응사격: 8 피해');
      appliedTokens.push({
        id: 'counterShot_damage',
        stacks: 8,
        target: actor === 'player' ? 'enemy' : 'player',
      });
      appliedTokens.push({
        id: 'roulette',
        stacks: 1,
        target: actor,
      });
    }

    // 가시 처리
    const thorns = getTokenStacks(tokens, 'thorns');
    if (thorns > 0) {
      effects.push(`가시: ${thorns} 반사 피해`);
      appliedTokens.push({
        id: 'thorns_damage',
        stacks: thorns,
        target: actor === 'player' ? 'enemy' : 'player',
      });
    }
  }

  return {
    modifiedValue: modifiedDamage,
    evaded,
    consumedTokens,
    appliedEffects: effects,
    appliedTokens,
  };
}

/**
 * 턴 시작 토큰 효과 처리
 */
export function processTurnStartTokenEffects(
  state: GameBattleState,
  actor: 'player' | 'enemy'
): TokenEffectResult {
  const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
  let totalDamage = 0;
  let totalHeal = 0;
  const effects: string[] = [];

  // 화상
  const burnStacks = getTokenStacks(tokens, 'burn');
  if (burnStacks > 0) {
    const burnDamage = burnStacks * 3;
    totalDamage += burnDamage;
    effects.push(`화상: ${burnDamage} 피해 (${burnStacks}스택)`);
  }

  // 재생
  const regenStacks = getTokenStacks(tokens, 'regeneration');
  if (regenStacks > 0) {
    totalHeal += regenStacks;
    effects.push(`재생: ${regenStacks} 회복`);
  }

  return {
    selfDamage: totalDamage > 0 ? totalDamage : undefined,
    heal: totalHeal > 0 ? totalHeal : undefined,
    appliedEffects: effects,
  };
}

/**
 * 턴 종료 토큰 효과 처리
 */
export function processTurnEndTokenEffects(
  state: GameBattleState,
  actor: 'player' | 'enemy'
): TokenEffectResult {
  const tokens = actor === 'player' ? state.player.tokens : state.enemy.tokens;
  let totalDamage = 0;
  const effects: string[] = [];
  const consumedTokens: string[] = [];

  // 독
  const poisonStacks = getTokenStacks(tokens, 'poison');
  if (poisonStacks > 0) {
    totalDamage += poisonStacks;
    consumedTokens.push('poison_1'); // 1스택 감소
    effects.push(`독: ${poisonStacks} 피해`);
  }

  return {
    selfDamage: totalDamage > 0 ? totalDamage : undefined,
    consumedTokens,
    appliedEffects: effects,
  };
}

/**
 * 소모된 토큰 실제 제거
 */
export function consumeTokens(
  tokens: TokenState,
  consumedList: string[]
): TokenState {
  let newTokens = { ...tokens };

  for (const tokenId of consumedList) {
    if (tokenId.endsWith('_1')) {
      // 특수 표기: 1스택만 제거
      const actualId = tokenId.replace('_1', '');
      newTokens = removeToken(newTokens, actualId, 1);
    } else {
      newTokens = removeToken(newTokens, tokenId, 1);
    }
  }

  return newTokens;
}

/**
 * 토큰 적용
 */
export function applyTokenEffects(
  state: GameBattleState,
  appliedTokens: { id: string; stacks: number; target: 'player' | 'enemy' }[]
): void {
  for (const { id, stacks, target } of appliedTokens) {
    // 특수 피해 토큰 처리
    if (id === 'counter_damage' || id === 'counterShot_damage' || id === 'thorns_damage') {
      if (target === 'enemy') {
        state.enemy.hp -= stacks;
      } else {
        state.player.hp -= stacks;
      }
      continue;
    }

    // 일반 토큰 추가
    if (target === 'player') {
      state.player.tokens = addToken(state.player.tokens, id, stacks);
    } else {
      state.enemy.tokens = addToken(state.enemy.tokens, id, stacks);
    }
  }
}
