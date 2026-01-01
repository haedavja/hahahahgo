/**
 * @file enhanced-battle-processor.ts
 * @description 통합 전투 처리기 - 모든 새 시스템을 TimelineBattleEngine에 통합
 *
 * ## 통합 시스템
 * - card-chain-system: 연계/후속/마무리
 * - multi-enemy-system: 다중 적 동시 전투
 * - token-effects-processor: 세부 토큰 효과
 * - combo-optimizer: 포커 콤보 최적화
 */

import type { GameCard, GameBattleState, EnemyState, BattleResult, TokenState } from './game-types';
import { TimelineBattleEngine } from './timeline-battle-engine';
import {
  createChainState,
  processFollowup,
  processFinisher,
  startChain,
  updateChainState,
  hasChainTrait,
  hasFollowupTrait,
  hasFinisherTrait,
  removeGhostCards,
  processAllCardInteractions,
  type ChainState,
  type ChainResult,
} from './card-chain-system';
import {
  createMultiEnemyState,
  selectTargets,
  distributeDamage,
  damageUnit,
  healUnit,
  processEnemyTurnStart,
  selectAllEnemyCards,
  areAllEnemiesDead,
  getAliveEnemyCount,
  getTotalEnemyHp,
  toSingleEnemyState,
  type MultiEnemyState,
  type EnemyUnit,
} from './multi-enemy-system';
import {
  processAttackTokenEffects,
  processDefenseTokenEffects,
  processDamageTakenTokenEffects,
  processTurnStartTokenEffects,
  processTurnEndTokenEffects,
  consumeTokens,
  applyTokenEffects,
  type TokenEffectResult,
} from './token-effects-processor';
import { createComboOptimizer, hasComboOpportunity, type ComboOptimizer } from '../ai/combo-optimizer';
import {
  MultiEnemyBattleEngine,
  runSharedTimelineBattle,
  type MultiEnemyBattleResult,
  type TargetingMode,
} from './multi-enemy-battle-engine';
import { getLogger } from './logger';

const log = getLogger('EnhancedBattleProcessor');

// ==================== 타입 정의 ====================

export interface EnhancedBattleConfig {
  /** 상세 로그 */
  verbose?: boolean;
  /** 다중 적 전투 사용 */
  useMultiEnemy?: boolean;
  /** 연계 시스템 사용 */
  useChainSystem?: boolean;
  /** 세부 토큰 효과 사용 */
  useEnhancedTokens?: boolean;
  /** AI 콤보 최적화 사용 */
  useComboOptimizer?: boolean;
  /** 적 AI 패턴 사용 */
  useEnemyPatterns?: boolean;
  /** 공유 타임라인 사용 (다중 적 동시 전투) */
  useSharedTimeline?: boolean;
  /** 기본 타겟팅 모드 */
  defaultTargetingMode?: TargetingMode;
}

export interface EnhancedBattleResult extends BattleResult {
  /** 연계 완성 횟수 */
  chainsCompleted: number;
  /** 최대 연계 길이 */
  maxChainLength: number;
  /** 처치한 적 수 */
  enemiesKilled: number;
  /** 토큰 효과 발동 횟수 */
  tokenEffectsTriggered: number;
  /** 포커 콤보 횟수 */
  combosAchieved: number;
}

// ==================== 통합 전투 처리기 ====================

export class EnhancedBattleProcessor {
  private baseEngine: TimelineBattleEngine;
  private multiEnemyEngine: MultiEnemyBattleEngine;
  private cardLibrary: Record<string, GameCard> = {};
  private config: EnhancedBattleConfig;
  private comboOptimizer: ComboOptimizer | null = null;

  constructor(config: EnhancedBattleConfig = {}) {
    this.config = {
      verbose: false,
      useMultiEnemy: true,
      useChainSystem: true,
      useEnhancedTokens: true,
      useComboOptimizer: true,
      useEnemyPatterns: true,
      useSharedTimeline: true,
      defaultTargetingMode: 'lowest_hp',
      ...config,
    };

    this.baseEngine = new TimelineBattleEngine({ verbose: this.config.verbose });
    this.multiEnemyEngine = new MultiEnemyBattleEngine({
      verbose: this.config.verbose,
      useEnemyPatterns: this.config.useEnemyPatterns,
      defaultTargetingMode: this.config.defaultTargetingMode,
    });
  }

