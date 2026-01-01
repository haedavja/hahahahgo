/**
 * @file relic-system-v2.ts
 * @description 완전한 상징 시스템 - 45개 상징 전체 지원
 *
 * 상징 효과 타입:
 * - PASSIVE: 항상 적용
 * - ON_COMBAT_START: 전투 시작 시
 * - ON_COMBAT_END: 전투 종료 시
 * - ON_TURN_START: 턴 시작 시
 * - ON_TURN_END: 턴 종료 시
 * - ON_CARD_PLAYED: 카드 사용 시
 * - ON_DAMAGE_TAKEN: 피해 받을 때
 */

import type { GameRelic, RelicEffects, PlayerState, EnemyState } from './game-types';
import { syncAllRelics } from '../data/game-data-sync';
import { getLogger } from './logger';
import { addToken } from './token-system';

const log = getLogger('RelicSystem');

// ==================== 상징 정의 캐시 ====================

let relicCache: Record<string, GameRelic> | null = null;

function getRelicDefinitions(): Record<string, GameRelic> {
  if (!relicCache) {
    relicCache = syncAllRelics();
  }
  return relicCache;
}

// ==================== 상징 효과 결과 ====================

export interface RelicEffectResult {
  relicId: string;
  relicName: string;
  effects: {
    heal?: number;
    damage?: number;
    block?: number;
    strength?: number;
    agility?: number;
    energy?: number;
    maxEnergy?: number;
    maxHp?: number;
    draw?: number;
    etherBonus?: number;
    tokenToPlayer?: { id: string; stacks: number };
    tokenToEnemy?: { id: string; stacks: number };
    message?: string;
  };
}

// ==================== 상징 시스템 클래스 ====================

export class RelicSystemV2 {
  private activeRelics: Set<string> = new Set();
  private turnCardsPlayed: number = 0;
  private timesAttackedThisTurn: number = 0;
  private pendingEffects: { energyNextTurn?: number; blockNextTurn?: number; healNextTurn?: number } = {};

  constructor() {
    // 캐시 초기화
    getRelicDefinitions();
  }

  // ==================== 상징 초기화 ====================

  /**
   * 활성 상징 설정
   */
  initializeRelics(relicIds: string[]): void {
    this.activeRelics.clear();
    for (const id of relicIds) {
      const relic = getRelicDefinitions()[id];
      if (relic) {
        this.activeRelics.add(id);
        log.debug('상징 활성화', { id, name: relic.name });
      }
    }
  }

  /**
   * 턴 시작 시 초기화
   */
  resetTurnState(): void {
    this.turnCardsPlayed = 0;
    this.timesAttackedThisTurn = 0;
    this.attacksThisTurn = 0;
    this.skillsThisTurn = 0;
  }

  private attacksThisTurn: number = 0;
  private skillsThisTurn: number = 0;

  // ==================== 패시브 효과 ====================

  /**
   * 패시브 효과 계산
   */
  getPassiveEffects(): {
    maxEnergy: number;
    maxHp: number;
    strength: number;
    agility: number;
    maxSpeed: number;
    maxSubmitCards: number;
    subSpecialSlots: number;
    mainSpecialSlots: number;
    cardDrawBonus: number;
    etherMultiplier: number;
    comboMultiplierPerCard: number;
    negativeTraitMultiplier: number;
  } {
    const result = {
      maxEnergy: 0,
      maxHp: 0,
      strength: 0,
      agility: 0,
      maxSpeed: 0,
      maxSubmitCards: 0,
      subSpecialSlots: 0,
      mainSpecialSlots: 0,
      cardDrawBonus: 0,
      etherMultiplier: 1,
      comboMultiplierPerCard: 0,
      negativeTraitMultiplier: 0,
    };

    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'PASSIVE') continue;

      const effects = relic.effects;

