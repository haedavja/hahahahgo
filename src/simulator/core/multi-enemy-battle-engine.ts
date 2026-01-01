/**
 * @file multi-enemy-battle-engine.ts
 * @description 다중 적 공유 타임라인 전투 엔진
 *
 * 모든 적이 하나의 타임라인을 공유하며 동시에 전투합니다.
 * - 각 적의 카드가 같은 타임라인에 배치
 * - 위치 순서대로 모든 카드 해결
 * - 플레이어는 타겟팅으로 공격 대상 선택
 * - 적은 플레이어를 대상으로 공격
 */

import type {
  GameCard,
  GameBattleState,
  PlayerState,
  EnemyState,
  TimelineCard,
  BattleResult,
  TokenState,
} from './game-types';
import { TimelineBattleEngine, DEFAULT_MAX_SPEED, DEFAULT_PLAYER_ENERGY, DEFAULT_MAX_SUBMIT_CARDS, DEFAULT_HAND_SIZE } from './timeline-battle-engine';
import { syncAllCards, syncAllTraits } from '../data/game-data-sync';
import { createEnemyAI, getPatternForEnemy, type EnemyAI, type EnemyDecision } from '../ai/enemy-patterns';
import {
  addToken,
  getTokenStacks,
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  calculateSpeedModifier,
  processTurnEnd,
  processBurn,
  checkImmunity,
} from './token-system';
import { getRelicSystemV2 } from './relic-system-v2';
import { TraitSynergyProcessor, type TraitContext, type TraitSynergyResult } from './trait-synergy-processor';
import { detectPokerCombo, ETHER_BY_RARITY, type EtherGainResult, type CardRarity } from './combo-ether-system';
import {
  activateGameAnomaly,
  deactivateGameAnomaly,
  isEtherBlocked,
  getEnergyReduction,
  getVulnerabilityPercent,
  getDefenseBackfireDamage,
  getSpeedReduction,
  getDrawReduction,
  getChainIsolationLevel,
  getTraitSilenceLevel,
  clearGameAnomalies,
  getMirrorReflectionDamage,
  getBloodMoonDamageMultiplier,
  getBloodMoonHealMultiplier,
  getToxicMistDamage,
  getRegenerationFieldHeal,
} from './anomaly-system';
import { getLogger } from './logger';

const log = getLogger('MultiEnemyBattleEngine');

// ==================== 타입 정의 ====================

/** 다중 적 전투용 확장 타임라인 카드 */
export interface MultiEnemyTimelineCard extends TimelineCard {
  /** 적 인덱스 (0-based, player면 -1) */
  enemyIndex: number;
}

/** 다중 적 전투 상태 */
export interface MultiEnemyBattleState {
  player: PlayerState;
  enemies: EnemyState[];
  turn: number;
  phase: 'select' | 'respond' | 'resolve' | 'end';
  timeline: MultiEnemyTimelineCard[];
  anomalyId?: string;
  battleLog: string[];
  playerDamageDealt: number;
  totalEnemyDamageDealt: number;
  cardUsage: Record<string, number>;
  targetingMode: TargetingMode;
  /** 현재 선택된 공격 대상 적 인덱스 */
  currentTargetIndex: number;
  /** 이번 턴에 플레이한 카드들 */
  cardsPlayedThisTurn: GameCard[];
  /** 연계 활성화 상태 */
  chainActive: boolean;
  /** 연계 길이 */
  chainLength: number;
  /** 총 에테르 획득량 */
  totalEtherGained: number;
  /** 콤보 통계 */
  comboStats: Record<string, number>;
  /** 에테르 폭주 활성화 (이번 턴 피해량 2배) */
  etherOverdriveActive: boolean;
}

/** 타겟팅 모드 */
export type TargetingMode = 'single' | 'all' | 'random' | 'lowest_hp' | 'highest_hp';

/** 다중 적 전투 결과 */
export interface MultiEnemyBattleResult extends BattleResult {
  enemiesKilled: number;
  survivingEnemies: number;
  enemyDetails: {
    name: string;
    finalHp: number;
    damageDealt: number;
    damageReceived: number;
  }[];
}

/** 엔진 설정 */
export interface MultiEnemyBattleConfig {
  maxSpeed: number;
  maxTurns: number;
  enableCrits: boolean;
  enableCombos: boolean;
  enableRelics: boolean;
  enableAnomalies: boolean;
  verbose: boolean;
  /** 적 AI 패턴 사용 */
  useEnemyPatterns: boolean;
  /** 기본 타겟팅 모드 */
  defaultTargetingMode: TargetingMode;
}

const DEFAULT_CONFIG: MultiEnemyBattleConfig = {
  maxSpeed: DEFAULT_MAX_SPEED,
  maxTurns: 30,
  enableCrits: true,
  enableCombos: true,
  enableRelics: true,
  enableAnomalies: true,
  verbose: false,
  useEnemyPatterns: true,
  defaultTargetingMode: 'lowest_hp',
};

// ==================== 다중 적 전투 엔진 ====================

export class MultiEnemyBattleEngine {
  private cards: Record<string, GameCard>;
  private traits: Record<string, any>;
  private config: MultiEnemyBattleConfig;
  private relicSystem = getRelicSystemV2();
  private traitProcessor = new TraitSynergyProcessor();
  private enemyAIs: Map<number, EnemyAI> = new Map();
  private enhancedCards: Record<string, GameCard> = {};
  private cardEnhancements: Record<string, number> = {};
  /** 카드 폴백 캐시 (누락된 카드 대체) */
  private fallbackCards: Record<string, GameCard> = {};

  constructor(config: Partial<MultiEnemyBattleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cards = syncAllCards();
    this.traits = syncAllTraits();
  }

