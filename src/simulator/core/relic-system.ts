/**
 * @file relic-system.ts
 * @description 상징(Relic) 시스템 - 패시브 효과, 트리거 기반 능력
 */

import type { SimPlayerState, SimEnemyState, BattleResult, TokenState } from './types';
import { getLogger } from './logger';

const log = getLogger('RelicSystem');

// ==================== 상징 타입 ====================

export type RelicTrigger =
  | 'battle_start'      // 전투 시작 시
  | 'turn_start'        // 턴 시작 시
  | 'turn_end'          // 턴 종료 시
  | 'on_play_card'      // 카드 사용 시
  | 'on_attack'         // 공격 시
  | 'on_defend'         // 방어 시
  | 'on_take_damage'    // 피해 받을 때
  | 'on_deal_damage'    // 피해 줄 때
  | 'on_heal'           // 회복 시
  | 'on_draw'           // 카드 드로우 시
  | 'on_discard'        // 카드 버릴 때
  | 'on_combo'          // 콤보 발동 시
  | 'on_kill'           // 적 처치 시
  | 'on_low_hp'         // HP 25% 이하 시
  | 'on_full_hp'        // HP 100% 시
  | 'on_ether_use'      // 에테르 사용 시
  | 'battle_end'        // 전투 종료 시
  | 'passive';          // 항상 활성화

export type RelicRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'cursed';

export interface RelicEffect {
  type: 'stat_modifier' | 'token_grant' | 'damage_modifier' | 'heal' | 'draw' | 'energy' | 'custom';
  target: 'self' | 'enemy' | 'both';
  value: number | ((context: RelicContext) => number);
  stat?: string;
  token?: string;
  condition?: (context: RelicContext) => boolean;
}

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  triggers: RelicTrigger[];
  effects: RelicEffect[];
  stackable: boolean;
  maxStacks?: number;
  charges?: number;
  cooldown?: number;
  onActivate?: (context: RelicContext) => RelicEffectResult;
}

export interface RelicContext {
  player: SimPlayerState;
  enemy: SimEnemyState;
  trigger: RelicTrigger;
  turn: number;
  cardPlayed?: string;
  damageAmount?: number;
  healAmount?: number;
  comboName?: string;
  relicState: RelicState;
}

export interface RelicState {
  charges: number;
  stacks: number;
  cooldownRemaining: number;
  activatedThisTurn: boolean;
  totalActivations: number;
  customData: Record<string, unknown>;
}

export interface RelicEffectResult {
  damageModifier?: number;
  healAmount?: number;
  blockAmount?: number;
  drawCards?: number;
  energyGain?: number;
  tokensGrant?: TokenState;
  tokensRemove?: string[];
  statModifiers?: { stat: string; value: number }[];
  message?: string;
  preventDamage?: boolean;
  reflectDamage?: number;
}