      if (effects.maxEnergy) result.maxEnergy += effects.maxEnergy;
      if (effects.maxHp) result.maxHp += effects.maxHp;
      if (effects.strength) result.strength += effects.strength;
      if (effects.agility) result.agility += effects.agility;
      if (effects.maxSpeed) result.maxSpeed += effects.maxSpeed;
      if (effects.maxSubmitCards) result.maxSubmitCards += effects.maxSubmitCards;
      if (effects.subSpecialSlots) result.subSpecialSlots += effects.subSpecialSlots;
      if (effects.mainSpecialSlots) result.mainSpecialSlots += effects.mainSpecialSlots;
      if (effects.cardDrawBonus) result.cardDrawBonus += effects.cardDrawBonus;
      if (effects.etherMultiplier) result.etherMultiplier *= effects.etherMultiplier;
      if (effects.comboMultiplierPerCard) result.comboMultiplierPerCard += effects.comboMultiplierPerCard;
      if (effects.negativeTraitMultiplier) result.negativeTraitMultiplier += effects.negativeTraitMultiplier;
    }

    return result;
  }

  // ==================== 트리거 효과 ====================

  /**
   * 전투 시작 트리거
   */
  processCombatStart(player: PlayerState, enemy: EnemyState): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'ON_COMBAT_START') continue;

      const effects = relic.effects;
      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 피의 족쇄: 체력 5 잃고 힘 2 획득
      if (effects.damage) {
        result.effects.damage = effects.damage;
      }
      if (effects.strength) {
        result.effects.strength = effects.strength;
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
        log.info('전투 시작 상징 발동', { relic: relic.name, effects: result.effects });
      }
    }

    return results;
  }

  /**
   * 전투 종료 트리거
   */
  processCombatEnd(player: PlayerState, enemy: EnemyState): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'ON_COMBAT_END') continue;

      const effects = relic.effects;
      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 붉은약초, 황금약초: 전투 종료 시 회복
      if (effects.heal) {
        result.effects.heal = effects.heal;
      }

      // 건강검진표: 조건부 효과
      if (effects.condition) {
        const conditionState = {
          playerHp: player.hp,
          maxHp: player.maxHp,
        };

        if (effects.condition(conditionState)) {
          // 체력 최대치면 최대체력 증가
          if (effects.maxHpIfFull) {
            result.effects.maxHp = effects.maxHpIfFull;
          }
        } else {
          // 다쳤으면 회복
          if (effects.healIfDamaged) {
            result.effects.heal = effects.healIfDamaged;
          }
        }
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
        log.info('전투 종료 상징 발동', { relic: relic.name, effects: result.effects });
      }
    }

    return results;
  }

  /**
   * 턴 시작 트리거
   */
  processTurnStart(player: PlayerState, enemy: EnemyState, turn: number): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    // 이전 턴에서 예약된 효과 적용
    if (this.pendingEffects.energyNextTurn) {
      results.push({
        relicId: 'pending',
        relicName: '예약된 효과',
        effects: { energy: this.pendingEffects.energyNextTurn },
      });
    }
    if (this.pendingEffects.blockNextTurn) {
      results.push({
        relicId: 'pending',
        relicName: '예약된 효과',
        effects: { block: this.pendingEffects.blockNextTurn },
      });
    }
    if (this.pendingEffects.healNextTurn) {
      results.push({
        relicId: 'pending',
        relicName: '예약된 효과',
        effects: { heal: this.pendingEffects.healNextTurn },
      });
    }
    this.pendingEffects = {};

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'ON_TURN_START') continue;

      const effects = relic.effects;
      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 피피한 갑옷: 턴 시작 시 방어력 8
      if (effects.block) {
        result.effects.block = effects.block;
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
        log.debug('턴 시작 상징 발동', { relic: relic.name, effects: result.effects });
      }
    }

    this.resetTurnState();
    return results;
  }

  /**
   * 턴 종료 트리거
   */
  processTurnEnd(player: PlayerState, enemy: EnemyState, turn: number): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'ON_TURN_END') continue;

      const effects = relic.effects;
      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 은화: 턴 종료 시 힘 1
      if (effects.strength) {
        result.effects.strength = effects.strength;
      }

      // 계약서: 카드 4장 이상 내면 다음 턴 행동력 2
      if (effects.condition && effects.energyNextTurn) {
        const conditionState = {
          cardsPlayedThisTurn: this.turnCardsPlayed,
        };
        if (effects.condition(conditionState)) {
          this.pendingEffects.energyNextTurn = (this.pendingEffects.energyNextTurn || 0) + effects.energyNextTurn;
          result.effects.message = `다음 턴 행동력 +${effects.energyNextTurn}`;
        }
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
        log.debug('턴 종료 상징 발동', { relic: relic.name, effects: result.effects });
      }
    }

    return results;
  }

  /**
   * 카드 사용 트리거
   */
  processCardPlayed(player: PlayerState, enemy: EnemyState, cardId: string): RelicEffectResult[] {
    this.turnCardsPlayed++;
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'ON_CARD_PLAYED') continue;

      const effects = relic.effects;
      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 불멸의 가면: 카드 사용 시 체력 1 회복
      if (effects.heal) {
        result.effects.heal = effects.heal;
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
        log.debug('카드 사용 상징 발동', { relic: relic.name, cardId, effects: result.effects });
      }
    }

    return results;
  }

  /**
   * 피해 받을 때 트리거
   */
  processDamageTaken(player: PlayerState, enemy: EnemyState, damage: number): RelicEffectResult[] {
    this.timesAttackedThisTurn++;
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic || relic.effects.type !== 'ON_DAMAGE_TAKEN') continue;

      const effects = relic.effects;
      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 철의 심장: 피해 받으면 다음 턴 방어력과 체력 1
      if (effects.blockNextTurn) {
        this.pendingEffects.blockNextTurn = (this.pendingEffects.blockNextTurn || 0) + effects.blockNextTurn;
        result.effects.message = `다음 턴 방어력 +${effects.blockNextTurn}`;
      }
      if (effects.healNextTurn) {
        this.pendingEffects.healNextTurn = (this.pendingEffects.healNextTurn || 0) + effects.healNextTurn;
        result.effects.message = `다음 턴 회복 +${effects.healNextTurn}`;
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
        log.debug('피해 받음 상징 발동', { relic: relic.name, damage, effects: result.effects });
      }
    }

    return results;
  }

  // ==================== 추가 트리거 ====================

  /**
   * 공격 시 효과
   */
  processAttack(player: PlayerState, enemy: EnemyState, damage: number): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic) continue;

      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 쿠나이: 3회 공격마다 민첩성 +1
      if (relicId === 'kunai' && this.attacksThisTurn > 0 && this.attacksThisTurn % 3 === 0) {
        result.effects.tokenToPlayer = { id: 'agility', stacks: 1 };
        result.effects.message = '쿠나이: 민첩성 +1';
      }

      // 편지칼: 3회 스킬마다 4피해
      if (relicId === 'letter_opener' && this.skillsThisTurn > 0 && this.skillsThisTurn % 3 === 0) {
        result.effects.damage = 4;
        result.effects.message = '편지칼: 4 피해';
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 회복 시 효과
   */
  processHeal(player: PlayerState, healAmount: number): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic) continue;

      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 마고의 피: 회복량 50% 증가
      if (relicId === 'blood_of_mago') {
        const bonusHeal = Math.floor(healAmount * 0.5);
        result.effects.heal = bonusHeal;
        result.effects.message = `마고의 피: 추가 회복 +${bonusHeal}`;
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 콤보 발동 시 효과
   */
  processCombo(player: PlayerState, comboName: string, etherGained: number): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic) continue;

      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 에테르 결정: 콤보 시 에테르 보너스
      if (relicId === 'ether_crystal') {
        const bonus = Math.floor(etherGained * 0.2);
        result.effects.etherBonus = bonus;
        result.effects.message = `에테르 결정: 추가 에테르 +${bonus}`;
      }

      // 풀하우스 전용 보너스 상징이 있다면 여기에 추가
      if (relicId === 'poker_chip' && comboName === '풀하우스') {
        result.effects.etherBonus = 10;
        result.effects.message = '포커칩: 풀하우스 보너스 +10 에테르';
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 적 처치 시 효과
   */
  processKill(player: PlayerState, enemyId: string): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];
    const definitions = getRelicDefinitions();

    for (const relicId of this.activeRelics) {
      const relic = definitions[relicId];
      if (!relic) continue;

      const result: RelicEffectResult = {
        relicId,
        relicName: relic.name,
        effects: {},
      };

      // 해골: 처치 시 체력 5 회복
      if (relicId === 'skull' || relicId === 'gremlin_horn') {
        result.effects.heal = 5;
        result.effects.message = '적 처치: 체력 +5';
      }

      // 그렘린 뿔: 처치 시 에너지 +1
      if (relicId === 'gremlin_horn') {
        result.effects.energy = 1;
        result.effects.message = '그렘린 뿔: 에너지 +1';
      }

      if (Object.keys(result.effects).length > 0) {
        results.push(result);
      }
    }

    return results;
  }

  // ==================== 에테르 계산 ====================

  /**
   * 에테르 배율 계산
   */
  calculateEtherMultiplier(cardsPlayed: number, negativeTraits: number = 0): number {
    let multiplier = 1;
    const passives = this.getPassiveEffects();

    // 기본 에테르 배율
    multiplier *= passives.etherMultiplier;

    // 카드당 배율 (에테르 결정)
    if (passives.comboMultiplierPerCard > 0) {
      multiplier += cardsPlayed * passives.comboMultiplierPerCard;
    }

    // 부정 특성당 배율 (비웃는 가면)
    if (passives.negativeTraitMultiplier > 0 && negativeTraits > 0) {
      multiplier += negativeTraits * passives.negativeTraitMultiplier;
    }

    // 악마의 주사위: 5장 내면 5배
    const definitions = getRelicDefinitions();
    if (this.activeRelics.has('devilDice') && cardsPlayed >= 5) {
      const relic = definitions['devilDice'];
      if (relic && relic.effects.etherFiveCardBonus) {
        multiplier *= relic.effects.etherFiveCardBonus;
      }
    }

    return multiplier;
  }

  // ==================== 상징 효과 적용 ====================

  /**
   * 효과 결과를 플레이어 상태에 적용
   */
  applyEffects(player: PlayerState, results: RelicEffectResult[]): PlayerState {
    let newPlayer = { ...player };

    for (const result of results) {
      const effects = result.effects;

      if (effects.heal) {
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + effects.heal);
      }
      if (effects.damage) {
        newPlayer.hp = Math.max(0, newPlayer.hp - effects.damage);
      }
      if (effects.block) {
        newPlayer.block += effects.block;
      }
      if (effects.strength) {
        newPlayer.tokens = addToken(newPlayer.tokens, 'strength', effects.strength);
      }
      if (effects.agility) {
        newPlayer.tokens = addToken(newPlayer.tokens, 'agility', effects.agility);
      }
      if (effects.energy) {
        newPlayer.energy += effects.energy;
      }
      if (effects.maxEnergy) {
        newPlayer.maxEnergy += effects.maxEnergy;
      }
      if (effects.maxHp) {
        newPlayer.maxHp += effects.maxHp;
        newPlayer.hp += effects.maxHp;
      }
      if (effects.tokenToPlayer) {
        newPlayer.tokens = addToken(newPlayer.tokens, effects.tokenToPlayer.id, effects.tokenToPlayer.stacks);
      }
    }

    return newPlayer;
  }

  // ==================== 상징 정보 ====================

  /**
   * 활성화된 상징 목록
   */
  getActiveRelics(): GameRelic[] {
    const definitions = getRelicDefinitions();
    return Array.from(this.activeRelics)
      .map(id => definitions[id])
      .filter((r): r is GameRelic => r !== undefined);
  }

  /**
   * 상징 정보 조회
   */
  getRelicInfo(relicId: string): GameRelic | undefined {
    return getRelicDefinitions()[relicId];
  }

  /**
   * 상징 통계
   */
  getStats(): { total: number; byRarity: Record<string, number>; byEffectType: Record<string, number> } {
    const definitions = getRelicDefinitions();
    const byRarity: Record<string, number> = {};
    const byEffectType: Record<string, number> = {};

    for (const relic of Object.values(definitions)) {
      byRarity[relic.rarity] = (byRarity[relic.rarity] || 0) + 1;
      byEffectType[relic.effects.type] = (byEffectType[relic.effects.type] || 0) + 1;
    }

    return {
      total: Object.keys(definitions).length,
      byRarity,
      byEffectType,
    };
  }

  // ==================== 복잡한 상징 커스텀 처리 ====================

  /**
   * Snecko Eye: 드로우한 카드 비용 랜덤화 (0-3)
   */
  processSneckoEye(drawnCards: string[]): Record<string, number> {
    const costOverrides: Record<string, number> = {};
    if (this.activeRelics.has('snecko_eye')) {
      for (const cardId of drawnCards) {
        costOverrides[cardId] = Math.floor(Math.random() * 4); // 0-3
      }
      log.debug('Snecko Eye: 카드 비용 랜덤화', { costs: costOverrides });
    }
    return costOverrides;
  }

  /**
   * Dead Branch: 카드 소진 시 랜덤 카드 추가
   */
  processDeadBranch(exhaustedCards: string[]): string[] {
    const addedCards: string[] = [];
    if (this.activeRelics.has('dead_branch')) {
      const definitions = getRelicDefinitions();
      // 소진된 카드 수만큼 랜덤 카드 추가
      for (let i = 0; i < exhaustedCards.length; i++) {
        // 간단히 기본 공격 카드 중 하나 추가 (실제 구현은 카드 풀에서 선택)
        addedCards.push('strike'); // 기본 카드 추가
      }
      if (addedCards.length > 0) {
        log.debug('Dead Branch: 카드 추가', { count: addedCards.length });
      }
    }
    return addedCards;
  }

  /**
   * Runic Pyramid: 턴 종료 시 손패 유지
   */
  shouldRetainHand(): boolean {
    return this.activeRelics.has('runic_pyramid');
  }

  /**
   * Tungsten Rod: HP 손실 1 감소
   */
  reduceDamage(damage: number): number {
    if (this.activeRelics.has('tungsten_rod') && damage > 0) {
      return Math.max(1, damage - 1);
    }
    return damage;
  }

  /**
   * Bronze Scales: 피해 받을 때 3 반사
   */
  getReflectDamage(): number {
    if (this.activeRelics.has('bronze_scales')) {
      return 3;
    }
    return 0;
  }

  /**
   * Kunai: 턴에 공격 3번 사용 시 민첩 +1
   */
  trackAttack(): RelicEffectResult | null {
    if (!this.activeRelics.has('kunai')) return null;

    this.attacksThisTurn++;
    if (this.attacksThisTurn === 3) {
      return {
        relicId: 'kunai',
        relicName: '쿠나이',
        effects: { agility: 1, message: '공격 3회 달성 - 민첩 +1' },
      };
    }
    return null;
  }

  /**
   * Letter Opener: 턴에 스킬 3번 사용 시 5 피해
   */
  trackSkill(enemy: EnemyState): RelicEffectResult | null {
    if (!this.activeRelics.has('letter_opener')) return null;

    this.skillsThisTurn++;
    if (this.skillsThisTurn === 3) {
      return {
        relicId: 'letter_opener',
        relicName: '편지 오프너',
        effects: { damage: 5, message: '스킬 3회 달성 - 적에게 5 피해' },
      };
    }
    return null;
  }

  /**
   * Ornamental Fan: 턴에 카드 3장 사용 시 방어 +8
   */
  checkOrnamentalFan(): RelicEffectResult | null {
    if (!this.activeRelics.has('ornamental_fan')) return null;

    if (this.turnCardsPlayed >= 3) {
      return {
        relicId: 'ornamental_fan',
        relicName: '장식 부채',
        effects: { block: 8, message: '카드 3장 사용 - 방어 +8' },
      };
    }
    return null;
  }
}

// ==================== 싱글톤 인스턴스 ====================

let instance: RelicSystemV2 | null = null;

export function getRelicSystemV2(): RelicSystemV2 {
  if (!instance) {
    instance = new RelicSystemV2();
  }
  return instance;
}

export function resetRelicSystem(): void {
  instance = null;
}