  /**
   * 카드 강화 캐시 생성
   */
  private buildEnhancedCardCache(): void {
    for (const [cardId, level] of Object.entries(this.cardEnhancements)) {
      if (level > 0 && this.cards[cardId]) {
        // 간단한 강화 적용 (실제로는 getEnhancedCard 사용)
        const baseCard = this.cards[cardId];
        this.enhancedCards[cardId] = {
          ...baseCard,
          damage: baseCard.damage ? Math.floor(baseCard.damage * (1 + level * 0.1)) : undefined,
          block: baseCard.block ? Math.floor(baseCard.block * (1 + level * 0.1)) : undefined,
        };
      }
    }
  }

  /**
   * 카드 조회 (강화 적용 + 폴백)
   */
  private getCard(cardId: string): GameCard | undefined {
    // 강화된 카드 우선
    if (this.enhancedCards[cardId]) {
      return this.enhancedCards[cardId];
    }
    // 기본 카드
    if (this.cards[cardId]) {
      return this.cards[cardId];
    }
    // 폴백 카드 (누락된 카드 대체)
    if (this.fallbackCards[cardId]) {
      return this.fallbackCards[cardId];
    }
    // 폴백 카드 생성
    const fallback = this.createFallbackCard(cardId);
    if (fallback) {
      this.fallbackCards[cardId] = fallback;
      return fallback;
    }
    return undefined;
  }

  /**
   * 누락된 카드에 대한 폴백 카드 생성
   */
  private createFallbackCard(cardId: string): GameCard | undefined {
    // 일반적인 적 공격 카드 패턴
    if (cardId.includes('attack') || cardId.includes('slash') || cardId.includes('bite')) {
      return {
        id: cardId,
        name: cardId,
        type: 'attack',
        damage: 5,
        speedCost: 4,
        actionCost: 1,
        description: '기본 공격',
      };
    }
    // 방어 카드 패턴
    if (cardId.includes('block') || cardId.includes('defend') || cardId.includes('shield')) {
      return {
        id: cardId,
        name: cardId,
        type: 'general',
        block: 5,
        speedCost: 3,
        actionCost: 1,
        description: '기본 방어',
      };
    }
    // 기타: 약한 공격으로 기본값
    log.warn(`Fallback card created for missing card: ${cardId}`);
    return {
      id: cardId,
      name: cardId,
      type: 'attack',
      damage: 3,
      speedCost: 3,
      actionCost: 1,
      description: '알 수 없는 카드',
    };
  }