// ==================== 상징 데이터 ====================

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  // Common
  burning_blood: {
    id: 'burning_blood',
    name: '불타는 피',
    description: '전투 종료 시 6 HP 회복',
    rarity: 'common',
    triggers: ['battle_end'],
    effects: [{ type: 'heal', target: 'self', value: 6 }],
    stackable: false,
  },
  bronze_scales: {
    id: 'bronze_scales',
    name: '청동 비늘',
    description: '피해를 받을 때마다 3 피해를 반사',
    rarity: 'common',
    triggers: ['on_take_damage'],
    effects: [{ type: 'damage_modifier', target: 'enemy', value: 3 }],
    stackable: false,
    onActivate: (ctx) => ({ reflectDamage: 3, message: '청동 비늘 반사!' }),
  },
  bag_of_preparation: {
    id: 'bag_of_preparation',
    name: '준비의 가방',
    description: '전투 시작 시 카드 2장 추가 드로우',
    rarity: 'common',
    triggers: ['battle_start'],
    effects: [{ type: 'draw', target: 'self', value: 2 }],
    stackable: false,
  },

  // Uncommon
  ornamental_fan: {
    id: 'ornamental_fan',
    name: '장식 부채',
    description: '턴에 카드 3장 이상 사용 시 8 방어 획득',
    rarity: 'uncommon',
    triggers: ['turn_end'],
    effects: [{
      type: 'stat_modifier',
      target: 'self',
      stat: 'block',
      value: 8,
      condition: (ctx) => (ctx.relicState.customData.cardsPlayedThisTurn as number || 0) >= 3,
    }],
    stackable: false,
  },
  kunai: {
    id: 'kunai',
    name: '쿠나이',
    description: '턴에 공격 카드 3장 사용 시 민첩 1 획득',
    rarity: 'uncommon',
    triggers: ['turn_end'],
    effects: [{
      type: 'token_grant',
      target: 'self',
      token: 'dexterity',
      value: 1,
      condition: (ctx) => (ctx.relicState.customData.attacksThisTurn as number || 0) >= 3,
    }],
    stackable: false,
  },
  letter_opener: {
    id: 'letter_opener',
    name: '편지 오프너',
    description: '턴에 기술 카드 3장 사용 시 5 피해',
    rarity: 'uncommon',
    triggers: ['turn_end'],
    effects: [{
      type: 'damage_modifier',
      target: 'enemy',
      value: 5,
      condition: (ctx) => (ctx.relicState.customData.skillsThisTurn as number || 0) >= 3,
    }],
    stackable: false,
  },

  // Rare
  tungsten_rod: {
    id: 'tungsten_rod',
    name: '텅스텐 막대',
    description: 'HP 손실 1 감소 (최소 1)',
    rarity: 'rare',
    triggers: ['on_take_damage'],
    effects: [{ type: 'damage_modifier', target: 'self', value: -1 }],
    stackable: false,
  },
  runic_pyramid: {
    id: 'runic_pyramid',
    name: '룬 피라미드',
    description: '턴 종료 시 손패를 버리지 않음',
    rarity: 'rare',
    triggers: ['passive'],
    effects: [],
    stackable: false,
  },
  dead_branch: {
    id: 'dead_branch',
    name: '마른 가지',
    description: '카드를 소멸시킬 때마다 랜덤 카드 1장 추가',
    rarity: 'rare',
    triggers: ['on_discard'],
    effects: [{ type: 'draw', target: 'self', value: 1 }],
    stackable: false,
  },

  // Legendary
  snecko_eye: {
    id: 'snecko_eye',
    name: '스네코 눈',
    description: '턴 시작 시 카드 2장 추가 드로우. 드로우한 카드 비용 0-3 랜덤',
    rarity: 'legendary',
    triggers: ['turn_start'],
    effects: [{ type: 'draw', target: 'self', value: 2 }],
    stackable: false,
  },
  astrolabe: {
    id: 'astrolabe',
    name: '아스트롤라베',
    description: '전투 시작 시 덱의 카드 3장을 무작위 카드로 변환',
    rarity: 'legendary',
    triggers: ['battle_start'],
    effects: [{ type: 'custom', target: 'self', value: 3 }],
    stackable: false,
  },
  mark_of_pain: {
    id: 'mark_of_pain',
    name: '고통의 문양',
    description: '에너지 +1. 전투 시작 시 상처 2장 획득',
    rarity: 'legendary',
    triggers: ['battle_start', 'passive'],
    effects: [
      { type: 'energy', target: 'self', value: 1 },
    ],
    stackable: false,
  },

  // Cursed
  cursed_key: {
    id: 'cursed_key',
    name: '저주받은 열쇠',
    description: '에너지 +1. 상자를 열 때 저주 획득',
    rarity: 'cursed',
    triggers: ['passive'],
    effects: [{ type: 'energy', target: 'self', value: 1 }],
    stackable: false,
  },
  philosophers_stone: {
    id: 'philosophers_stone',
    name: '현자의 돌',
    description: '에너지 +1. 모든 적이 힘 1 획득',
    rarity: 'cursed',
    triggers: ['battle_start', 'passive'],
    effects: [
      { type: 'energy', target: 'self', value: 1 },
      { type: 'token_grant', target: 'enemy', token: 'strength', value: 1 },
    ],
    stackable: false,
  },
};