  /**
   * 카드 라이브러리 설정
   */
  setCardLibrary(cards: Record<string, GameCard>): void {
    this.cardLibrary = cards;
    if (this.config.useComboOptimizer) {
      this.comboOptimizer = createComboOptimizer(cards, {
        comboWeight: 0.4,
        combatWeight: 0.6,
      });
    }
  }

  /**
   * 단일 적 전투 (기존 호환)
   */
  runBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemy: EnemyState,
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): EnhancedBattleResult {
    // 기본 전투 실행
    const baseResult = this.baseEngine.runBattle(
      playerDeck,
      playerRelics,
      enemy,
      anomalyId,
      cardEnhancements
    );

    // 확장 결과 생성
    return {
      ...baseResult,
      chainsCompleted: 0,
      maxChainLength: 0,
      enemiesKilled: baseResult.winner === 'player' ? 1 : 0,
      tokenEffectsTriggered: 0,
      combosAchieved: 0,
    };
  }

  /**
   * 다중 적 전투 (새로운 시스템 - 공유 타임라인)
   */
  runMultiEnemyBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemies: EnemyState[],
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): EnhancedBattleResult {
    // 단일 적이면 기존 방식 사용
    if (!this.config.useMultiEnemy || enemies.length <= 1) {
      return this.runBattle(playerDeck, playerRelics, enemies[0], anomalyId, cardEnhancements);
    }

    // 공유 타임라인 시스템 사용
    if (this.config.useSharedTimeline) {
      return this.runSharedTimelineBattle(playerDeck, playerRelics, enemies, anomalyId, cardEnhancements);
    }

    // 순차 전투 (레거시 - 각 적과 개별 전투)
    return this.runSequentialBattle(playerDeck, playerRelics, enemies, anomalyId, cardEnhancements);
  }

  /**
   * 공유 타임라인 다중 적 전투 (모든 적이 동시에 전투)
   */
  private runSharedTimelineBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemies: EnemyState[],
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): EnhancedBattleResult {
    // 다중 적 전투 엔진 사용
    const multiResult = this.multiEnemyEngine.runMultiEnemyBattle(
      playerDeck,
      playerRelics,
      enemies,
      anomalyId,
      cardEnhancements
    );

    // 연계 시스템 분석
    let chainsCompleted = 0;
    let maxChainLength = 0;
    let currentChainLength = 0;

    if (this.config.useChainSystem) {
      let chainState = createChainState();

      for (const cardId of Object.keys(multiResult.cardUsage)) {
        const card = this.cardLibrary[cardId];
        if (!card) continue;

        if (hasChainTrait(card)) {
          chainState = startChain(chainState, card);
          currentChainLength = 1;
        } else if (chainState.isChaining) {
          if (hasFollowupTrait(card)) {
            currentChainLength++;
            maxChainLength = Math.max(maxChainLength, currentChainLength);
          } else if (hasFinisherTrait(card)) {
            currentChainLength++;
            maxChainLength = Math.max(maxChainLength, currentChainLength);
            chainsCompleted++;
            chainState = createChainState();
            currentChainLength = 0;
          } else {
            chainState = createChainState();
            currentChainLength = 0;
          }
        }
      }
    }

    // 토큰 효과 발동 횟수 추정
    const tokenEffectsTriggered = multiResult.battleLog.filter(
      log => log.includes('토큰') || log.includes('반격') || log.includes('대응사격')
    ).length;

    // 콤보 횟수 추정
    const combosAchieved = Math.floor(multiResult.etherGained / 20);

    return {
      ...multiResult,
      chainsCompleted,
      maxChainLength,
      tokenEffectsTriggered,
      combosAchieved,
    };
  }

  /**
   * 순차 다중 적 전투 (레거시)
   */
  private runSequentialBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemies: EnemyState[],
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): EnhancedBattleResult {
    const multiEnemyState = createMultiEnemyState(enemies);

    let chainsCompleted = 0;
    let maxChainLength = 0;
    let tokenEffectsTriggered = 0;
    let combosAchieved = 0;
    let totalPlayerDamage = 0;
    let totalEnemyDamage = 0;
    let playerHp = 80;
    const battleLog: string[] = [];

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (multiEnemyState.units[i].isDead) continue;

      const result = this.runBattleWithChains(
        playerDeck,
        playerRelics,
        enemy,
        anomalyId,
        cardEnhancements
      );

      chainsCompleted += result.chainsCompleted;
      maxChainLength = Math.max(maxChainLength, result.maxChainLength);
      tokenEffectsTriggered += result.tokenEffectsTriggered;
      combosAchieved += result.combosAchieved;
      totalPlayerDamage += result.playerDamageDealt;
      totalEnemyDamage += result.enemyDamageDealt;

      battleLog.push(`vs ${enemy.name}: ${result.winner === 'player' ? '승리' : '패배'}`);

      if (result.winner === 'player') {
        playerHp = result.playerFinalHp;
        multiEnemyState.units[i].isDead = true;
      } else {
        return {
          winner: 'enemy',
          turns: result.turns,
          playerDamageDealt: totalPlayerDamage,
          enemyDamageDealt: totalEnemyDamage,
          playerFinalHp: 0,
          enemyFinalHp: getTotalEnemyHp(multiEnemyState),
          etherGained: 0,
          goldChange: 0,
          battleLog,
          events: [],
          cardUsage: {},
          comboStats: {},
          tokenStats: {},
          timeline: [],
          chainsCompleted,
          maxChainLength,
          enemiesKilled: i,
          tokenEffectsTriggered,
          combosAchieved,
        };
      }
    }

    return {
      winner: 'player',
      turns: enemies.length * 3,
      playerDamageDealt: totalPlayerDamage,
      enemyDamageDealt: totalEnemyDamage,
      playerFinalHp: playerHp,
      enemyFinalHp: 0,
      etherGained: enemies.length * 25,
      goldChange: 0,
      battleLog,
      events: [],
      cardUsage: {},
      comboStats: {},
      tokenStats: {},
      timeline: [],
      chainsCompleted,
      maxChainLength,
      enemiesKilled: enemies.length,
      tokenEffectsTriggered,
      combosAchieved,
    };
  }

  /**
   * 연계 시스템이 통합된 전투
   */
  private runBattleWithChains(
    playerDeck: string[],
    playerRelics: string[],
    enemy: EnemyState,
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): EnhancedBattleResult {
    // 기본 전투 실행
    const baseResult = this.baseEngine.runBattle(
      playerDeck,
      playerRelics,
      enemy,
      anomalyId,
      cardEnhancements
    );

    // 연계 시스템 시뮬레이션 (사후 분석)
    let chainsCompleted = 0;
    let maxChainLength = 0;
    let currentChainLength = 0;

    // 토큰 효과 발동 횟수 (배틀 로그에서 추정)
    const tokenEffectsTriggered = baseResult.battleLog.filter(
      log => log.includes('토큰') || log.includes('반격') || log.includes('대응사격')
    ).length;

    // 콤보 횟수 (에테르 획득에서 추정)
    const combosAchieved = Math.floor(baseResult.etherGained / 20);

    // 카드 사용 패턴에서 연계 분석
    if (this.config.useChainSystem) {
      let chainState = createChainState();

      for (const cardId of Object.keys(baseResult.cardUsage)) {
        const card = this.cardLibrary[cardId];
        if (!card) continue;

        if (hasChainTrait(card)) {
          chainState = startChain(chainState, card);
          currentChainLength = 1;
        } else if (chainState.isChaining) {
          if (hasFollowupTrait(card)) {
            currentChainLength++;
            maxChainLength = Math.max(maxChainLength, currentChainLength);
          } else if (hasFinisherTrait(card)) {
            currentChainLength++;
            maxChainLength = Math.max(maxChainLength, currentChainLength);
            chainsCompleted++;
            chainState = createChainState();
            currentChainLength = 0;
          } else {
            // 연계 끊김
            chainState = createChainState();
            currentChainLength = 0;
          }
        }
      }
    }

    return {
      ...baseResult,
      chainsCompleted,
      maxChainLength,
      enemiesKilled: baseResult.winner === 'player' ? 1 : 0,
      tokenEffectsTriggered,
      combosAchieved,
    };
  }

  /**
   * AI 카드 선택 (콤보 최적화 적용)
   */
  selectOptimalCards(
    handCardIds: string[],
    cardsToSelect: number,
    context?: { hpRatio?: number; enemyThreat?: number }
  ): { selectedCards: string[]; reasoning: string[] } {
    if (!this.comboOptimizer || !this.config.useComboOptimizer) {
      // 폴백: 기본 선택 (전투력 순)
      const sorted = handCardIds
        .map(id => ({ id, card: this.cardLibrary[id] }))
        .filter(item => item.card)
        .sort((a, b) => {
          const scoreA = (a.card.damage || 0) + (a.card.block || 0) * 0.5;
          const scoreB = (b.card.damage || 0) + (b.card.block || 0) * 0.5;
          return scoreB - scoreA;
        });

      return {
        selectedCards: sorted.slice(0, cardsToSelect).map(item => item.id),
        reasoning: ['기본 전투력 순 선택'],
      };
    }

    const result = this.comboOptimizer.selectOptimalCards(handCardIds, cardsToSelect, context);

    return {
      selectedCards: result.selectedCards,
      reasoning: result.reasoning,
    };
  }

  /**
   * 턴 시작 토큰 처리
   */
  processTurnStart(
    state: GameBattleState,
    actor: 'player' | 'enemy'
  ): TokenEffectResult {
    if (!this.config.useEnhancedTokens) {
      return {};
    }

    return processTurnStartTokenEffects(state, actor);
  }

  /**
   * 턴 종료 토큰 처리
   */
  processTurnEnd(
    state: GameBattleState,
    actor: 'player' | 'enemy'
  ): TokenEffectResult {
    if (!this.config.useEnhancedTokens) {
      return {};
    }

    return processTurnEndTokenEffects(state, actor);
  }

  /**
   * 공격 토큰 처리
   */
  processAttack(
    state: GameBattleState,
    actor: 'player' | 'enemy',
    baseDamage: number,
    card?: GameCard
  ): TokenEffectResult {
    if (!this.config.useEnhancedTokens) {
      return { modifiedValue: baseDamage };
    }

    return processAttackTokenEffects(state, actor, baseDamage, card);
  }

  /**
   * 방어 토큰 처리
   */
  processDefense(
    state: GameBattleState,
    actor: 'player' | 'enemy',
    baseBlock: number
  ): TokenEffectResult {
    if (!this.config.useEnhancedTokens) {
      return { modifiedValue: baseBlock };
    }

    return processDefenseTokenEffects(state, actor, baseBlock);
  }

  /**
   * 피해 수신 토큰 처리
   */
  processDamageTaken(
    state: GameBattleState,
    actor: 'player' | 'enemy',
    incomingDamage: number
  ): TokenEffectResult {
    if (!this.config.useEnhancedTokens) {
      return { modifiedValue: incomingDamage };
    }

    return processDamageTakenTokenEffects(state, actor, incomingDamage);
  }
}

// ==================== 팩토리 함수 ====================

export function createEnhancedBattleProcessor(
  config?: EnhancedBattleConfig
): EnhancedBattleProcessor {
  return new EnhancedBattleProcessor(config);
}

/**
 * 간편 다중 적 전투 함수
 */
export function runMultiEnemyBattle(
  playerDeck: string[],
  playerRelics: string[],
  enemies: EnemyState[],
  cardLibrary: Record<string, GameCard>,
  config?: EnhancedBattleConfig
): EnhancedBattleResult {
  const processor = new EnhancedBattleProcessor(config);
  processor.setCardLibrary(cardLibrary);
  return processor.runMultiEnemyBattle(playerDeck, playerRelics, enemies);
}