  /**
   * 다중 적 전투 실행
   */
  runMultiEnemyBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemies: EnemyState[],
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): MultiEnemyBattleResult {
    // 단일 적도 동일한 엔진 사용 (에테르/콤보 시스템 통합을 위해)
    // 기존에는 TimelineBattleEngine으로 위임했지만, 에테르 시스템이 없어 0으로 나왔음

    // 카드 강화 초기화
    this.cardEnhancements = cardEnhancements || {};
    this.enhancedCards = {};
    this.buildEnhancedCardCache();

    // 이변 시스템 초기화
    clearGameAnomalies();
    if (anomalyId && this.config.enableAnomalies) {
      const activated = activateGameAnomaly(anomalyId);
      if (activated) {
        log.info(`Anomaly activated: ${anomalyId}`);
      }
    }

    // 적 AI 초기화
    this.initializeEnemyAIs(enemies);

    // 플레이어 초기화
    const player = this.initializePlayer(playerDeck, playerRelics);

    // 전투 상태 초기화
    const state: MultiEnemyBattleState = {
      player,
      enemies: enemies.map(e => ({
        ...e,
        tokens: e.tokens || {},
        block: e.block || 0,
        maxSpeed: e.maxSpeed || DEFAULT_MAX_SPEED,
      })),
      turn: 0,
      phase: 'select',
      timeline: [],
      anomalyId,
      battleLog: [],
      playerDamageDealt: 0,
      totalEnemyDamageDealt: 0,
      cardUsage: {},
      targetingMode: this.config.defaultTargetingMode,
      currentTargetIndex: 0,
      cardsPlayedThisTurn: [],
      chainActive: false,
      chainLength: 0,
      totalEtherGained: 0,
      comboStats: {},
      etherOverdriveActive: false,
    };

    // 덱 셔플
    this.shuffle(state.player.deck);
    for (const enemy of state.enemies) {
      this.shuffle(enemy.deck);
    }

    // 초기 핸드 드로우
    this.drawCards(state.player, DEFAULT_HAND_SIZE);

    state.battleLog.push(`=== 다중 적 전투 시작 ===`);
    state.battleLog.push(`적 수: ${enemies.length}`);
    for (let i = 0; i < enemies.length; i++) {
      state.battleLog.push(`  [${i}] ${enemies[i].name} HP: ${enemies[i].hp}`);
    }

    // 전투 루프
    while (state.turn < this.config.maxTurns) {
      // 승리/패배 조건 체크
      if (state.player.hp <= 0) break;
      if (this.areAllEnemiesDead(state)) break;

      state.turn++;
      this.executeTurn(state);
    }

    return this.finalizeBattle(state);
  }

  /**
   * 적 AI 초기화
   */
  private initializeEnemyAIs(enemies: EnemyState[]): void {
    this.enemyAIs.clear();
    for (let i = 0; i < enemies.length; i++) {
      const pattern = getPatternForEnemy(enemies[i].id);
      const ai = createEnemyAI(this.cards, pattern);
      this.enemyAIs.set(i, ai);
    }
  }

  /**
   * 플레이어 초기화
   */
  private initializePlayer(deck: string[], relics: string[]): PlayerState {
    return {
      hp: 100,
      maxHp: 100,
      block: 0,
      energy: DEFAULT_PLAYER_ENERGY,
      maxEnergy: DEFAULT_PLAYER_ENERGY,
      ether: 0,
      insight: 0,
      deck: [...deck],
      hand: [],
      discard: [],
      tokens: {},
      strength: 0,
      agility: 0,
      gold: 0,
      maxSpeed: DEFAULT_MAX_SPEED,
      relics: [],
    };
  }

  /**
   * 턴 실행
   */
  private executeTurn(state: MultiEnemyBattleState): void {
    state.battleLog.push(`\n=== 턴 ${state.turn} ===`);

    // 턴 시작 초기화
    state.player.block = 0;
    for (const enemy of state.enemies) {
      if (enemy.hp > 0) {
        enemy.block = 0;
      }
    }

    // 이변 효과: 에너지 감소
    const energyReduction = this.config.enableAnomalies ? getEnergyReduction() : 0;
    state.player.energy = Math.max(1, state.player.maxEnergy - energyReduction);
    state.timeline = [];
    state.cardsPlayedThisTurn = [];
    state.chainActive = false;
    state.chainLength = 0;

    // 에테르 폭주 체크 (턴 시작 시)
    // 이변 효과: 에테르 차단 시 폭주 불가
    state.etherOverdriveActive = false;
    const etherBlocked = this.config.enableAnomalies && isEtherBlocked();
    if (!etherBlocked && (state.player.ether || 0) >= 100) {
      state.etherOverdriveActive = true;
      state.player.ether = (state.player.ether || 0) - 100;
      state.battleLog.push(`⚡ 에테르 폭주 발동! (이번 턴 피해량 2배)`);
    } else if (etherBlocked && (state.player.ether || 0) >= 100) {
      state.battleLog.push(`⛔ 에테르 차단 이변 - 폭주 불가!`);
    }

    // 화상 피해 처리
    const burnResult = processBurn(state.player.tokens);
    if (burnResult.damage > 0) {
      state.player.hp -= burnResult.damage;
      state.battleLog.push(`🔥 화상 피해: ${burnResult.damage}`);
    }

    if (state.player.hp <= 0) return;

    // 이변 효과: Regeneration Field - 턴 시작 재생
    if (this.config.enableAnomalies) {
      const regenHeal = getRegenerationFieldHeal();
      if (regenHeal > 0) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + regenHeal);
        for (const enemy of state.enemies) {
          if (enemy.hp > 0) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + regenHeal);
          }
        }
        state.battleLog.push(`💚 재생 필드: 모두 ${regenHeal} 회복`);
      }
    }

    // 최적 타겟 선택
    state.currentTargetIndex = this.selectOptimalTarget(state);

    // 1단계: 카드 선택
    state.phase = 'select';
    const playerCards = this.selectPlayerCards(state);
    const allEnemyCards = this.selectAllEnemyCards(state);

    // 2단계: 타임라인 배치
    this.placeCardsOnTimeline(state, playerCards, allEnemyCards);

    // 3단계: 대응 단계 (생략 - 단순화)
    state.phase = 'respond';

    // 4단계: 타임라인 해결
    state.phase = 'resolve';
    this.resolveTimeline(state);

    // 5단계: 턴 종료
    state.phase = 'end';

    // 에테르/콤보 처리
    this.processEndOfTurnEther(state);

    // 핸드 버리기 및 드로우
    state.player.discard.push(...state.player.hand);
    state.player.hand = [];
    // 이변 효과: 드로우 감소
    const drawReduction = this.config.enableAnomalies ? getDrawReduction() : 0;
    const drawCount = Math.max(1, DEFAULT_HAND_SIZE - drawReduction);
    this.drawCards(state.player, drawCount);

    // 이변 효과: Toxic Mist - 턴 종료 독 피해
    if (this.config.enableAnomalies) {
      const toxicDamage = getToxicMistDamage();
      if (toxicDamage > 0) {
        state.player.hp -= toxicDamage;
        for (const enemy of state.enemies) {
          if (enemy.hp > 0) {
            enemy.hp -= toxicDamage;
          }
        }
        state.battleLog.push(`☠️ 독 안개: 모두 ${toxicDamage} 피해`);
      }
    }

    // 토큰 턴 종료 처리
    state.player.tokens = processTurnEnd(state.player.tokens);
    for (const enemy of state.enemies) {
      if (enemy.hp > 0) {
        enemy.tokens = processTurnEnd(enemy.tokens);
      }
    }
  }

  /**
   * 턴 종료 시 에테르/콤보 처리
   */
  private processEndOfTurnEther(state: MultiEnemyBattleState): void {
    if (state.cardsPlayedThisTurn.length === 0) return;

    // 포커 콤보 감지
    const combo = detectPokerCombo(state.cardsPlayedThisTurn);

    // 콤보 통계 업데이트
    state.comboStats[combo.name] = (state.comboStats[combo.name] || 0) + 1;

    // 에테르 계산
    let baseEther = 0;
    for (const card of state.cardsPlayedThisTurn) {
      const rarity = this.getCardRarity(card);
      baseEther += ETHER_BY_RARITY[rarity];
    }

    // 콤보 배율 적용
    const etherGain = Math.floor(baseEther * combo.multiplier);
    state.player.ether = (state.player.ether || 0) + etherGain;
    state.totalEtherGained += etherGain;

    if (etherGain > 0 && this.config.verbose) {
      state.battleLog.push(`  🔮 ${combo.name}: 에테르 +${etherGain} (x${combo.multiplier})`);
    }

    // 에테르 100 이상이면 다음 턴 시작 시 폭주 발동 예고
    if ((state.player.ether || 0) >= 100 && this.config.verbose) {
      state.battleLog.push(`  ⚡ 에테르 충전 완료! (다음 턴 폭주 발동 예정)`);
    }
  }

  /**
   * 카드 희귀도 추정
   */
  private getCardRarity(card: GameCard): CardRarity {
    // 특성 기반 희귀도 추정
    if (card.traits) {
      const weightSum = card.traits.reduce((sum, trait) => {
        if (['pinnacle', 'slaughter'].includes(trait)) return sum + 5;
        if (['destroyer', 'stun'].includes(trait)) return sum + 3;
        if (['swift', 'strongbone', 'chain'].includes(trait)) return sum + 1;
        return sum;
      }, 0);

      if (weightSum >= 5) return 'legendary';
      if (weightSum >= 3) return 'special';
      if (weightSum >= 1) return 'rare';
    }
    return 'common';
  }

  /**
   * 최적 공격 대상 선택
   */
  private selectOptimalTarget(state: MultiEnemyBattleState): number {
    const aliveEnemies = state.enemies
      .map((e, i) => ({ enemy: e, index: i }))
      .filter(({ enemy }) => enemy.hp > 0);

    if (aliveEnemies.length === 0) return 0;
    if (aliveEnemies.length === 1) return aliveEnemies[0].index;

    switch (state.targetingMode) {
      case 'lowest_hp':
        return aliveEnemies.reduce((min, curr) =>
          curr.enemy.hp < min.enemy.hp ? curr : min
        ).index;

      case 'highest_hp':
        return aliveEnemies.reduce((max, curr) =>
          curr.enemy.hp > max.enemy.hp ? curr : max
        ).index;

      case 'random':
        return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)].index;

      case 'single':
      default:
        return aliveEnemies[0].index;
    }
  }

  /**
   * 플레이어 카드 선택
   */
  private selectPlayerCards(state: MultiEnemyBattleState): GameCard[] {
    const selected: GameCard[] = [];
    let energyLeft = state.player.energy;
    let cardsSelected = 0;
    const maxCards = DEFAULT_MAX_SUBMIT_CARDS;

    const handCards = state.player.hand
      .map(id => this.getCard(id))
      .filter((c): c is GameCard => c !== undefined);

    if (handCards.length === 0) return selected;

    // 다중 적 전투 전략: AOE 카드 우선
    const scoredCards = handCards.map(card => {
      let score = 0;
      const hits = card.hits || 1;
      const totalDamage = (card.damage || 0) * hits;
      const totalBlock = card.block || 0;

      // 기본 점수
      score += totalDamage * 1.2;
      score += totalBlock * 0.8;

      // AOE 효과 보너스 (all_enemies 타겟)
      if (card.tags?.includes('aoe') || card.special === 'all_enemies') {
        score += totalDamage * (state.enemies.filter(e => e.hp > 0).length - 1) * 0.5;
      }

      // 빠른 카드 선호
      const speed = card.speedCost || 5;
      score += (10 - Math.min(10, speed)) * 2;

      const cost = card.actionCost || 1;
      return { card, score, cost };
    });

    scoredCards.sort((a, b) => b.score - a.score);

    for (const { card, cost } of scoredCards) {
      if (cardsSelected >= maxCards) break;
      if (cost <= energyLeft) {
        selected.push(card);
        energyLeft -= cost;
        cardsSelected++;
      }
    }

    return selected;
  }

  /**
   * 모든 적의 카드 선택
   */
  private selectAllEnemyCards(state: MultiEnemyBattleState): { enemyIndex: number; cards: GameCard[] }[] {
    const result: { enemyIndex: number; cards: GameCard[] }[] = [];

    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0) continue;

      const ai = this.enemyAIs.get(i);
      if (ai && this.config.useEnemyPatterns) {
        // 패턴 기반 AI 사용
        const decision = ai.selectCards(
          enemy,
          state.player,
          enemy.deck,
          enemy.cardsPerTurn
        );
        result.push({ enemyIndex: i, cards: decision.selectedCards });

        if (decision.reasoning.length > 0 && this.config.verbose) {
          state.battleLog.push(`  👹 ${enemy.name} AI: ${decision.reasoning.join(', ')}`);
        }
      } else {
        // 기본 랜덤 선택
        const cards = this.selectEnemyCardsBasic(enemy);
        result.push({ enemyIndex: i, cards });
      }
    }

    return result;
  }

  /**
   * 적 카드 기본 선택 (휴리스틱 및 조합/교차 고려)
   */
  private selectEnemyCardsBasic(enemy: EnemyState): GameCard[] {
    const available: GameCard[] = [];
    for (const cardId of enemy.deck) {
      const card = this.cards[cardId];
      if (card) available.push(card);
    }

    if (available.length === 0) return [];

    // HP 비율에 따른 전략
    const hpRatio = enemy.hp / enemy.maxHp;

    // 타입/특성 카운터 (조합 평가용)
    const typeCount = new Map<string, number>();
    const traitCount = new Map<string, number>();
    for (const card of available) {
      typeCount.set(card.type || 'general', (typeCount.get(card.type || 'general') || 0) + 1);
      if (card.traits) {
        for (const trait of card.traits) {
          traitCount.set(trait, (traitCount.get(trait) || 0) + 1);
        }
      }
    }

    // 점수 기반 정렬
    const scored = available.map(card => {
      let score = 0;
      const damage = (card.damage || 0) * (card.hits || 1);
      const block = card.block || 0;

      // 1. HP 기반 기본 점수
      if (hpRatio < 0.3) {
        // HP 낮음: 방어 우선
        score = block * 2.5 + damage * 0.8;
      } else if (hpRatio > 0.7) {
        // HP 높음: 공격 우선
        score = damage * 2.5 + block * 0.5;
      } else {
        // 균형
        score = damage * 1.5 + block * 1.2;
      }

      // 2. 교차 보너스 카드 우선 (+15점)
      if (card.crossBonus) {
        score += 15;
        // 공격 배율 교차는 더 가치있음
        if (card.crossBonus.type === 'damage_mult') {
          score += 5;
        }
      }

      // 3. 조합 가능성 보너스 (같은 타입 많으면 우선)
      const sameTypeCount = typeCount.get(card.type || 'general') || 0;
      if (sameTypeCount >= 3) {
        score += sameTypeCount * 2; // 플러쉬 가능성
      }

      // 4. 특성 시너지 보너스
      if (card.traits) {
        for (const trait of card.traits) {
          const count = traitCount.get(trait) || 0;
          if (count >= 2) {
            score += count * 1.5; // 같은 특성 시너지
          }
        }
      }

      // 5. 특수 효과 보너스
      if (card.appliedTokens && card.appliedTokens.length > 0) {
        score += 8;
      }

      // 6. 빠른 카드 선호 (교차 기회 증가)
      score += (10 - (card.speedCost || 5)) * 0.8;

      // 7. 희귀도 보너스
      if (card.rarity === 'rare') score += 3;
      if (card.rarity === 'epic') score += 5;
      if (card.rarity === 'legendary') score += 8;

      return { card, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, enemy.cardsPerTurn).map(s => s.card);
  }

  /**
   * 타임라인에 카드 배치
   */
  private placeCardsOnTimeline(
    state: MultiEnemyBattleState,
    playerCards: GameCard[],
    allEnemyCards: { enemyIndex: number; cards: GameCard[] }[]
  ): void {
    state.timeline = [];

    // 모든 적 카드 배치 (먼저)
    for (const { enemyIndex, cards } of allEnemyCards) {
      const enemy = state.enemies[enemyIndex];
      for (const card of cards) {
        const position = this.calculateCardPosition(card, enemy.tokens);
        state.timeline.push({
          cardId: card.id,
          owner: 'enemy',
          position,
          crossed: false,
          executed: false,
          enemyIndex,
        });
      }
    }

    // 플레이어 카드 배치
    for (const card of playerCards) {
      const position = this.calculateCardPosition(card, state.player.tokens);
      state.timeline.push({
        cardId: card.id,
        owner: 'player',
        position,
        crossed: false,
        executed: false,
        enemyIndex: -1,
      });

      // 핸드에서 제거
      const idx = state.player.hand.indexOf(card.id);
      if (idx >= 0) {
        state.player.hand.splice(idx, 1);
        state.player.discard.push(card.id);
      }
    }

    // 위치순 정렬
    state.timeline.sort((a, b) => a.position - b.position);

    // 교차 체크
    this.checkCrossings(state);

    if (this.config.verbose) {
      state.battleLog.push(`  📋 타임라인: ${state.timeline.length}장`);
      for (const tc of state.timeline) {
        const card = this.cards[tc.cardId];
        const owner = tc.owner === 'player' ? '플레이어' : `적${tc.enemyIndex}`;
        state.battleLog.push(`    [${tc.position}] ${owner}: ${card?.name || tc.cardId}${tc.crossed ? ' ⚔️' : ''}`);
      }
    }
  }

  /**
   * 카드 위치 계산
   */
  private calculateCardPosition(card: GameCard, tokens: TokenState[]): number {
    let position = card.speedCost || 5;
    const speedMod = calculateSpeedModifier(tokens);
    position += speedMod;

    // 이변 효과: 속도 감소
    const speedReduction = this.config.enableAnomalies ? getSpeedReduction() : 0;
    position += speedReduction;

    if (card.traits) {
      // 이변 효과: 특성 침묵 - 특성 효과 무시
      const traitSilence = this.config.enableAnomalies ? getTraitSilenceLevel() : 0;
      if (traitSilence === 0) {
        for (const trait of card.traits) {
          if (trait === 'swift') position -= 2;
          if (trait === 'slow') position += 3;
          if (trait === 'last') position = this.config.maxSpeed;
        }
      }
    }

    return Math.max(1, Math.min(position, this.config.maxSpeed));
  }

  /**
   * 교차 체크
   */
  private checkCrossings(state: MultiEnemyBattleState): void {
    const playerPositions = new Set<number>();
    const enemyPositions = new Set<number>();

    for (const tc of state.timeline) {
      if (tc.owner === 'player') {
        playerPositions.add(tc.position);
      } else {
        enemyPositions.add(tc.position);
      }
    }

    for (const tc of state.timeline) {
      if (tc.owner === 'player' && enemyPositions.has(tc.position)) {
        tc.crossed = true;
      }
      if (tc.owner === 'enemy' && playerPositions.has(tc.position)) {
        tc.crossed = true;
      }
    }
  }

  /**
   * 타임라인 해결
   */
  private resolveTimeline(state: MultiEnemyBattleState): void {
    const sorted = [...state.timeline].sort((a, b) => a.position - b.position);

    for (const tc of sorted) {
      // 전투 종료 조건 체크
      if (state.player.hp <= 0) break;
      if (this.areAllEnemiesDead(state)) break;
      if (tc.executed) continue;

      const card = tc.owner === 'player'
        ? this.getCard(tc.cardId)
        : this.cards[tc.cardId];
      if (!card) continue;

      tc.executed = true;

      if (tc.owner === 'player') {
        this.executePlayerCard(state, card, tc);
      } else {
        // 해당 적이 살아있을 때만 실행
        const enemy = state.enemies[tc.enemyIndex];
        if (enemy && enemy.hp > 0) {
          this.executeEnemyCard(state, card, tc);
        }
      }
    }
  }

  /**
   * 플레이어 카드 실행
   */
  private executePlayerCard(state: MultiEnemyBattleState, card: GameCard, tc: MultiEnemyTimelineCard): void {
    // 카드 사용 통계
    state.cardUsage[card.id] = (state.cardUsage[card.id] || 0) + 1;

    // 카드 플레이 기록 (에테르/콤보용)
    state.cardsPlayedThisTurn.push(card);

    // 타겟 결정
    const targets = this.determineTargets(state, card);

    if (targets.length === 0) {
      state.battleLog.push(`  ⚠️ ${card.name}: 대상 없음`);
      return;
    }

    // 특성 시너지 계산
    const traitContext: TraitContext = {
      cardsPlayedThisTurn: state.cardsPlayedThisTurn,
      chainActive: state.chainActive,
      chainLength: state.chainLength,
      crossed: tc.crossed,
      comboRank: 0,
      hpRatio: state.player.hp / state.player.maxHp,
      enemyHpRatio: targets.length > 0
        ? state.enemies[targets[0]].hp / state.enemies[targets[0]].maxHp
        : 1,
    };

    const synergyResult = this.traitProcessor.processTraitSynergies(
      card,
      { player: state.player, enemy: state.enemies[targets[0]] } as any,
      'player',
      traitContext
    );

    // 연계 상태 업데이트
    // 이변 효과: 연계 고립 - 연계 시스템 비활성화
    const chainIsolation = this.config.enableAnomalies ? getChainIsolationLevel() : 0;
    if (chainIsolation === 0) {
      if (card.traits?.includes('chain')) {
        state.chainActive = true;
        state.chainLength++;
      } else if (!card.traits?.includes('followup') && !card.traits?.includes('finisher')) {
        state.chainActive = false;
        state.chainLength = 0;
      }
    } else {
      // 연계 고립 시 항상 비활성화
      state.chainActive = false;
      state.chainLength = 0;
    }

    // 공격 처리
    if (card.damage && card.damage > 0) {
      const hits = (card.hits || 1) + synergyResult.extraHits;
      let baseDamage = card.damage + (state.player.strength || 0) + synergyResult.bonusDamage;

      // 특성 피해 배율 적용
      baseDamage = Math.floor(baseDamage * synergyResult.damageMultiplier);

      // 에테르 폭주: 턴 피해량 2배
      if (state.etherOverdriveActive) {
        baseDamage = baseDamage * 2;
      }

      for (const targetIdx of targets) {
        const enemy = state.enemies[targetIdx];
        if (!enemy || enemy.hp <= 0) continue;

        for (let hit = 0; hit < hits; hit++) {
          if (enemy.hp <= 0) break;

          let damage = baseDamage;

          // 교차 보너스
          if (tc.crossed && card.crossBonus?.type === 'damage_mult') {
            damage = Math.floor(damage * (card.crossBonus.value || 1.5));
          }

          // 취약 체크
          const vulnerable = getTokenStacks(enemy.tokens || {}, 'vulnerable');
          if (vulnerable > 0) {
            damage = Math.floor(damage * 1.5);
          }

          // 이변 효과: 추가 취약성 (VULNERABILITY)
          const anomalyVulnerable = this.config.enableAnomalies ? getVulnerabilityPercent() : 0;
          if (anomalyVulnerable > 0) {
            damage = Math.floor(damage * (1 + anomalyVulnerable / 100));
          }

          // 이변 효과: Blood Moon - 피해 +25%
          if (this.config.enableAnomalies) {
            const bloodMoonMult = getBloodMoonDamageMultiplier();
            if (bloodMoonMult !== 1) {
              damage = Math.floor(damage * bloodMoonMult);
            }
          }

          // 방어력 처리
          const blocked = Math.min(enemy.block, damage);
          const actualDamage = damage - blocked;
          enemy.block = Math.max(0, enemy.block - damage);
          enemy.hp -= actualDamage;

          state.playerDamageDealt += actualDamage;

          // 이변 효과: Mirror Dimension - 피해 반사
          if (this.config.enableAnomalies && actualDamage > 0) {
            const reflectedDamage = getMirrorReflectionDamage(actualDamage);
            if (reflectedDamage > 0) {
              state.player.hp -= reflectedDamage;
              state.battleLog.push(`  🪞 거울 반사: ${reflectedDamage} 피해`);
            }
          }

          if (this.config.verbose || targets.length > 1) {
            state.battleLog.push(`  ⚔️ ${card.name} → ${enemy.name}: ${actualDamage} 피해${blocked > 0 ? ` (${blocked} 방어)` : ''}`);
          }
        }

        // 적 처치 체크
        if (enemy.hp <= 0) {
          state.battleLog.push(`  💀 ${enemy.name} 처치!`);
        }
      }
    }

    // 방어 처리
    if (card.block && card.block > 0) {
      let block = card.block + (state.player.agility || 0) + synergyResult.bonusBlock;

      // 특성 방어력 배율 적용
      block = Math.floor(block * synergyResult.blockMultiplier);

      if (tc.crossed && card.crossBonus?.type === 'block_mult') {
        block = Math.floor(block * (card.crossBonus.value || 1.5));
      }

      state.player.block += block;
      state.battleLog.push(`  🛡️ ${card.name}: 방어 +${block}`);

      // 이변 효과: 방어 카드 자해 (DEFENSE_BACKFIRE)
      const backfireDamage = this.config.enableAnomalies ? getDefenseBackfireDamage() : 0;
      if (backfireDamage > 0) {
        state.player.hp -= backfireDamage;
        state.battleLog.push(`  💥 이변 자해: ${backfireDamage} 피해`);
      }
    }

    // 시너지 토큰 적용
    for (const tokenApply of synergyResult.appliedTokens) {
      if (tokenApply.target === 'self') {
        state.player.tokens = addToken(state.player.tokens, tokenApply.id, tokenApply.stacks);
      } else {
        for (const targetIdx of targets) {
          const enemy = state.enemies[targetIdx];
          if (enemy && enemy.hp > 0) {
            const check = checkImmunity(enemy.tokens, tokenApply.id);
            if (!check.blocked) {
              enemy.tokens = addToken(enemy.tokens, tokenApply.id, tokenApply.stacks);
            }
          }
        }
      }
    }

    // 토큰 적용
    if (card.appliedTokens) {
      for (const token of card.appliedTokens) {
        if (token.target === 'player' || token.target === 'self') {
          state.player.tokens = addToken(state.player.tokens, token.id, token.stacks || 1);
        } else {
          // 모든 타겟에 적용
          for (const targetIdx of targets) {
            const enemy = state.enemies[targetIdx];
            if (enemy && enemy.hp > 0) {
              const check = checkImmunity(enemy.tokens, token.id);
              if (!check.blocked) {
                enemy.tokens = addToken(enemy.tokens, token.id, token.stacks || 1);
              }
            }
          }
        }
      }
    }

    // 카드 특수 효과 처리 (창조 등)
    this.processCardSpecial(state, card, targets);

    // 시너지 로그 (verbose 모드)
    if (this.config.verbose && synergyResult.synergies.length > 0) {
      state.battleLog.push(`  ✨ 시너지: ${synergyResult.synergies.join(', ')}`);
    }
  }

  /**
   * 카드 특수 효과 처리
   */
  private processCardSpecial(
    state: MultiEnemyBattleState,
    card: GameCard,
    targets: number[]
  ): void {
    if (!card.special) return;

    const special = Array.isArray(card.special) ? card.special : [card.special];

    for (const effect of special) {
      switch (effect) {
        case 'createAttackOnHit':
          // 피해 성공 시 공격 카드 창조 (최대 2장)
          if (targets.length > 0 && card.damage && card.damage > 0) {
            const attackCards = ['strike', 'shoot'];
            const createdCard = attackCards[Math.floor(Math.random() * attackCards.length)];
            state.player.hand.push(createdCard);
            if (this.config.verbose) {
              state.battleLog.push(`  🃏 창조: ${createdCard} 카드 획득`);
            }
          }
          break;

        case 'breach':
          // 3장 중 1장 선택하여 타임라인에 추가 (시뮬레이터에서는 랜덤 선택)
          const breachCards = ['strike', 'shoot', 'quarte'];
          const selectedCard = breachCards[Math.floor(Math.random() * breachCards.length)];
          const breachCardData = this.cards[selectedCard];
          if (breachCardData) {
            const position = (breachCardData.speedCost || 5) + (card.breachSpOffset || 3);
            state.timeline.push({
              cardId: selectedCard,
              owner: 'player',
              position: Math.min(position, this.config.maxSpeed),
              crossed: false,
              executed: false,
              enemyIndex: -1,
            });
            if (this.config.verbose) {
              state.battleLog.push(`  🃏 브리치: ${breachCardData.name} 타임라인 추가`);
            }
          }
          break;

        case 'createFencingCards3':
          // 펜싱 카드 3장 창조
          const fencingCards = ['marche', 'lunge', 'feint', 'thrust', 'beat'];
          for (let i = 0; i < 3; i++) {
            const randomCard = fencingCards[Math.floor(Math.random() * fencingCards.length)];
            state.player.hand.push(randomCard);
          }
          if (this.config.verbose) {
            state.battleLog.push(`  🃏 창조: 펜싱 카드 3장 획득`);
          }
          break;

        case 'pushEnemyTimeline':
        case 'pushLastEnemyCard':
          // 넉백: 적 카드 위치 밀어내기
          if (card.pushAmount && targets.length > 0) {
            for (const tc of state.timeline) {
              if (tc.owner === 'enemy' && !tc.executed) {
                tc.position = Math.min(tc.position + card.pushAmount, this.config.maxSpeed);
              }
            }
            if (this.config.verbose) {
              state.battleLog.push(`  ⬇️ 넉백: 적 카드 +${card.pushAmount}`);
            }
          }
          break;

        case 'advanceTimeline':
          // 앞당김: 플레이어 카드 위치 앞당기기
          if (card.advanceAmount) {
            for (const tc of state.timeline) {
              if (tc.owner === 'player' && !tc.executed) {
                tc.position = Math.max(1, tc.position - card.advanceAmount);
              }
            }
          }
          break;

        case 'aoeAttack':
          // AOE 공격은 이미 determineTargets에서 처리됨
          break;

        case 'growingDefense':
          // 타임라인 위치에 따른 방어력 증가 (이미 계산됨)
          break;
      }
    }
  }

  /**
   * 타겟 결정
   */
  private determineTargets(state: MultiEnemyBattleState, card: GameCard): number[] {
    const aliveEnemies = state.enemies
      .map((e, i) => ({ index: i, hp: e.hp }))
      .filter(e => e.hp > 0);

    if (aliveEnemies.length === 0) return [];

    // AOE 카드
    if (card.tags?.includes('aoe') || card.special === 'all_enemies') {
      return aliveEnemies.map(e => e.index);
    }

    // 단일 대상
    switch (state.targetingMode) {
      case 'all':
        return aliveEnemies.map(e => e.index);

      case 'random':
        return [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)].index];

      case 'lowest_hp':
        return [aliveEnemies.reduce((min, curr) => curr.hp < min.hp ? curr : min).index];

      case 'highest_hp':
        return [aliveEnemies.reduce((max, curr) => curr.hp > max.hp ? curr : max).index];

      case 'single':
      default:
        // 현재 선택된 타겟, 없으면 첫 번째 생존 적
        if (state.currentTargetIndex < state.enemies.length &&
            state.enemies[state.currentTargetIndex].hp > 0) {
          return [state.currentTargetIndex];
        }
        return [aliveEnemies[0].index];
    }
  }

  /**
   * 적 카드 실행
   */
  private executeEnemyCard(state: MultiEnemyBattleState, card: GameCard, tc: MultiEnemyTimelineCard): void {
    const enemy = state.enemies[tc.enemyIndex];
    if (!enemy || enemy.hp <= 0) return;

    // 공격 처리
    if (card.damage && card.damage > 0) {
      const hits = card.hits || 1;
      const strength = getTokenStacks(enemy.tokens || {}, 'strength');
      const baseDamage = card.damage + strength;

      for (let hit = 0; hit < hits; hit++) {
        if (state.player.hp <= 0) break;

        let damage = baseDamage;

        // 취약 체크
        const vulnerable = getTokenStacks(state.player.tokens || {}, 'vulnerable');
        if (vulnerable > 0) {
          damage = Math.floor(damage * 1.5);
        }

        // 방어력 처리
        const blocked = Math.min(state.player.block, damage);
        const actualDamage = damage - blocked;
        state.player.block = Math.max(0, state.player.block - damage);
        state.player.hp -= actualDamage;

        state.totalEnemyDamageDealt += actualDamage;

        state.battleLog.push(`  👹 ${enemy.name}의 ${card.name}: ${actualDamage} 피해${blocked > 0 ? ` (${blocked} 방어)` : ''}`);
      }
    }

    // 방어 처리
    if (card.block && card.block > 0) {
      enemy.block += card.block;
      if (this.config.verbose) {
        state.battleLog.push(`  🛡️ ${enemy.name}: 방어 +${card.block}`);
      }
    }

    // 토큰 적용
    if (card.appliedTokens) {
      for (const token of card.appliedTokens) {
        if (token.target === 'self' || token.target === 'enemy') {
          enemy.tokens = addToken(enemy.tokens, token.id, token.stacks || 1);
        } else {
          const check = checkImmunity(state.player.tokens, token.id);
          if (!check.blocked) {
            state.player.tokens = addToken(state.player.tokens, token.id, token.stacks || 1);
          }
        }
      }
    }
  }

  /**
   * 모든 적이 죽었는지 확인
   */
  private areAllEnemiesDead(state: MultiEnemyBattleState): boolean {
    return state.enemies.every(e => e.hp <= 0);
  }

  /**
   * 전투 결과 생성
   */
  private finalizeBattle(state: MultiEnemyBattleState): MultiEnemyBattleResult {
    const allEnemiesDead = this.areAllEnemiesDead(state);
    const playerAlive = state.player.hp > 0;
    const winner = playerAlive && allEnemiesDead ? 'player' : 'enemy';

    const enemiesKilled = state.enemies.filter(e => e.hp <= 0).length;
    const survivingEnemies = state.enemies.filter(e => e.hp > 0).length;

    const enemyDetails = state.enemies.map((e, i) => ({
      name: e.name,
      finalHp: Math.max(0, e.hp),
      damageDealt: 0, // TODO: 개별 적 피해량 추적
      damageReceived: e.maxHp - Math.max(0, e.hp),
    }));

    state.battleLog.push(`\n=== 전투 종료 ===`);
    state.battleLog.push(`승자: ${winner === 'player' ? '플레이어' : '적'}`);
    state.battleLog.push(`플레이어 HP: ${state.player.hp}/${state.player.maxHp}`);
    state.battleLog.push(`처치한 적: ${enemiesKilled}/${state.enemies.length}`);
    if (state.totalEtherGained > 0) {
      state.battleLog.push(`총 에테르 획득: ${state.totalEtherGained}`);
    }
    if (Object.keys(state.comboStats).length > 0) {
      const comboSummary = Object.entries(state.comboStats)
        .map(([name, count]) => `${name}(${count})`)
        .join(', ');
      state.battleLog.push(`콤보: ${comboSummary}`);
    }

    return {
      winner,
      turns: state.turn,
      playerDamageDealt: state.playerDamageDealt,
      enemyDamageDealt: state.totalEnemyDamageDealt,
      playerFinalHp: Math.max(0, state.player.hp),
      enemyFinalHp: state.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0),
      etherGained: state.totalEtherGained,
      goldChange: 0,
      battleLog: state.battleLog,
      events: [],
      cardUsage: state.cardUsage,
      comboStats: state.comboStats,
      tokenStats: {},
      timeline: state.timeline,
      enemiesKilled,
      survivingEnemies,
      enemyDetails,
    };
  }

  /**
   * 단일 적 결과를 다중 적 형식으로 변환
   */
  private convertToMultiEnemyResult(result: BattleResult, enemies: EnemyState[]): MultiEnemyBattleResult {
    return {
      ...result,
      enemiesKilled: result.winner === 'player' ? enemies.length : 0,
      survivingEnemies: result.winner === 'player' ? 0 : enemies.length,
      enemyDetails: enemies.map(e => ({
        name: e.name,
        finalHp: result.winner === 'player' ? 0 : result.enemyFinalHp,
        damageDealt: result.enemyDamageDealt,
        damageReceived: e.maxHp - (result.winner === 'player' ? 0 : result.enemyFinalHp),
      })),
    };
  }

  /**
   * 유틸리티: 배열 셔플
   */
  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * 카드 드로우
   */
  private drawCards(player: PlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break;
        player.deck = [...player.discard];
        player.discard = [];
        this.shuffle(player.deck);
      }
      const card = player.deck.pop();
      if (card) player.hand.push(card);
    }
  }
}

// ==================== 팩토리 함수 ====================

export function createMultiEnemyBattleEngine(
  config?: Partial<MultiEnemyBattleConfig>
): MultiEnemyBattleEngine {
  return new MultiEnemyBattleEngine(config);
}

/**
 * 간편 다중 적 전투 함수
 */
export function runSharedTimelineBattle(
  playerDeck: string[],
  playerRelics: string[],
  enemies: EnemyState[],
  options?: {
    cardEnhancements?: Record<string, number>;
    anomalyId?: string;
    targetingMode?: TargetingMode;
    verbose?: boolean;
    useEnemyPatterns?: boolean;
  }
): MultiEnemyBattleResult {
  const engine = new MultiEnemyBattleEngine({
    verbose: options?.verbose,
    useEnemyPatterns: options?.useEnemyPatterns ?? true,
    defaultTargetingMode: options?.targetingMode ?? 'lowest_hp',
  });

  return engine.runMultiEnemyBattle(
    playerDeck,
    playerRelics,
    enemies,
    options?.anomalyId,
    options?.cardEnhancements
  );
}
