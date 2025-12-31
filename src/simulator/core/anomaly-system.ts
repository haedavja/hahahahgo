/**
 * @file anomaly-system.ts
 * @description 이변(Anomaly) 시스템 - 전투 규칙 변형, 환경 효과
 */

import type { SimPlayerState, SimEnemyState, GameState, TokenState } from './types';
import { getLogger } from './logger';

const log = getLogger('AnomalySystem');

// ==================== 이변 타입 ====================

export type AnomalyCategory =
  | 'combat'      // 전투 규칙 변경
  | 'resource'    // 자원(에너지, HP) 변경
  | 'card'        // 카드 효과 변경
  | 'enemy'       // 적 강화/약화
  | 'environment' // 환경 효과
  | 'chaos';      // 혼돈 (랜덤 효과)

export type AnomalyPhase = 'always' | 'player_turn' | 'enemy_turn' | 'turn_start' | 'turn_end';

export interface AnomalyModifier {
  type: 'multiply' | 'add' | 'set' | 'replace';
  stat: string;
  value: number | ((current: number) => number);
  target: 'player' | 'enemy' | 'both' | 'cards';
}

export interface AnomalyRule {
  id: string;
  description: string;
  condition?: (state: GameState) => boolean;
  effect: (state: GameState) => AnomalyEffect;
}

export interface AnomalyEffect {
  modifyDamage?: (damage: number, source: 'player' | 'enemy') => number;
  modifyBlock?: (block: number, source: 'player' | 'enemy') => number;
  modifyEnergy?: (energy: number) => number;
  modifyCardCost?: (cost: number, cardId: string) => number;
  modifyDrawCount?: (count: number) => number;
  grantTokens?: { target: 'player' | 'enemy'; tokens: TokenState };
  additionalAction?: (state: GameState) => void;
  message?: string;
}

export interface AnomalyDefinition {
  id: string;
  name: string;
  description: string;
  category: AnomalyCategory;
  activePhases: AnomalyPhase[];
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  modifiers: AnomalyModifier[];
  rules: AnomalyRule[];
  duration?: number;  // -1 = 영구
  stackable: boolean;
  incompatible?: string[];  // 호환 불가 이변
}

export interface ActiveAnomaly {
  definition: AnomalyDefinition;
  turnsRemaining: number;
  stacks: number;
  customData: Record<string, unknown>;
}

// ==================== 이변 데이터 ====================