// ==================== 상징 시스템 클래스 ====================

export class RelicSystem {
  private relicStates: Map<string, RelicState> = new Map();
  private definitions: Record<string, RelicDefinition>;

  constructor(customDefinitions?: Record<string, RelicDefinition>) {
    this.definitions = { ...RELIC_DEFINITIONS, ...customDefinitions };
  }

  /**
   * 상징 초기화
   */
  initializeRelics(relicIds: string[]): void {
    this.relicStates.clear();

    for (const id of relicIds) {
      const def = this.definitions[id];
      if (!def) {
        log.warn(`Unknown relic: ${id}`);
        continue;
      }

      this.relicStates.set(id, {
        charges: def.charges ?? -1,
        stacks: 1,
        cooldownRemaining: 0,
        activatedThisTurn: false,
        totalActivations: 0,
        customData: {},
      });
    }
  }

  /**
   * 트리거 처리
   */
  processTrigger(
    trigger: RelicTrigger,
    player: SimPlayerState,
    enemy: SimEnemyState,
    turn: number,
    additionalContext?: Partial<RelicContext>
  ): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];

    for (const relicId of player.relics) {
      const def = this.definitions[relicId];
      const state = this.relicStates.get(relicId);

      if (!def || !state) continue;
      if (!def.triggers.includes(trigger)) continue;

      // 쿨다운 체크
      if (state.cooldownRemaining > 0) continue;

      // 충전 체크
      if (state.charges === 0) continue;

      const context: RelicContext = {
        player,
        enemy,
        trigger,
        turn,
        relicState: state,
        ...additionalContext,
      };

      // 조건 체크 및 효과 적용
      const result = this.applyRelicEffects(def, context);

      if (result) {
        results.push(result);
        state.totalActivations++;

        // 충전 소모
        if (state.charges > 0) {
          state.charges--;
        }

        // 쿨다운 시작
        if (def.cooldown) {
          state.cooldownRemaining = def.cooldown;
        }

        log.debug(`Relic activated: ${def.name}`, { trigger, result });
      }
    }

    return results;
  }

  /**
   * 효과 적용
   */
  private applyRelicEffects(def: RelicDefinition, context: RelicContext): RelicEffectResult | null {
    // 커스텀 활성화 함수 있으면 사용
    if (def.onActivate) {
      return def.onActivate(context);
    }

    const result: RelicEffectResult = {};
    let anyEffectApplied = false;

    for (const effect of def.effects) {
      // 조건 체크
      if (effect.condition && !effect.condition(context)) {
        continue;
      }

      const value = typeof effect.value === 'function' ? effect.value(context) : effect.value;

      switch (effect.type) {
        case 'stat_modifier':
          if (effect.stat === 'block') {
            result.blockAmount = (result.blockAmount || 0) + value;
          } else {
            result.statModifiers = result.statModifiers || [];
            result.statModifiers.push({ stat: effect.stat!, value });
          }
          anyEffectApplied = true;
          break;

        case 'token_grant':
          result.tokensGrant = result.tokensGrant || {};
          result.tokensGrant[effect.token!] = (result.tokensGrant[effect.token!] || 0) + value;
          anyEffectApplied = true;
          break;

        case 'damage_modifier':
          if (effect.target === 'self') {
            result.preventDamage = value < 0;
            result.damageModifier = (result.damageModifier || 0) + value;
          } else {
            result.damageModifier = (result.damageModifier || 0) + value;
          }
          anyEffectApplied = true;
          break;

        case 'heal':
          result.healAmount = (result.healAmount || 0) + value;
          anyEffectApplied = true;
          break;

        case 'draw':
          result.drawCards = (result.drawCards || 0) + value;
          anyEffectApplied = true;
          break;

        case 'energy':
          result.energyGain = (result.energyGain || 0) + value;
          anyEffectApplied = true;
          break;
      }
    }

    return anyEffectApplied ? result : null;
  }

  /**
   * 턴 시작 처리
   */
  onTurnStart(): void {
    for (const state of this.relicStates.values()) {
      state.activatedThisTurn = false;
      state.customData.cardsPlayedThisTurn = 0;
      state.customData.attacksThisTurn = 0;
      state.customData.skillsThisTurn = 0;

      if (state.cooldownRemaining > 0) {
        state.cooldownRemaining--;
      }
    }
  }

  /**
   * 카드 플레이 추적
   */
  trackCardPlay(cardType: 'attack' | 'defense' | 'skill'): void {
    for (const state of this.relicStates.values()) {
      state.customData.cardsPlayedThisTurn = (state.customData.cardsPlayedThisTurn as number || 0) + 1;

      if (cardType === 'attack') {
        state.customData.attacksThisTurn = (state.customData.attacksThisTurn as number || 0) + 1;
      } else if (cardType === 'skill') {
        state.customData.skillsThisTurn = (state.customData.skillsThisTurn as number || 0) + 1;
      }
    }
  }

  /**
   * 패시브 효과 가져오기
   */
  getPassiveEffects(relicIds: string[]): RelicEffectResult {
    const combined: RelicEffectResult = {
      energyGain: 0,
      statModifiers: [],
    };

    for (const id of relicIds) {
      const def = this.definitions[id];
      if (!def || !def.triggers.includes('passive')) continue;

      for (const effect of def.effects) {
        const value = typeof effect.value === 'function' ? 0 : effect.value;

        if (effect.type === 'energy') {
          combined.energyGain! += value;
        }
      }
    }

    return combined;
  }

  /**
   * 상징 정보 가져오기
   */
  getRelicInfo(relicId: string): RelicDefinition | undefined {
    return this.definitions[relicId];
  }

  /**
   * 상징 상태 가져오기
   */
  getRelicState(relicId: string): RelicState | undefined {
    return this.relicStates.get(relicId);
  }

  /**
   * 모든 상징 목록
   */
  getAllRelics(): RelicDefinition[] {
    return Object.values(this.definitions);
  }

  /**
   * 희귀도별 상징
   */
  getRelicsByRarity(rarity: RelicRarity): RelicDefinition[] {
    return Object.values(this.definitions).filter(r => r.rarity === rarity);
  }
}

// ==================== 유틸리티 ====================

export function formatRelicEffect(result: RelicEffectResult): string {
  const parts: string[] = [];

  if (result.healAmount) parts.push(`+${result.healAmount} HP`);
  if (result.blockAmount) parts.push(`+${result.blockAmount} 방어`);
  if (result.drawCards) parts.push(`+${result.drawCards} 드로우`);
  if (result.energyGain) parts.push(`+${result.energyGain} 에너지`);
  if (result.damageModifier) parts.push(`피해 ${result.damageModifier > 0 ? '+' : ''}${result.damageModifier}`);
  if (result.reflectDamage) parts.push(`${result.reflectDamage} 반사`);

  if (result.tokensGrant) {
    for (const [token, amount] of Object.entries(result.tokensGrant)) {
      parts.push(`+${amount} ${token}`);
    }
  }

  return parts.join(', ') || '효과 없음';
}

// 싱글톤 인스턴스
let relicSystemInstance: RelicSystem | null = null;

export function getRelicSystem(): RelicSystem {
  if (!relicSystemInstance) {
    relicSystemInstance = new RelicSystem();
  }
  return relicSystemInstance;
}