export const ANOMALY_DEFINITIONS: Record<string, AnomalyDefinition> = {
  // Combat Anomalies
  time_dilation: {
    id: 'time_dilation',
    name: '시간 왜곡',
    description: '모든 타임라인 효과가 50% 느리게 발동',
    category: 'combat',
    activePhases: ['always'],
    difficulty: 'normal',
    modifiers: [],
    rules: [{
      id: 'slow_timeline',
      description: '타임라인 지연',
      effect: () => ({
        message: '시간이 느리게 흐릅니다...',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  mirror_dimension: {
    id: 'mirror_dimension',
    name: '거울 차원',
    description: '모든 피해가 공격자에게도 50% 반사됨',
    category: 'combat',
    activePhases: ['always'],
    difficulty: 'hard',
    modifiers: [],
    rules: [{
      id: 'reflect_damage',
      description: '피해 반사',
      effect: (state) => ({
        modifyDamage: (damage, source) => {
          const reflected = Math.floor(damage * 0.5);
          log.debug(`Mirror dimension reflects ${reflected} damage back to ${source}`);
          return damage;
        },
        message: '거울 차원의 반사!',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  blood_moon: {
    id: 'blood_moon',
    name: '핏빛 달',
    description: '모든 피해 +25%, 모든 회복 -50%',
    category: 'combat',
    activePhases: ['always'],
    difficulty: 'hard',
    modifiers: [
      { type: 'multiply', stat: 'damage', value: 1.25, target: 'both' },
      { type: 'multiply', stat: 'heal', value: 0.5, target: 'both' },
    ],
    rules: [],
    duration: -1,
    stackable: false,
  },

  // Resource Anomalies
  energy_flux: {
    id: 'energy_flux',
    name: '에너지 변동',
    description: '매 턴 에너지가 1-5 사이로 랜덤하게 변함',
    category: 'resource',
    activePhases: ['turn_start'],
    difficulty: 'hard',
    modifiers: [],
    rules: [{
      id: 'random_energy',
      description: '랜덤 에너지',
      effect: () => ({
        modifyEnergy: () => 1 + Math.floor(Math.random() * 5),
        message: '에너지가 불안정합니다!',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  resource_scarcity: {
    id: 'resource_scarcity',
    name: '자원 부족',
    description: '최대 에너지 -1, 턴당 드로우 -1',
    category: 'resource',
    activePhases: ['always'],
    difficulty: 'hard',
    modifiers: [
      { type: 'add', stat: 'maxEnergy', value: -1, target: 'player' },
    ],
    rules: [{
      id: 'reduced_draw',
      description: '드로우 감소',
      effect: () => ({
        modifyDrawCount: (count) => Math.max(1, count - 1),
      }),
    }],
    duration: -1,
    stackable: false,
  },

  abundance: {
    id: 'abundance',
    name: '풍요',
    description: '에너지 +1, 드로우 +1 (적도 강화됨)',
    category: 'resource',
    activePhases: ['always'],
    difficulty: 'normal',
    modifiers: [
      { type: 'add', stat: 'maxEnergy', value: 1, target: 'both' },
    ],
    rules: [{
      id: 'extra_draw',
      description: '드로우 증가',
      effect: () => ({
        modifyDrawCount: (count) => count + 1,
      }),
    }],
    duration: -1,
    stackable: false,
  },

  // Card Anomalies
  card_chaos: {
    id: 'card_chaos',
    name: '카드 혼돈',
    description: '모든 카드 비용이 0-3 사이로 랜덤',
    category: 'card',
    activePhases: ['always'],
    difficulty: 'chaos',
    modifiers: [],
    rules: [{
      id: 'random_cost',
      description: '랜덤 비용',
      effect: () => ({
        modifyCardCost: () => Math.floor(Math.random() * 4),
        message: '카드 비용이 변동합니다!',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  heavy_burden: {
    id: 'heavy_burden',
    name: '무거운 짐',
    description: '모든 카드 비용 +1',
    category: 'card',
    activePhases: ['always'],
    difficulty: 'hard',
    modifiers: [],
    rules: [{
      id: 'increased_cost',
      description: '비용 증가',
      effect: () => ({
        modifyCardCost: (cost) => cost + 1,
      }),
    }],
    duration: -1,
    stackable: true,
  },

  swift_combat: {
    id: 'swift_combat',
    name: '신속 전투',
    description: '공격 카드 비용 -1 (최소 0)',
    category: 'card',
    activePhases: ['always'],
    difficulty: 'easy',
    modifiers: [],
    rules: [{
      id: 'cheap_attacks',
      description: '공격 비용 감소',
      // 카드 타입 체크는 외부에서 처리
      effect: () => ({
        modifyCardCost: (cost) => Math.max(0, cost - 1),
      }),
    }],
    duration: -1,
    stackable: false,
  },

  // Enemy Anomalies
  elite_surge: {
    id: 'elite_surge',
    name: '엘리트 쇄도',
    description: '모든 적 HP +50%, 피해 +25%',
    category: 'enemy',
    activePhases: ['always'],
    difficulty: 'nightmare',
    modifiers: [
      { type: 'multiply', stat: 'hp', value: 1.5, target: 'enemy' },
      { type: 'multiply', stat: 'damage', value: 1.25, target: 'enemy' },
    ],
    rules: [],
    duration: -1,
    stackable: false,
  },

  weakness_aura: {
    id: 'weakness_aura',
    name: '약화 오라',
    description: '적이 매 턴 시작 시 약화 1 획득',
    category: 'enemy',
    activePhases: ['turn_start'],
    difficulty: 'easy',
    modifiers: [],
    rules: [{
      id: 'enemy_weakness',
      description: '적 약화',
      effect: () => ({
        grantTokens: { target: 'enemy', tokens: { weakness: 1 } },
        message: '약화 오라가 적을 감싸고 있습니다',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  // Environment Anomalies
  toxic_mist: {
    id: 'toxic_mist',
    name: '독 안개',
    description: '매 턴 종료 시 모두 3 피해',
    category: 'environment',
    activePhases: ['turn_end'],
    difficulty: 'normal',
    modifiers: [],
    rules: [{
      id: 'poison_tick',
      description: '독 피해',
      effect: () => ({
        additionalAction: (state) => {
          state.player.hp -= 3;
          state.enemy.hp -= 3;
        },
        message: '독 안개가 모두를 해칩니다!',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  regeneration_field: {
    id: 'regeneration_field',
    name: '재생 필드',
    description: '매 턴 시작 시 모두 5 HP 회복',
    category: 'environment',
    activePhases: ['turn_start'],
    difficulty: 'easy',
    modifiers: [],
    rules: [{
      id: 'regen_tick',
      description: '재생',
      effect: (state) => ({
        additionalAction: (s) => {
          s.player.hp = Math.min(s.player.maxHp, s.player.hp + 5);
          s.enemy.hp = Math.min(s.enemy.maxHp, s.enemy.hp + 5);
        },
        message: '재생 필드가 생명력을 회복시킵니다',
      }),
    }],
    duration: -1,
    stackable: false,
  },

  // Chaos Anomalies
  rift_instability: {
    id: 'rift_instability',
    name: '균열 불안정',
    description: '매 턴 무작위 이변 효과 발동',
    category: 'chaos',
    activePhases: ['turn_start'],
    difficulty: 'nightmare',
    modifiers: [],
    rules: [{
      id: 'random_effect',
      description: '랜덤 효과',
      effect: () => {
        const effects = [
          '에너지 +2',
          '에너지 -1',
          '모두 10 피해',
          '모두 10 회복',
          '카드 2장 드로우',
          '손패 1장 버리기',
        ];
        const chosen = effects[Math.floor(Math.random() * effects.length)];
        return { message: `균열 효과: ${chosen}` };
      },
    }],
    duration: -1,
    stackable: false,
  },
};

// ==================== 이변 시스템 클래스 ====================

export class AnomalySystem {
  private activeAnomalies: Map<string, ActiveAnomaly> = new Map();
  private definitions: Record<string, AnomalyDefinition>;

  constructor(customDefinitions?: Record<string, AnomalyDefinition>) {
    this.definitions = { ...ANOMALY_DEFINITIONS, ...customDefinitions };
  }

  /**
   * 이변 활성화
   */
  activateAnomaly(anomalyId: string): boolean {
    const def = this.definitions[anomalyId];
    if (!def) {
      log.warn(`Unknown anomaly: ${anomalyId}`);
      return false;
    }

    // 호환성 체크
    if (def.incompatible) {
      for (const incompatId of def.incompatible) {
        if (this.activeAnomalies.has(incompatId)) {
          log.warn(`Anomaly ${anomalyId} is incompatible with ${incompatId}`);
          return false;
        }
      }
    }

    // 스택 체크
    const existing = this.activeAnomalies.get(anomalyId);
    if (existing && !def.stackable) {
      log.debug(`Anomaly ${anomalyId} is already active and not stackable`);
      return false;
    }

    if (existing && def.stackable) {
      existing.stacks++;
      log.info(`Anomaly ${def.name} stacked to ${existing.stacks}`);
      return true;
    }

    this.activeAnomalies.set(anomalyId, {
      definition: def,
      turnsRemaining: def.duration ?? -1,
      stacks: 1,
      customData: {},
    });

    log.info(`Anomaly activated: ${def.name}`);
    return true;
  }

  /**
   * 이변 비활성화
   */
  deactivateAnomaly(anomalyId: string): boolean {
    const removed = this.activeAnomalies.delete(anomalyId);
    if (removed) {
      log.info(`Anomaly deactivated: ${anomalyId}`);
    }
    return removed;
  }

  /**
   * 페이즈 처리
   */
  processPhase(phase: AnomalyPhase, state: GameState): AnomalyEffect[] {
    const effects: AnomalyEffect[] = [];

    for (const [id, active] of this.activeAnomalies) {
      const def = active.definition;

      if (!def.activePhases.includes(phase) && !def.activePhases.includes('always')) {
        continue;
      }

      // 규칙 적용
      for (const rule of def.rules) {
        if (rule.condition && !rule.condition(state)) continue;

        const effect = rule.effect(state);
        effects.push(effect);

        // 추가 액션 실행
        if (effect.additionalAction) {
          effect.additionalAction(state);
        }

        log.debug(`Anomaly rule applied: ${def.name} - ${rule.id}`);
      }
    }

    return effects;
  }

  /**
   * 턴 종료 처리 (지속 시간 감소)
   */
  onTurnEnd(): string[] {
    const expired: string[] = [];

    for (const [id, active] of this.activeAnomalies) {
      if (active.turnsRemaining > 0) {
        active.turnsRemaining--;

        if (active.turnsRemaining === 0) {
          expired.push(id);
        }
      }
    }

    for (const id of expired) {
      this.activeAnomalies.delete(id);
      log.info(`Anomaly expired: ${id}`);
    }

    return expired;
  }

  /**
   * 피해 수정
   */
  modifyDamage(damage: number, source: 'player' | 'enemy', state: GameState): number {
    let modified = damage;

    for (const active of this.activeAnomalies.values()) {
      const def = active.definition;

      // 모디파이어 적용
      for (const mod of def.modifiers) {
        if (mod.stat !== 'damage') continue;
        if (mod.target !== 'both' && mod.target !== source) continue;

        const value = typeof mod.value === 'function' ? mod.value(modified) : mod.value;

        switch (mod.type) {
          case 'multiply':
            modified = Math.floor(modified * value * active.stacks);
            break;
          case 'add':
            modified += value * active.stacks;
            break;
          case 'set':
            modified = value;
            break;
        }
      }

      // 규칙 적용
      for (const rule of def.rules) {
        const effect = rule.effect(state);
        if (effect.modifyDamage) {
          modified = effect.modifyDamage(modified, source);
        }
      }
    }

    return Math.max(0, Math.floor(modified));
  }

  /**
   * 카드 비용 수정
   */
  modifyCardCost(cost: number, cardId: string, state: GameState): number {
    let modified = cost;

    for (const active of this.activeAnomalies.values()) {
      for (const rule of active.definition.rules) {
        const effect = rule.effect(state);
        if (effect.modifyCardCost) {
          modified = effect.modifyCardCost(modified, cardId);
        }
      }
    }

    return Math.max(0, modified);
  }

  /**
   * 에너지 수정
   */
  modifyEnergy(energy: number, state: GameState): number {
    let modified = energy;

    for (const active of this.activeAnomalies.values()) {
      // 모디파이어 적용
      for (const mod of active.definition.modifiers) {
        if (mod.stat !== 'maxEnergy' || mod.target !== 'player') continue;

        const value = typeof mod.value === 'function' ? mod.value(modified) : mod.value;

        switch (mod.type) {
          case 'add':
            modified += value * active.stacks;
            break;
          case 'multiply':
            modified = Math.floor(modified * value);
            break;
        }
      }

      // 규칙 적용
      for (const rule of active.definition.rules) {
        const effect = rule.effect(state);
        if (effect.modifyEnergy) {
          modified = effect.modifyEnergy(modified);
        }
      }
    }

    return Math.max(0, modified);
  }

  /**
   * 드로우 수정
   */
  modifyDrawCount(count: number, state: GameState): number {
    let modified = count;

    for (const active of this.activeAnomalies.values()) {
      for (const rule of active.definition.rules) {
        const effect = rule.effect(state);
        if (effect.modifyDrawCount) {
          modified = effect.modifyDrawCount(modified);
        }
      }
    }

    return Math.max(1, modified);
  }

  /**
   * 블록 수정
   */
  modifyBlock(block: number, state: GameState): number {
    let modified = block;

    for (const active of this.activeAnomalies.values()) {
      const def = active.definition;

      // 모디파이어 적용
      for (const mod of def.modifiers) {
        if (mod.stat !== 'block') continue;
        if (mod.target !== 'both' && mod.target !== 'player') continue;

        const value = typeof mod.value === 'function' ? mod.value(modified) : mod.value;

        switch (mod.type) {
          case 'multiply':
            modified = Math.floor(modified * value * active.stacks);
            break;
          case 'add':
            modified += value * active.stacks;
            break;
          case 'set':
            modified = value;
            break;
        }
      }

      // 규칙 적용
      for (const rule of def.rules) {
        const effect = rule.effect(state);
        if (effect.modifyBlock) {
          modified = effect.modifyBlock(modified, 'player');
        }
      }
    }

    return Math.max(0, Math.floor(modified));
  }

  /**
   * 턴 종료 처리 (alias for onTurnEnd)
   */
  processTurnEnd(): string[] {
    return this.onTurnEnd();
  }

  /**
   * 적 수정
   */
  modifyEnemyStats(enemy: SimEnemyState): SimEnemyState {
    const modified = { ...enemy };

    for (const active of this.activeAnomalies.values()) {
      for (const mod of active.definition.modifiers) {
        if (mod.target !== 'enemy' && mod.target !== 'both') continue;

        const value = typeof mod.value === 'function' ? mod.value(0) : mod.value;

        switch (mod.stat) {
          case 'hp':
            if (mod.type === 'multiply') {
              modified.hp = Math.floor(modified.hp * value);
              modified.maxHp = Math.floor(modified.maxHp * value);
            } else if (mod.type === 'add') {
              modified.hp += value;
              modified.maxHp += value;
            }
            break;
        }
      }
    }

    return modified;
  }

  /**
   * 활성 이변 목록
   */
  getActiveAnomalies(): ActiveAnomaly[] {
    return Array.from(this.activeAnomalies.values());
  }

  /**
   * 특정 이변 활성 여부
   */
  isActive(anomalyId: string): boolean {
    return this.activeAnomalies.has(anomalyId);
  }

  /**
   * 모든 이변 초기화
   */
  clear(): void {
    this.activeAnomalies.clear();
  }

  /**
   * 이변 정보 가져오기
   */
  getAnomalyInfo(anomalyId: string): AnomalyDefinition | undefined {
    return this.definitions[anomalyId];
  }

  /**
   * 카테고리별 이변
   */
  getAnomaliesByCategory(category: AnomalyCategory): AnomalyDefinition[] {
    return Object.values(this.definitions).filter(a => a.category === category);
  }

  /**
   * 난이도별 이변
   */
  getAnomaliesByDifficulty(difficulty: AnomalyDefinition['difficulty']): AnomalyDefinition[] {
    return Object.values(this.definitions).filter(a => a.difficulty === difficulty);
  }

  /**
   * 랜덤 이변 선택
   */
  getRandomAnomaly(options?: {
    category?: AnomalyCategory;
    maxDifficulty?: AnomalyDefinition['difficulty'];
  }): AnomalyDefinition | null {
    let candidates = Object.values(this.definitions);

    if (options?.category) {
      candidates = candidates.filter(a => a.category === options.category);
    }

    if (options?.maxDifficulty) {
      const difficultyOrder = ['easy', 'normal', 'hard', 'nightmare', 'chaos'];
      const maxIndex = difficultyOrder.indexOf(options.maxDifficulty);
      candidates = candidates.filter(a => difficultyOrder.indexOf(a.difficulty) <= maxIndex);
    }

    if (candidates.length === 0) return null;

    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}

// ==================== 유틸리티 ====================

export function formatAnomalyInfo(anomaly: AnomalyDefinition): string {
  const difficultyIcons: Record<string, string> = {
    easy: '🟢',
    normal: '🟡',
    hard: '🟠',
    nightmare: '🔴',
    chaos: '🟣',
  };

  return [
    `${difficultyIcons[anomaly.difficulty]} ${anomaly.name}`,
    `   ${anomaly.description}`,
    `   카테고리: ${anomaly.category}`,
  ].join('\n');
}

// 싱글톤 인스턴스
let anomalySystemInstance: AnomalySystem | null = null;

export function getAnomalySystem(): AnomalySystem {
  if (!anomalySystemInstance) {
    anomalySystemInstance = new AnomalySystem();
  }
  return anomalySystemInstance;
}
