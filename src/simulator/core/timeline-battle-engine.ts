/**
 * @file timeline-battle-engine.ts
 * @description 타임라인 기반 완전한 전투 엔진
 *
 * 실제 게임의 전투 시스템을 정확하게 반영:
 * - speedCost/actionCost 이중 코스트 시스템
 * - 타임라인 배치 및 해결
 * - 대응 단계
 * - 교차(cross) 효과
 * - 대응사격(counterShot)
 * - 룰렛 토큰
 * - 성장형 방어(growingDefense)
 * - 방어력 무시(ignoreBlock)
 * - 이변 취약 배율
 */

import type {
  GameCard,
  GameBattleState,
  PlayerState,
  EnemyState,
  EnemyUnit,
  TimelineCard,
  BattleEvent,
  BattleResult,
  TokenState,
  EffectValueRecord,
} from './game-types';
import { syncAllCards, syncAllTraits } from '../data/game-data-sync';
import {
  addToken,
  removeToken,
  hasToken,
  getTokenStacks,
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  consumeAttackTokens,
  consumeDefenseTokens,
  consumeDamageTakenTokens,
  processTurnEnd,
  processCounter,
  processCounterShot,
  checkRoulette,
  processBurn,
  checkImmunity,
  checkRevive,
  calculateEnergyModifier,
  calculateSpeedModifier,
  enforceMinFinesse,
} from './token-system';
import { getRelicSystemV2, RelicSystemV2 } from './relic-system-v2';
import { getItemSystem, ItemSystem, applyItemEffect } from './item-system';
import {
  getAnomalySystem,
  activateGameAnomaly,
  activateMultipleGameAnomalies,
  clearGameAnomalies,
  isEtherBlocked,
  getEnergyReduction,
  getSpeedReduction,
  getDrawReduction,
  getVulnerabilityPercent,
  getDefenseBackfireDamage,
  getSpeedInstability,
  getInsightReduction,
  getValueDownTokens,
  getChainIsolationLevel,
  getTraitSilenceLevel,
  getFinesseBlockLevel,
  getActiveAnomalyDetailedSummary,
  getActiveAnomalyCount,
} from './anomaly-system';
import { getLogger } from './logger';
import { RespondAI, type ResponseDecision, type TimelineAnalysis } from '../ai/respond-ai';
import {
  executeSpecialEffects,
  processCrossBonus,
  checkAndConsumeRequiredTokens,
  hasSpecialEffect,
  getFencingDamageBonus,
  getGunDamageBonus,
} from './card-effects';
import {
  getEnhancedCard,
  calculateEnhancedStats,
  type EnhancedCardStats,
} from '../../lib/cardEnhancementUtils';
import { CardCreationSystem } from './card-creation';
import {
  processEnemyBattleStartPassives,
  processEnemyTurnStartPassives,
  checkAndProcessSummonPassive,
  hasVeilEffect,
} from './enemy-passives';
import {
  processTurnEndEther,
  detectPokerCombo,
  checkEtherBurst,
  type EtherGainResult,
  type BurstResult,
} from './combo-ether-system';
import {
  createEnemyAI,
  getPatternForEnemy,
  getPatternModifierByHp,
  selectBossCards,
  getBossPhase,
  checkBossSpecialActions,
  BOSS_PATTERNS,
} from '../ai/enemy-patterns';
import {
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
  VULNERABLE_MULTIPLIER,
  WEAK_MULTIPLIER,
} from '../../lib/battleCalculations';

// 분리된 모듈에서 import
import {
  DEFAULT_MAX_SPEED,
  DEFAULT_PLAYER_ENERGY,
  DEFAULT_MAX_SUBMIT_CARDS,
  DEFAULT_HAND_SIZE,
  DEFAULT_CONFIG,
  type BattleEngineConfig,
  type TraitModifiers,
  type SkillLevel,
} from './battle-engine-types';
import { SkillLevelAI, createSkillLevelAI } from '../ai/skill-level-ai';
import {
  initializeEnemyUnits,
  selectTargetUnit,
  distributeUnitDamage,
  syncEnemyTotalHp,
  checkSummonTrigger,
  spawnDeserters,
  getAliveUnitCount,
  distributeAoeDamage,
} from './enemy-units';

const log = getLogger('TimelineBattleEngine');

// ==================== 하위 호환성을 위한 재내보내기 ====================

// Re-export battle calculation constants
export { BASE_CRIT_CHANCE, CRIT_MULTIPLIER, VULNERABLE_MULTIPLIER, WEAK_MULTIPLIER };

// Re-export from battle-engine-types
export {
  DEFAULT_MAX_SPEED,
  DEFAULT_PLAYER_ENERGY,
  DEFAULT_MAX_SUBMIT_CARDS,
  DEFAULT_HAND_SIZE,
  type BattleEngineConfig,
};

// Re-export from enemy-units
export {
  initializeEnemyUnits,
  selectTargetUnit,
  distributeUnitDamage,
  syncEnemyTotalHp,
  checkSummonTrigger,
  spawnDeserters,
  getAliveUnitCount,
  distributeAoeDamage,
};

// ==================== 타임라인 전투 엔진 ====================

export class TimelineBattleEngine {
  private cards: Record<string, GameCard>;
  private traits: Record<string, { id: string; name: string; type: 'positive' | 'negative'; weight: number; description: string }>;
  private config: BattleEngineConfig;
  private relicSystem: RelicSystemV2;
  private itemSystem: ItemSystem;
  private respondAI: RespondAI;
  private cardCreation: CardCreationSystem;
  private events: BattleEvent[] = [];
  /** 현재 전투의 강화된 카드 캐시 */
  private enhancedCards: Record<string, GameCard> = {};
  /** 현재 전투의 카드 강화 레벨 */
  private cardEnhancements: Record<string, number> = {};
  /** 보스 페이즈 변경 추적용 */
  private lastBossPhase: string | null = null;
  /** 플레이어 스킬 레벨 AI */
  private skillLevelAI: SkillLevelAI;

  constructor(config: Partial<BattleEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cards = syncAllCards();
    this.traits = syncAllTraits();
    this.relicSystem = getRelicSystemV2();
    this.itemSystem = getItemSystem();
    this.respondAI = new RespondAI(this.cards);
    this.cardCreation = new CardCreationSystem(this.cards);
    this.skillLevelAI = createSkillLevelAI(this.config.skillLevel);
  }

  /**
   * 스킬 레벨 설정 변경
   */
  setSkillLevel(level: SkillLevel): void {
    this.config.skillLevel = level;
    this.skillLevelAI = createSkillLevelAI(level);
  }

  /**
   * 현재 스킬 레벨 AI 통계 가져오기
   */
  getSkillLevelStats(): { optimalPlays: number; suboptimalPlays: number; mistakesMade: number } {
    return this.skillLevelAI.getStats();
  }

  // ==================== 토큰 추적 헬퍼 ====================

  /**
   * 효과값 기록 헬퍼
   */
  private recordEffectValue(
    effectsMap: Record<string, EffectValueRecord> | undefined,
    id: string,
    effect: { damage?: number; block?: number; heal?: number; ether?: number; other?: Record<string, number> }
  ): void {
    if (!effectsMap) return;

    if (!effectsMap[id]) {
      effectsMap[id] = {
        count: 0,
        totalDamage: 0,
        totalBlock: 0,
        totalHealing: 0,
        totalEther: 0,
        otherEffects: {},
      };
    }

    const record = effectsMap[id];
    record.count++;
    record.totalDamage += effect.damage || 0;
    record.totalBlock += effect.block || 0;
    record.totalHealing += effect.heal || 0;
    record.totalEther += effect.ether || 0;

    if (effect.other) {
      for (const [key, value] of Object.entries(effect.other)) {
        record.otherEffects[key] = (record.otherEffects[key] || 0) + value;
      }
    }
  }

  /**
   * 토큰 추가 및 통계 추적
   * @param state 전투 상태 (tokenUsage 업데이트용)
   * @param entity 토큰을 받을 엔티티 (player 또는 enemy)
   * @param tokenId 토큰 ID
   * @param stacks 스택 수
   */
  private addTokenTracked(
    state: { tokenUsage?: Record<string, number> },
    entity: { tokens: TokenState },
    tokenId: string,
    stacks: number = 1
  ): void {
    entity.tokens = addToken(entity.tokens, tokenId, stacks);
    if (state.tokenUsage) {
      state.tokenUsage[tokenId] = (state.tokenUsage[tokenId] || 0) + stacks;
    }
  }

  // ==================== 카드 강화 시스템 ====================

  /**
   * 강화된 카드 캐시 생성
   */
  private buildEnhancedCardCache(): void {
    for (const [cardId, level] of Object.entries(this.cardEnhancements)) {
      if (level > 0 && this.cards[cardId]) {
        const baseCard = this.cards[cardId];
        const enhanced = getEnhancedCard(baseCard as import('../../lib/cardEnhancementUtils').BaseCard, level);
        this.enhancedCards[cardId] = enhanced as GameCard;
      }
    }
  }

  /**
   * 카드 조회 (강화 적용)
   * @param cardId 카드 ID
   * @returns 강화가 적용된 카드 또는 기본 카드
   */
  private getCard(cardId: string): GameCard | undefined {
    // 강화된 카드가 있으면 반환
    if (this.enhancedCards[cardId]) {
      return this.enhancedCards[cardId];
    }
    // 기본 카드 반환
    return this.cards[cardId];
  }

  // ==================== 메인 전투 실행 ====================

  /**
   * 전투 실행
   * @param playerDeck 플레이어 덱
   * @param playerRelics 플레이어 상징
   * @param enemy 적 상태
   * @param anomalyId 이변 ID 또는 다중 이변 설정 (보스 전투용)
   * @param cardEnhancements 카드 강화 레벨 (카드ID -> 강화레벨)
   * @param playerItems 플레이어 아이템 (선택사항)
   */
  runBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemy: EnemyState,
    anomalyId?: string | { id: string; level?: number }[],
    cardEnhancements?: Record<string, number>,
    playerItems?: string[]
  ): BattleResult {
    this.events = [];

    // 보스 페이즈 추적 초기화
    this.lastBossPhase = null;

    // 카드 강화 초기화
    this.cardEnhancements = cardEnhancements || {};
    this.enhancedCards = {};

    // 강화된 카드 캐시 생성
    this.buildEnhancedCardCache();

    // 플레이어 초기화
    const player = this.initializePlayer(playerDeck, playerRelics, playerItems);

    // 상징 초기화
    if (this.config.enableRelics) {
      this.relicSystem.initializeRelics(playerRelics);
      this.applyPassiveRelics(player);
    }

    // 아이템 시스템 초기화
    if (this.config.enableItems) {
      this.itemSystem.resetBattleState();
    }

    // 이변 초기화 (기존 시뮬레이터 이변)
    // mapRisk 0-4 → anomalyLevel 1-5
    const baseAnomalyLevel = Math.min(5, Math.max(1, Math.floor(this.config.mapRisk) + 1));
    let primaryAnomalyId: string | undefined;

    if (this.config.enableAnomalies && anomalyId) {
      const anomalySystem = getAnomalySystem();
      anomalySystem.clear();
      clearGameAnomalies();

      if (typeof anomalyId === 'string') {
        // 단일 이변 (일반 전투)
        primaryAnomalyId = anomalyId;
        anomalySystem.activateAnomaly(anomalyId);
        activateGameAnomaly(anomalyId, baseAnomalyLevel);
      } else if (Array.isArray(anomalyId)) {
        // 다중 이변 (보스 전투)
        const anomalyConfigs = anomalyId.map(a => ({
          id: a.id,
          level: a.level ?? baseAnomalyLevel
        }));

        // 첫 번째 이변을 기본 시뮬레이터 이변으로 설정
        if (anomalyConfigs.length > 0) {
          primaryAnomalyId = anomalyConfigs[0].id;
          anomalySystem.activateAnomaly(anomalyConfigs[0].id);
        }

        // 게임 데이터 이변 다중 활성화
        activateMultipleGameAnomalies(anomalyConfigs);
      }
    }

    // 전투 상태 초기화 (적 상태 필드 보장)
    const state: GameBattleState = {
      player,
      enemy: {
        ...enemy,
        tokens: enemy.tokens || {},
        block: enemy.block || 0,
        maxHp: enemy.maxHp || enemy.hp,
        maxSpeed: enemy.maxSpeed || DEFAULT_MAX_SPEED,
      },
      turn: 0,
      phase: 'select',
      timeline: [],
      anomalyId: primaryAnomalyId,
      battleLog: [],
      playerDamageDealt: 0,
      enemyDamageDealt: 0,
      cardUsage: {},
      tokenUsage: {},
      tokenEffects: {},
      itemEffects: {},
      relicEffects: {},
      comboUsageCount: {},
    };

    // 이변 효과 요약 로깅 (전투 시작 시)
    if (this.config.enableAnomalies) {
      const anomalyCount = getActiveAnomalyCount();
      if (anomalyCount > 0) {
        const anomalySummary = getActiveAnomalyDetailedSummary();
        for (const line of anomalySummary) {
          state.battleLog.push(line);
        }
      }
    }

    // 전투 시작 트리거
    this.emitEvent('battle_start', 0, { playerHp: player.hp, enemyHp: enemy.hp });
    if (this.config.enableRelics) {
      const startEffects = this.relicSystem.processCombatStart(player, enemy);
      this.applyRelicEffects(state, startEffects);
    }

    // 적 전투 시작 패시브
    const enemyStartPassives = processEnemyBattleStartPassives(state);
    for (const result of enemyStartPassives) {
      if (result.triggered) {
        for (const effect of result.effects) {
          state.battleLog.push(`👹 적 패시브: ${effect}`);
        }
      }
    }

    // 덱 셔플
    this.shuffle(state.player.deck);
    this.shuffle(state.enemy.deck);

    // 초기 핸드 드로우
    this.drawCards(state.player, DEFAULT_HAND_SIZE, state);

    // 전투 루프
    while (state.turn < this.config.maxTurns && state.player.hp > 0 && state.enemy.hp > 0) {
      state.turn++;
      this.executeTurn(state);
    }

    // 전투 종료
    const result = this.finalizeBattle(state);

    // 전투 종료 트리거
    if (this.config.enableRelics) {
      const endEffects = this.relicSystem.processCombatEnd(state.player, state.enemy);
      this.applyRelicEffects(state, endEffects);
    }

    return result;
  }

  // ==================== 턴 실행 ====================

  private executeTurn(state: GameBattleState): void {
    state.battleLog.push(`\n=== 턴 ${state.turn} ===`);
    this.emitEvent('turn_start', state.turn, { playerHp: state.player.hp, enemyHp: state.enemy.hp });

    // 턴 시작 초기화
    state.player.block = 0;
    state.enemy.block = 0;
    // 에너지 계산: 기본 + 토큰 수정 - 이변 감소
    const energyReduction = this.config.enableAnomalies ? getEnergyReduction() : 0;
    state.player.energy = Math.max(0, state.player.maxEnergy + calculateEnergyModifier(state.player.tokens) - energyReduction);
    state.timeline = [];

    // 이변: 공격/방어 감소 토큰 적용
    if (this.config.enableAnomalies) {
      const valueDownTokens = getValueDownTokens();
      if (valueDownTokens > 0) {
        this.addTokenTracked(state, state.player, 'dull', valueDownTokens);
        this.addTokenTracked(state, state.player, 'shaken', valueDownTokens);
        state.battleLog.push(`  ⚠️ 이변: 공격력/방어력 감소 토큰 ${valueDownTokens}개`);
      }

      // 이변: 통찰 감소
      const insightReduction = getInsightReduction();
      if (insightReduction > 0) {
        state.player.insight = Math.max(-3, state.player.insight - insightReduction);
      }
    }

    // 턴 시작 상징 트리거
    if (this.config.enableRelics) {
      const turnStartEffects = this.relicSystem.processTurnStart(state.player, state.enemy, state.turn);
      this.applyRelicEffects(state, turnStartEffects);
    }

    // 적 턴 시작 패시브 (회복, 힘 증가 등)
    const enemyTurnPassives = processEnemyTurnStartPassives(state);
    for (const result of enemyTurnPassives) {
      if (result.triggered) {
        for (const effect of result.effects) {
          state.battleLog.push(`👹 ${effect}`);
        }
      }
    }

    // 50% HP 소환 패시브 체크
    const summonResult = checkAndProcessSummonPassive(state);
    if (summonResult.triggered) {
      for (const effect of summonResult.effects) {
        state.battleLog.push(`⚔️ ${effect}`);
      }
    }

    // 화상 피해
    const burnResult = processBurn(state.player.tokens);
    if (burnResult.damage > 0) {
      state.player.hp -= burnResult.damage;
      state.battleLog.push(`🔥 화상 피해: ${burnResult.damage}`);
      // 화상 피해량 추적 (부정적 토큰이므로 피해를 기록)
      if (state.tokenEffects) {
        this.recordEffectValue(state.tokenEffects, 'burn', { damage: burnResult.damage });
      }
    }

    if (state.player.hp <= 0 || state.enemy.hp <= 0) return;

    // 1단계: 카드 선택 (선택 단계)
    state.phase = 'select';
    const playerCards = this.selectPlayerCards(state);
    const enemyCards = this.selectEnemyCards(state);

    // 2단계: 타임라인 배치
    this.placeCardsOnTimeline(state, playerCards, enemyCards);

    // 타임라인 반복 처리 (르 송쥬 뒤 비에야르)
    if (state.player.repeatTimelineCards && state.player.repeatTimelineCards.length > 0) {
      for (const cardId of state.player.repeatTimelineCards) {
        const card = this.getCard(cardId);
        if (card) {
          const position = this.calculateCardPosition(card, state.player.tokens);
          state.timeline.push({
            cardId: card.id,
            owner: 'player',
            position,
            sp: position,  // 게임과 호환되는 sp 필드
            crossed: false,
            executed: false,
          });
        }
      }
      state.timeline.sort((a, b) => a.position - b.position);
      this.checkCrossings(state);
      state.battleLog.push(`  🔄 타임라인 반복: ${state.player.repeatTimelineCards.length}장 추가`);
      state.player.repeatTimelineCards = undefined;
    }

    // 3단계: 대응 단계 (선택적)
    state.phase = 'respond';
    this.executeRespondPhase(state)

    // 4단계: 타임라인 해결 (진행 단계)
    state.phase = 'resolve';
    this.resolveTimeline(state);

    // 5단계: 턴 종료
    state.phase = 'end';

    // 에테르 콤보 처리: 이번 턴에 실행된 플레이어 카드 수집
    // 이변: 디플레이션의 저주로 에테르 획득 불가 체크
    const etherBlockedByAnomaly = this.config.enableAnomalies && isEtherBlocked();
    if (etherBlockedByAnomaly) {
      state.player.etherBlocked = true;
    }

    if (this.config.enableCombos && !etherBlockedByAnomaly) {
      const playedCards = state.timeline
        .filter(tc => tc.owner === 'player' && tc.executed)
        .map(tc => this.getCard(tc.cardId))
        .filter((c): c is GameCard => c !== undefined);

      if (playedCards.length > 0) {
        const etherResult = processTurnEndEther(state, playedCards);

        // 에테르 획득
        if (etherResult.etherResult.finalGain > 0) {
          state.player.ether += etherResult.etherResult.finalGain;
          state.battleLog.push(`  ⚡ 에테르 +${etherResult.etherResult.finalGain} (${etherResult.etherResult.comboName})`);

          // 콤보 상징 효과 (에테르 결정, 포커칩, 목장갑, 총알 등)
          if (this.config.enableRelics) {
            const comboEffects = this.relicSystem.processCombo(
              state.player,
              etherResult.etherResult.comboName,
              etherResult.etherResult.finalGain,
              etherResult.etherResult.comboRank || 0
            );
            this.applyRelicEffects(state, comboEffects);
          }

          // 버스트 발동 시
          if (etherResult.burstResult.triggered) {
            state.battleLog.push(`  ${etherResult.burstResult.message}`);

            // 버스트 보너스 피해 적용
            if (etherResult.burstResult.bonusDamage > 0) {
              state.enemy.hp -= etherResult.burstResult.bonusDamage;
              state.playerDamageDealt = (state.playerDamageDealt || 0) + etherResult.burstResult.bonusDamage;
              state.battleLog.push(`  💥 버스트 피해: ${etherResult.burstResult.bonusDamage}`);
            }

            // 에테르 리셋 (버스트 후 남은 양)
            state.player.ether = 0;
          }
        }

        // 콤보 사용 횟수 업데이트 (디플레이션용)
        state.comboUsageCount = etherResult.newComboUsageCount;
      }
    } else if (etherBlockedByAnomaly) {
      state.battleLog.push(`  ❌ 이변: 에테르 획득 불가`);
    }

    // 타임라인 반복 저장 (르 송쥬 뒤 비에야르)
    if (state.player.repeatTimelineNext) {
      state.player.repeatTimelineCards = state.timeline
        .filter(tc => tc.owner === 'player' && tc.executed)
        .map(tc => tc.cardId);
      state.player.repeatTimelineNext = false;
      if (state.player.repeatTimelineCards.length > 0) {
        state.battleLog.push(`  🔄 타임라인 ${state.player.repeatTimelineCards.length}장 저장`);
      }
    }

    // 카드 실행당 방어력 초기화
    state.player.blockPerCardExecution = undefined;

    // 핸드 버리기 및 드로우
    state.player.discard.push(...state.player.hand);
    state.player.hand = [];
    this.drawCards(state.player, DEFAULT_HAND_SIZE, state);

    // 턴 종료 토큰 처리
    state.player.tokens = processTurnEnd(state.player.tokens);
    state.enemy.tokens = processTurnEnd(state.enemy.tokens);

    // 배틀왈츠 Lv1: 기교 최소 1 유지
    if (state.growthBonuses?.logosEffects?.minFinesse) {
      state.player.tokens = enforceMinFinesse(state.player.tokens, 1);
    }

    // 턴 종료 상징 트리거
    if (this.config.enableRelics) {
      const turnEndEffects = this.relicSystem.processTurnEnd(state.player, state.enemy, state.turn);
      this.applyRelicEffects(state, turnEndEffects);
    }

    this.emitEvent('turn_end', state.turn, { playerHp: state.player.hp, enemyHp: state.enemy.hp });
  }

  // ==================== 대응 단계 ====================

  private executeRespondPhase(state: GameBattleState): void {
    // 아이템 사용 (대응단계에서 전투용 아이템 사용)
    if (this.config.enableItems && state.player.items && state.player.items.length > 0) {
      this.processItemUsage(state, 'respond');
    }

    // 타임라인 분석
    const analysis = this.respondAI.analyzeTimeline(state);

    if (this.config.verbose) {
      state.battleLog.push(`📊 타임라인 분석: 예상 피해 ${analysis.expectedDamage}, 위험도 ${analysis.riskScore}%`);
    }

    // 플레이어 대응 결정 (강화된 카드 적용)
    const playerHand = state.player.hand
      .map(id => this.getCard(id))
      .filter((c): c is GameCard => c !== undefined);

    const reactionCards = playerHand.filter(card =>
      card.type === 'reaction' ||
      card.priority === 'instant' ||
      card.traits?.includes('counter') ||
      card.traits?.includes('counterShot')
    );

    if (reactionCards.length > 0 && analysis.riskScore >= 30) {
      const decision = this.respondAI.decideResponse(state, reactionCards);

      if (decision.shouldRespond) {
        // 스킬 레벨 AI로 대응 결정 수정 (optimal이 아닌 경우)
        let actuallyRespond = decision.shouldRespond;
        if (this.config.skillLevel !== 'optimal') {
          actuallyRespond = this.skillLevelAI.decideRespond(state, decision.shouldRespond);
          if (!actuallyRespond && this.config.verbose) {
            state.battleLog.push(`  ⚠️ 플레이어: 대응 타이밍 놓침`);
          }
        }

        if (actuallyRespond) {
          this.applyPlayerResponse(state, decision);
        }
      }
    }

    // 적 대응 (단순화)
    const enemyDecision = this.respondAI.decideEnemyResponse(state);
    if (enemyDecision.shouldRespond) {
      this.applyEnemyResponse(state, enemyDecision);
    }

    // 교차 재계산
    this.checkCrossings(state);
  }

  /**
   * 아이템 사용 처리
   */
  private processItemUsage(state: GameBattleState, phase: string): void {
    if (!state.player.items || state.player.items.length === 0) return;

    // AI가 사용할 아이템 선택
    const itemToUse = this.itemSystem.selectItemToUse(
      state.player.items,
      state.player,
      state.enemy,
      phase
    );

    if (itemToUse) {
      const result = this.itemSystem.useItem(itemToUse, state.player, state.enemy, state);
      if (result) {
        // 아이템 효과 적용
        applyItemEffect(result, state.player, state.enemy, state);

        // 아이템 인벤토리에서 제거
        const itemIndex = state.player.items.indexOf(itemToUse);
        if (itemIndex >= 0) {
          state.player.items.splice(itemIndex, 1);
        }

        // 로그
        const item = this.itemSystem.getItem(itemToUse);
        state.battleLog.push(`  📦 ${item?.icon || '🎁'} ${result.itemName} 사용: ${result.effects.message}`);
      }
    }
  }

  private applyPlayerResponse(state: GameBattleState, decision: ResponseDecision): void {
    for (const cardId of decision.responseCards) {
      const card = this.getCard(cardId);
      if (!card) continue;

      // 핸드에서 카드 제거 → 버린 카드 더미로 이동
      const handIndex = state.player.hand.indexOf(cardId);
      if (handIndex >= 0) {
        state.player.hand.splice(handIndex, 1);
        state.player.discard.push(cardId);
      }

      // 타임라인에 추가 (즉발 카드는 position 0, 그 외는 특성 반영)
      const position = card.priority === 'instant'
        ? 0
        : this.calculateCardPosition(card, state.player.tokens);

      state.timeline.push({
        cardId: card.id,
        owner: 'player',
        position,
        sp: position,  // 게임과 호환되는 sp 필드
        crossed: false,
        executed: false,
      });

      state.battleLog.push(`⚡ 대응: ${card.name} 사용 (위치: ${position})`);
    }

    // 타임라인 재정렬
    state.timeline.sort((a, b) => a.position - b.position);
  }

  private applyEnemyResponse(state: GameBattleState, decision: ResponseDecision): void {
    // 적 대응 처리 (현재는 단순화됨)
    for (const cardId of decision.responseCards) {
      const card = this.cards[cardId];
      if (!card) continue;

      const position = card.priority === 'instant'
        ? 0
        : this.calculateCardPosition(card, state.enemy.tokens);

      state.timeline.push({
        cardId: card.id,
        owner: 'enemy',
        position,
        sp: position,  // 게임과 호환되는 sp 필드
        crossed: false,
        executed: false,
      });

      state.battleLog.push(`⚡ 적 대응: ${card.name}`);
    }

    state.timeline.sort((a, b) => a.position - b.position);
  }

  // ==================== 카드 선택 (개선된 AI - v2) ====================

  private selectPlayerCards(state: GameBattleState): GameCard[] {
    const selected: GameCard[] = [];
    let energyLeft = state.player.energy;
    let cardsSelected = 0;
    const maxCards = DEFAULT_MAX_SUBMIT_CARDS;

    // 핸드 카드 변환 (강화된 카드 적용)
    const handCards = state.player.hand
      .map(id => this.getCard(id))
      .filter((c): c is GameCard => c !== undefined);

    if (handCards.length === 0) return selected;

    // 상황 분석
    const playerHpRatio = state.player.hp / state.player.maxHp;
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;
    const isInDanger = playerHpRatio < 0.35;
    const isBossFight = state.enemy.isBoss === true;
    const isLowEnemyHp = enemyHpRatio < 0.25;
    const canKillEnemy = this.estimateDamageOutput(handCards, state) >= state.enemy.hp;
    const needsDefense = isInDanger && !canKillEnemy;

    // 에테르 상태 분석
    const currentEther = state.player.ether || 0;
    const nearBurst = currentEther >= 80;  // 에테르 버스트 가까움
    const canBurst = currentEther >= 100;

    // 포커 조합 분석 (카드 값 기준)
    const comboAnalysis = this.analyzePokerCombos(handCards);

    // 크로스 보너스 분석
    const crossBonusCards = handCards.filter(c => c.crossBonus);

    // 카드 점수 계산
    const scoredCards = handCards.map(card => {
      let score = 0;

      // 1. 기본 효율 점수 (피해 + 방어)
      const hits = card.hits || 1;
      const totalDamage = (card.damage || 0) * hits;
      const totalBlock = card.block || 0;

      // 2. 보스전 특화 전략
      if (isBossFight) {
        // 보스전에서는 공격 가중치 증가
        if (canKillEnemy || isLowEnemyHp) {
          // 마무리 가능: 공격 최우선
          score += totalDamage * 3;
          score += totalBlock * 0.2;
        } else if (needsDefense) {
          // 위험하지만 방어도 필요
          score += totalBlock * 2;
          score += totalDamage * 1.0;
        } else {
          // 보스전 일반 상황: 공격 우선
          score += totalDamage * 1.8;
          score += totalBlock * 0.6;
        }

        // 보스전에서 다단히트 카드 높은 가치
        if (hits > 1) {
          score += hits * 10;
        }

        // 보스전에서 debuff 카드 가치 상승
        if (card.appliedTokens) {
          for (const tokenEntry of card.appliedTokens) {
            if (tokenEntry.id === 'vulnerable' || tokenEntry.id === 'weak' || tokenEntry.id === 'burn') {
              score += (tokenEntry.stacks ?? 1) * 10;
            }
          }
        }
      } else {
        // 일반전 기존 로직
        if (needsDefense) {
          score += totalBlock * 3;
          score += totalDamage * 0.5;
          if (card.tags?.includes('heal') || (Array.isArray(card.effects) && card.effects.some((e: { type?: string }) => e.type === 'heal'))) {
            score += 50;
          }
        } else if (canKillEnemy) {
          score += totalDamage * 2;
          score += totalBlock * 0.3;
        } else {
          score += totalDamage * 1.2;
          score += totalBlock * 0.8;
        }
      }

      // 3. 크로스 보너스 점수 (매우 중요)
      if (card.crossBonus) {
        const cb = card.crossBonus;
        // 현재 핸드에 크로스 조건을 충족하는 카드가 있는지 확인
        const hasCrossPartner = handCards.some(other => {
          if (other.id === card.id) return false;
          // 조건 확인: 숫자/문양/카테고리 일치
          if (cb.condition === 'sameNumber') {
            return this.getCardValue(other) === this.getCardValue(card);
          }
          if (cb.condition === 'sameSuit') {
            return other.suit === card.suit;
          }
          if (cb.condition === 'sameCategory') {
            return other.cardCategory === card.cardCategory;
          }
          return false;
        });

        if (hasCrossPartner) {
          // 크로스 보너스 발동 가능! 높은 점수
          const bonusDamage = cb.damage || 0;
          const bonusBlock = cb.block || 0;
          score += (bonusDamage + bonusBlock) * 2;
          score += 30; // 크로스 시너지 기본 보너스
        }
      }

      // 크로스 파트너인 경우에도 점수 추가
      for (const crossCard of crossBonusCards) {
        if (crossCard.id === card.id) continue;
        const cb = crossCard.crossBonus!;
        const isPartner = (() => {
          if (cb.condition === 'sameNumber') {
            return this.getCardValue(card) === this.getCardValue(crossCard);
          }
          if (cb.condition === 'sameSuit') {
            return card.suit === crossCard.suit;
          }
          if (cb.condition === 'sameCategory') {
            return card.cardCategory === crossCard.cardCategory;
          }
          return false;
        })();
        if (isPartner) {
          score += 25; // 크로스 파트너 보너스
        }
      }

      // 4. 에테르/버스트 전략
      if (nearBurst || canBurst) {
        // 에테르 버스트 가까우면 에테르 소비 카드 우선
        if (card.tags?.includes('ether') || card.special === 'etherBurst') {
          score += 40;
        }
      } else {
        // 에테르 축적을 위한 포커 조합 보너스 강화
        const cardValue = this.getCardValue(card);
        if (cardValue) {
          const sameValueCount = comboAnalysis.valueCount[cardValue] || 0;
          if (sameValueCount >= 2) {
            score += (sameValueCount - 1) * 25; // 페어, 트리플 보너스 강화
          }
          if (comboAnalysis.straightPossible && comboAnalysis.straightCards.includes(card.id)) {
            score += 30;
          }
        }
      }

      // 5. 속도 점수 (빠른 카드 선호)
      const speedCost = card.speedCost || 5;
      if (isBossFight) {
        // 보스전에서 속도 더 중요
        score += (12 - Math.min(12, speedCost)) * 3;
      } else {
        score += (10 - Math.min(10, speedCost)) * 2;
      }

      // 6. 버프/디버프 카드 점수
      if (card.effects && Array.isArray(card.effects)) {
        for (const effect of card.effects) {
          if (effect.token === 'vulnerable' || effect.token === 'weak') {
            score += isBossFight ? 25 : 15;
          }
          if (effect.token === 'strength' && effect.target === 'self') {
            score += isBossFight ? 30 : 20;
          }
        }
      }

      // 7. 특수 효과 점수
      if (card.type === 'attack') {
        if (card.tags?.includes('pierce') || card.ignoreBlock) {
          score += isBossFight ? 25 : 15;
        }
        if (hits > 1) {
          score += hits * 5;
        }
      }

      // 8. 특성 시너지 점수
      if (card.traits && card.traits.length > 0) {
        // 연계(chain) 특성
        if (card.traits.includes('chain')) {
          const hasFollowup = handCards.some(c =>
            c.traits?.includes('followup') || c.traits?.includes('finisher')
          );
          if (hasFollowup) {
            score += isBossFight ? 35 : 25;
          }
        }

        // 후속(followup) 특성
        if (card.traits.includes('followup') || card.traits.includes('finisher')) {
          const hasChain = handCards.some(c => c.traits?.includes('chain'));
          if (hasChain) {
            score += isBossFight ? 30 : 20;
          }
          if (hasToken(state.player.tokens, 'chain_ready')) {
            score += 40;
          }
        }

        // 협동(cooperation) 특성
        if (card.traits.includes('cooperation')) {
          const sameActionCost = handCards.filter(c =>
            c.actionCost === card.actionCost && c.id !== card.id
          ).length;
          score += sameActionCost * 12;
        }

        // 공격 증폭 특성
        if (card.traits.includes('strongbone')) score += 15;
        if (card.traits.includes('destroyer')) score += 20;
        if (card.traits.includes('slaughter')) score += 30;
        if (card.traits.includes('pinnacle')) score += 45;
        if (card.traits.includes('swift')) score += 12;
        if (card.traits.includes('training')) score += 15;
      }

      // 9. 에너지 효율 (코스트 대비 효과)
      const cost = card.actionCost || 1;
      if (cost > 0) {
        // 보스전에서는 효율보다 원판 효과 우선
        const efficiencyPenalty = isBossFight ? Math.pow(cost, 0.3) : Math.sqrt(cost);
        score = score / efficiencyPenalty;
      }

      return { card, score, cost };
    });

    // 점수순 정렬
    scoredCards.sort((a, b) => b.score - a.score);

    // 크로스 보너스 최적화: 쌍으로 선택
    const selectedIds = new Set<string>();
    for (const { card, cost } of scoredCards) {
      if (cardsSelected >= maxCards) break;
      if (cost > energyLeft) continue;
      if (selectedIds.has(card.id)) continue;

      selected.push(card);
      selectedIds.add(card.id);
      energyLeft -= cost;
      cardsSelected++;

      // 크로스 파트너가 있으면 함께 선택 시도
      if (card.crossBonus) {
        const cb = card.crossBonus;
        const partner = scoredCards.find(({ card: other }) => {
          if (selectedIds.has(other.id)) return false;
          if ((other.actionCost || 1) > energyLeft) return false;
          if (cb.condition === 'sameNumber') {
            return this.getCardValue(other) === this.getCardValue(card);
          }
          if (cb.condition === 'sameSuit') {
            return other.suit === card.suit;
          }
          if (cb.condition === 'sameCategory') {
            return other.cardCategory === card.cardCategory;
          }
          return false;
        });

        if (partner && cardsSelected < maxCards) {
          selected.push(partner.card);
          selectedIds.add(partner.card.id);
          energyLeft -= partner.cost;
          cardsSelected++;
        }
      }
    }

    // 최소 1장은 선택 (에너지가 충분하다면)
    if (selected.length === 0 && handCards.length > 0) {
      const cheapest = handCards
        .filter(c => (c.actionCost || 1) <= state.player.energy)
        .sort((a, b) => (a.actionCost || 1) - (b.actionCost || 1))[0];
      if (cheapest) {
        selected.push(cheapest);
      }
    }

    // 스킬 레벨 AI 적용 (optimal이 아닌 경우 실수 가능)
    if (this.config.skillLevel !== 'optimal' && selected.length > 0) {
      const optimalCardIds = selected.map(c => c.id);
      const decision = this.skillLevelAI.selectCards(state, optimalCardIds);

      if (!decision.wasOptimal) {
        // 실수가 발생한 경우 로그
        if (this.config.verbose && decision.reasoning.length > 0) {
          state.battleLog.push(`  ⚠️ 플레이어 실수: ${decision.reasoning.join(', ')}`);
        }

        // 스킬 레벨에 맞게 선택된 카드로 교체
        const newSelected = decision.selectedCards
          .map(id => handCards.find(c => c.id === id))
          .filter((c): c is GameCard => c !== undefined);

        if (newSelected.length > 0) {
          return newSelected;
        }
      }
    }

    return selected;
  }

  /**
   * 예상 피해량 계산
   */
  private estimateDamageOutput(cards: GameCard[], state: GameBattleState): number {
    let totalDamage = 0;
    let energy = state.player.energy;

    const attackCards = cards
      .filter(c => c.damage && c.damage > 0)
      .sort((a, b) => ((b.damage || 0) * (b.hits || 1)) - ((a.damage || 0) * (a.hits || 1)));

    for (const card of attackCards) {
      const cost = card.actionCost || 1;
      if (cost <= energy) {
        const hits = card.hits || 1;
        const damage = (card.damage || 0) * hits;
        // 힘 보정
        totalDamage += damage + (state.player.strength || 0) * hits;
        energy -= cost;
      }
    }

    return totalDamage;
  }

  /**
   * 포커 조합 분석
   */
  private analyzePokerCombos(cards: GameCard[]): {
    valueCount: Record<string, number>;
    suitCount: Record<string, number>;
    straightPossible: boolean;
    straightCards: string[];
  } {
    const valueCount: Record<string, number> = {};
    const suitCount: Record<string, number> = {};
    const values: number[] = [];

    for (const card of cards) {
      const cardValue = this.getCardValue(card);
      if (cardValue) {
        valueCount[cardValue] = (valueCount[cardValue] || 0) + 1;
        values.push(parseInt(cardValue) || this.cardValueToNumber(cardValue));
      }

      const suit = card.suit || 'none';
      suitCount[suit] = (suitCount[suit] || 0) + 1;
    }

    // 스트레이트 가능성 체크
    values.sort((a, b) => a - b);
    let straightPossible = false;
    const straightCards: string[] = [];

    if (values.length >= 3) {
      for (let i = 0; i < values.length - 2; i++) {
        if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
          straightPossible = true;
          // 해당하는 카드 ID 찾기
          for (const card of cards) {
            const v = parseInt(this.getCardValue(card) || '') || this.cardValueToNumber(this.getCardValue(card) || '');
            if (v >= values[i] && v <= values[i] + 2) {
              straightCards.push(card.id);
            }
          }
          break;
        }
      }
    }

    return { valueCount, suitCount, straightPossible, straightCards };
  }

  /**
   * 카드의 포커 값 가져오기
   */
  private getCardValue(card: GameCard): string | null {
    // 카드의 value 속성이 있으면 사용
    if (card.value) {
      return String(card.value);
    }

    // 카드 이름에서 값 추출 (예: "Strike 5" → "5")
    const match = card.name.match(/(\d+|[JQKA])$/);
    if (match) {
      return match[1];
    }

    // 카드 ID에서 값 추출
    const idMatch = card.id.match(/_(\d+|[jqka])$/i);
    if (idMatch) {
      return idMatch[1].toUpperCase();
    }

    return null;
  }

  /**
   * 카드 값을 숫자로 변환 (스트레이트 계산용)
   */
  private cardValueToNumber(value: string): number {
    switch (value.toUpperCase()) {
      case 'A': return 14;
      case 'K': return 13;
      case 'Q': return 12;
      case 'J': return 11;
      default: return parseInt(value) || 0;
    }
  }

  private selectEnemyCards(state: GameBattleState): GameCard[] {
    const selected: GameCard[] = [];

    // 보스 페이즈 시스템 사용 (보스인 경우)
    if (state.enemy.isBoss && state.enemy.id) {
      // 보스 패턴이 정의되어 있는 경우
      if (BOSS_PATTERNS[state.enemy.id]) {
        const hpRatio = state.enemy.hp / state.enemy.maxHp;
        const playerHpRatio = state.player.hp / state.player.maxHp;

        // 페이즈 변경 감지
        const currentPhase = getBossPhase(state.enemy.id, hpRatio);
        const phaseChanged = this.lastBossPhase !== null && this.lastBossPhase !== currentPhase;
        if (phaseChanged) {
          log.info(`보스 페이즈 변경: ${this.lastBossPhase} → ${currentPhase}`);
          state.battleLog.push(`⚠️ 보스 페이즈 변경: ${currentPhase}`);
        }
        this.lastBossPhase = currentPhase;

        // 보스 특수 행동 체크
        const specialActions = checkBossSpecialActions(state.enemy.id, {
          hpRatio,
          turn: state.turn,
          playerHpRatio,
          phaseChanged,
        });

        // 특수 행동 로그
        for (const action of specialActions) {
          log.info(`보스 특수 행동: ${action.name} - ${action.effect.description}`);
          state.battleLog.push(`⚡ ${action.name}: ${action.effect.description}`);
        }

        // 보스 AI 카드 선택
        const decision = selectBossCards(
          state.enemy.id,
          state.enemy,
          state.player,
          this.cards,
          state.turn
        );

        return decision.selectedCards;
      }
    }

    // 일반 적 AI 로직
    const cardsToPlay = state.enemy.cardsPerTurn;

    // 가용 카드 목록 생성
    const availableCards: GameCard[] = [];
    for (const cardId of state.enemy.deck) {
      const card = this.cards[cardId];
      if (card) {
        availableCards.push(card);
      }
    }

    if (availableCards.length === 0) {
      return selected;
    }

    // AI 카드 선택 로직
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;
    const playerHpRatio = state.player.hp / state.player.maxHp;

    // EnemyAI 클래스 사용 (개선된 AI)
    // 기본 패턴 결정
    let pattern = getPatternForEnemy(state.enemy.id || 'unknown');

    // HP에 따른 패턴 조정
    pattern = getPatternModifierByHp(pattern, enemyHpRatio);

    // AI 생성 및 카드 선택
    const ai = createEnemyAI(this.cards, pattern);
    const decision = ai.selectCards(state.enemy, state.player, state.enemy.deck, cardsToPlay);

    return decision.selectedCards;
  }

  // ==================== 타임라인 배치 ====================

  private calculateCardPosition(card: GameCard, tokens: TokenState, state?: GameBattleState): number {
    let position = card.speedCost || 5;

    // 토큰에 의한 속도 수정
    const speedMod = calculateSpeedModifier(tokens);
    position += speedMod;

    // 특성에 의한 속도 수정
    if (card.traits) {
      for (const traitId of card.traits) {
        switch (traitId) {
          case 'swift':
            position -= 2;
            break;
          case 'slow':
            position += 3;
            break;
          case 'last':
            // 마지막 특성: 최대 속도 위치에 배치
            position = this.config.maxSpeed;
            break;
          case 'leisure':
            // 여유 특성: 카드 속도의 1~2배 범위 내 최적 위치 선택 (AI)
            // 교차 보너스가 있거나 적 공격 카드와 교차할 수 있는 위치를 우선
            const cardBaseSp = card.speedCost || 5;
            const leisureMin = cardBaseSp;
            const leisureMax = cardBaseSp * 2;
            const leisureDefault = Math.floor((leisureMin + leisureMax) / 2);

            if (state && state.timeline.length > 0) {
              // 카드에 교차 보너스가 있는지 확인
              const hasCrossBonus = !!card.crossBonus;

              // 적 카드 정보 수집 (공격 카드 위치 우선)
              const enemyCards = state.timeline
                .filter(tc => tc.owner === 'enemy')
                .map(tc => {
                  const enemyCard = this.cards[tc.cardId];
                  return {
                    position: tc.position,
                    isAttack: enemyCard?.type === 'attack' && (enemyCard?.damage || 0) > 0,
                  };
                });

              // 교차 가능한 위치 찾기 (카드 속도 ~ 2배 범위)
              let bestPos = leisureDefault;
              let foundCross = false;

              for (let p = leisureMin; p <= leisureMax; p++) {
                const enemyAtPos = enemyCards.find(e => e.position === p);
                if (enemyAtPos) {
                  // 교차 보너스가 있으면 무조건 교차
                  if (hasCrossBonus) {
                    bestPos = p;
                    foundCross = true;
                    break;
                  }
                  // 적 공격 카드와 교차하면 선공 효과
                  if (enemyAtPos.isAttack) {
                    bestPos = p;
                    foundCross = true;
                    break;
                  }
                }
              }

              // 교차할 이유가 없으면 기본 위치 사용
              position = foundCross ? bestPos : leisureDefault;
            } else {
              position = leisureDefault;
            }
            break;
        }
      }
    }

    // 이변: 속도 불안정 (랜덤 변동)
    if (this.config.enableAnomalies) {
      const instability = getSpeedInstability();
      if (instability > 0) {
        const variation = Math.floor(Math.random() * (instability * 2 + 1)) - instability;
        position += variation;
      }
    }

    // 최대 속도 제한 (이변에 의한 감소 적용)
    const maxSpeedReduction = this.config.enableAnomalies ? getSpeedReduction() : 0;
    const effectiveMaxSpeed = Math.max(10, this.config.maxSpeed - maxSpeedReduction);

    return Math.max(1, Math.min(position, effectiveMaxSpeed));
  }

  /**
   * 무리(strain) 특성 AI 결정: 행동력을 사용해 속도를 앞당길지 결정
   * 개선: 교차 보너스가 있거나 적 공격 카드와 교차할 때만 앞당김
   */
  private applyStrainTrait(card: GameCard, basePosition: number, state: GameBattleState): number {
    if (!card.traits?.includes('strain')) return basePosition;
    if (state.player.energy < 1) return basePosition;

    // 카드에 교차 보너스가 있는지 확인
    const hasCrossBonus = !!card.crossBonus;

    // 적 카드 정보 수집
    const enemyCards = state.timeline
      .filter(tc => tc.owner === 'enemy')
      .map(tc => {
        const enemyCard = this.cards[tc.cardId];
        return {
          position: tc.position,
          isAttack: enemyCard?.type === 'attack' && (enemyCard?.damage || 0) > 0,
          damage: enemyCard?.damage || 0,
        };
      });

    // 최대 3까지 앞당김 가능
    const maxAdvance = Math.min(3, state.player.energy);

    // 교차 가능한 위치 찾기
    for (let advance = 1; advance <= maxAdvance; advance++) {
      const newPos = basePosition - advance;
      if (newPos < 1) continue;

      const enemyAtPos = enemyCards.find(e => e.position === newPos);
      if (enemyAtPos) {
        // 교차 보너스가 있으면 무조건 앞당김
        if (hasCrossBonus) {
          state.player.energy -= 1;
          state.battleLog.push(`  ⚡ 무리: 교차 보너스 활용을 위해 속도 ${advance} 앞당김 (행동력 -1)`);
          return newPos;
        }
        // 적 공격 카드와 교차하면 선공 효과
        if (enemyAtPos.isAttack) {
          state.player.energy -= 1;
          state.battleLog.push(`  ⚡ 무리: 적 공격 선취를 위해 속도 ${advance} 앞당김 (행동력 -1)`);
          return newPos;
        }
      }
    }

    // 교차 불가능해도, 공격 카드이고 적 체력이 낮으면 1 앞당김 (마무리 시도)
    if (card.type === 'attack' && state.player.energy >= 1 && state.enemy.hp <= 30) {
      state.player.energy -= 1;
      state.battleLog.push(`  ⚡ 무리: 마무리를 위해 속도 1 앞당김 (행동력 -1)`);
      return basePosition - 1;
    }

    return basePosition;
  }

  private placeCardsOnTimeline(state: GameBattleState, playerCards: GameCard[], enemyCards: GameCard[]): void {
    state.timeline = [];

    // 플레이어 카드 배치 전 콤보 감지 (협동 특성용)
    if (playerCards.length > 0) {
      const comboResult = detectPokerCombo(playerCards);
      state.currentComboRank = comboResult.rank;
      state.currentComboKeys = comboResult.bonusKeys || new Set();
    } else {
      state.currentComboRank = 0;
      state.currentComboKeys = new Set();
    }

    // 적 카드 먼저 배치 (여유/무리 특성 AI가 적 위치를 참고하기 위해)
    for (const card of enemyCards) {
      const position = this.calculateCardPosition(card, state.enemy.tokens);
      state.timeline.push({
        cardId: card.id,
        owner: 'enemy',
        position,
        sp: position,  // 게임과 호환되는 sp 필드
        crossed: false,
        executed: false,
      });
    }

    // 플레이어 카드 배치 (여유/무리 특성 적용)
    for (const card of playerCards) {
      let position = this.calculateCardPosition(card, state.player.tokens, state);

      // 무리(strain) 특성: 행동력을 사용해 속도 앞당김
      position = this.applyStrainTrait(card, position, state);

      state.timeline.push({
        cardId: card.id,
        owner: 'player',
        position,
        sp: position,  // 게임과 호환되는 sp 필드
        crossed: false,
        executed: false,
      });

      // 핸드에서 제거 → 버린 카드 더미로 이동
      const handIndex = state.player.hand.indexOf(card.id);
      if (handIndex >= 0) {
        state.player.hand.splice(handIndex, 1);
        state.player.discard.push(card.id);
      }
    }

    // 위치순 정렬
    state.timeline.sort((a, b) => a.position - b.position);

    // 교차 체크
    this.checkCrossings(state);
  }

  private checkCrossings(state: GameBattleState): void {
    // SP별 플레이어/적 존재 여부 추적 (게임 로직과 동일)
    const spFlags = new Map<number, { hasPlayer: boolean; hasEnemy: boolean }>();

    for (const card of state.timeline) {
      // sp 필드 우선 사용, 없으면 position 사용
      const sp = Math.floor(card.sp ?? card.position);
      let flags = spFlags.get(sp);
      if (!flags) {
        flags = { hasPlayer: false, hasEnemy: false };
        spFlags.set(sp, flags);
      }
      if (card.owner === 'player') flags.hasPlayer = true;
      else flags.hasEnemy = true;
    }

    // 교차 범위 확장 (로고스 효과)
    const crossRangeBonus = state.growthBonuses?.crossRangeBonus || 0;

    // 특정 SP에서 교차 가능한지 확인 (게임과 동일한 로직)
    const isCrossedAtSp = (sp: number, owner: 'player' | 'enemy'): boolean => {
      const oppositeFlag = owner === 'player' ? 'hasEnemy' : 'hasPlayer';

      // 같은 SP에서 교차
      const flagsAtSp = spFlags.get(sp);
      if (flagsAtSp?.[oppositeFlag]) return true;

      // 확장 범위: ±crossRangeBonus (로고스 효과)
      if (crossRangeBonus > 0) {
        for (let offset = 1; offset <= crossRangeBonus; offset++) {
          if (spFlags.get(sp - offset)?.[oppositeFlag]) return true;
          if (spFlags.get(sp + offset)?.[oppositeFlag]) return true;
        }
      }

      return false;
    };

    // 교차 여부 마킹 (한 번 교차된 카드는 유지 - 게임과 동일)
    for (const card of state.timeline) {
      if (card.crossed) continue;  // 이미 교차된 카드는 유지
      const sp = Math.floor(card.sp ?? card.position);
      card.crossed = isCrossedAtSp(sp, card.owner);
    }
  }

  // ==================== 타임라인 해결 ====================

  private resolveTimeline(state: GameBattleState): void {
    // 위치순으로 카드 발동
    const sortedCards = [...state.timeline].sort((a, b) => a.position - b.position);

    for (const timelineCard of sortedCards) {
      if (state.player.hp <= 0 || state.enemy.hp <= 0) break;
      if (timelineCard.executed) continue;

      // 플레이어 카드는 강화 적용, 적 카드는 기본 카드 사용
      const card = timelineCard.owner === 'player'
        ? this.getCard(timelineCard.cardId)
        : this.cards[timelineCard.cardId];
      if (!card) continue;

      timelineCard.executed = true;

      if (timelineCard.owner === 'player') {
        this.executePlayerCard(state, card, timelineCard);
      } else {
        this.executeEnemyCard(state, card, timelineCard);
      }
    }
  }

  // ==================== 카드 실행 ====================

  private executePlayerCard(state: GameBattleState, card: GameCard, timelineCard: TimelineCard): void {
    this.emitEvent('card_execute', state.turn, { cardId: card.id, actor: 'player' });

    // 필요 토큰 확인 및 소모 (기교 등)
    const tokenCheck = checkAndConsumeRequiredTokens(state, card, 'player');
    if (!tokenCheck.canPlay) {
      state.battleLog.push(`  ❌ ${card.name}: 필요 토큰 부족`);
      return;
    }
    if (tokenCheck.consumed.length > 0) {
      state.battleLog.push(`  🔹 소모: ${tokenCheck.consumed.join(', ')}`);
    }

    // 카드 사용 통계 추적
    state.cardUsage = state.cardUsage || {};
    state.cardUsage[card.id] = (state.cardUsage[card.id] || 0) + 1;

    // 카드 실행당 방어력 (르 송쥬 뒤 비에야르)
    if (state.player.blockPerCardExecution && state.player.blockPerCardExecution > 0) {
      state.player.block += state.player.blockPerCardExecution;
      state.battleLog.push(`  🛡️ 카드 실행 방어: +${state.player.blockPerCardExecution}`);
    }

    // 상징 트리거
    if (this.config.enableRelics) {
      const cardEffects = this.relicSystem.processCardPlayed(state.player, state.enemy, card.id);
      this.applyRelicEffects(state, cardEffects);
    }

    // 특성 처리
    const traitMods = this.processTraits(card, state.player, timelineCard.crossed ?? false, state, 'player');

    // 교차 보너스 처리
    const crossResult = processCrossBonus(state, card, 'player', timelineCard);
    if (crossResult.success && crossResult.effects.length > 0) {
      state.battleLog.push(`  ⚡ 교차: ${crossResult.effects.join(', ')}`);
    }

    // 특수 효과 실행 (공격/방어 전)
    const specialResults = executeSpecialEffects(state, card, 'player', timelineCard);
    for (const result of specialResults) {
      if (result.success && result.effects.length > 0) {
        state.battleLog.push(`  ✨ ${result.effects.join(', ')}`);
      }
    }

    // 공격 처리
    if (card.damage && card.damage > 0) {
      const ignoreBlock = hasSpecialEffect(card, 'ignoreBlock') || hasSpecialEffect(card, 'piercing');
      const guaranteedCrit = hasSpecialEffect(card, 'guaranteedCrit') || crossResult.guaranteedCrit;

      this.processAttack(state, 'player', card, traitMods, timelineCard.crossed ?? false, {
        ignoreBlock,
        guaranteedCrit,
        damageMultiplier: crossResult.damageMultiplier,
        extraHits: specialResults.reduce((acc, r) => acc + (r.stateChanges.extraHits || 0), 0),
      });
    }

    // 방어 처리
    if (card.block && card.block > 0) {
      const blockMult = crossResult.blockMultiplier || 1;
      this.processBlock(state, 'player', card, traitMods, timelineCard, blockMult);

      // 배틀왈츠 Lv3: 검격 방어시 수세 획득
      if (state.growthBonuses?.logosEffects?.combatTokens && card.cardCategory === 'fencing') {
        this.addTokenTracked(state, state.player, 'guard', 1);
        state.battleLog.push(`  🛡️ 배틀왈츠: 수세 +1`);
      }
    }

    // 배틀왈츠 Lv3: 검격 공격시 흐릿함 획득
    if (state.growthBonuses?.logosEffects?.combatTokens && card.cardCategory === 'fencing' && card.damage && card.damage > 0) {
      this.addTokenTracked(state, state.player, 'blur', 1);
      state.battleLog.push(`  ✨ 배틀왈츠: 흐릿함 +1`);
    }

    // 교차 보너스 추가 방어력
    if (crossResult.extraBlock) {
      state.player.block += crossResult.extraBlock;
      state.battleLog.push(`  🛡️ 추가 방어: ${crossResult.extraBlock}`);
    }

    // 교차 보너스 추가 사격 (gun_attack)
    if (crossResult.gunAttackHits && crossResult.gunAttackHits > 0) {
      const shootDamage = 5; // 기본 사격 피해
      for (let i = 0; i < crossResult.gunAttackHits; i++) {
        const blocked = Math.min(state.enemy.block, shootDamage);
        const actualDamage = shootDamage - blocked;
        state.enemy.block -= blocked;
        state.enemy.hp -= actualDamage;
        state.playerDamageDealt = (state.playerDamageDealt || 0) + actualDamage;
        state.battleLog.push(`  🔫 사격 추가: ${actualDamage} 피해${blocked > 0 ? ` (${blocked} 방어)` : ''}`);
      }
    }

    // 토큰 적용
    if (card.appliedTokens) {
      for (const token of card.appliedTokens) {
        if (token.target === 'player') {
          this.addTokenTracked(state, state.player, token.id, token.stacks || 1);
          state.battleLog.push(`  플레이어: ${token.id} +${token.stacks || 1}`);
        } else {
          // 면역 체크
          const immunityCheck = checkImmunity(state.enemy.tokens, token.id);
          if (!immunityCheck.blocked) {
            this.addTokenTracked(state, state.enemy, token.id, token.stacks || 1);
            state.battleLog.push(`  적: ${token.id} +${token.stacks || 1}`);
          } else {
            state.enemy.tokens = immunityCheck.newTokens;
            state.battleLog.push(`  적: 면역으로 ${token.id} 차단`);
          }
        }
      }
    }

    // 카드 창조 효과 처리
    for (const result of specialResults) {
      if (result.stateChanges.creationEffect) {
        const creationResult = this.cardCreation.processCreationEffect(
          result.stateChanges.creationEffect,
          state,
          card,
          timelineCard,
          'player',
          { hitCount: card.hits || 1 }
        );
        for (const msg of creationResult.messages) {
          state.battleLog.push(`  🎴 ${msg}`);
        }
      }
    }
  }

  private executeEnemyCard(state: GameBattleState, card: GameCard, timelineCard: TimelineCard): void {
    this.emitEvent('card_execute', state.turn, { cardId: card.id, actor: 'enemy' });

    const traitMods = this.processTraits(card, state.enemy, timelineCard.crossed ?? false, state, 'enemy');

    // 특수 효과 실행
    const specialResults = executeSpecialEffects(state, card, 'enemy', timelineCard);
    for (const result of specialResults) {
      if (result.success && result.effects.length > 0) {
        state.battleLog.push(`  ✨ 적: ${result.effects.join(', ')}`);
      }
    }

    // 공격 처리
    if (card.damage && card.damage > 0) {
      const ignoreBlock = hasSpecialEffect(card, 'ignoreBlock') || hasSpecialEffect(card, 'piercing');
      const guaranteedCrit = hasSpecialEffect(card, 'guaranteedCrit');

      this.processAttack(state, 'enemy', card, traitMods, timelineCard.crossed ?? false, {
        ignoreBlock,
        guaranteedCrit,
        extraHits: specialResults.reduce((acc, r) => acc + (r.stateChanges.extraHits || 0), 0),
      });
    }

    // 방어 처리
    if (card.block && card.block > 0) {
      this.processBlock(state, 'enemy', card, traitMods, timelineCard, 1);
    }

    // 토큰 적용
    if (card.appliedTokens) {
      for (const token of card.appliedTokens) {
        // target이 'self'인 경우 적 자신에게
        const appliesTo = token.target === 'self' ? 'enemy' : token.target;

        if (appliesTo === 'enemy') {
          this.addTokenTracked(state, state.enemy, token.id, token.stacks || 1);
        } else {
          // 면역 체크
          const immunityCheck = checkImmunity(state.player.tokens, token.id);
          if (!immunityCheck.blocked) {
            this.addTokenTracked(state, state.player, token.id, token.stacks || 1);
          } else {
            state.player.tokens = immunityCheck.newTokens;
          }
        }
      }
    }
  }

  // ==================== 공격 처리 ====================

  private processAttack(
    state: GameBattleState,
    attacker: 'player' | 'enemy',
    card: GameCard,
    traitMods: TraitModifiers,
    crossed: boolean,
    options: {
      ignoreBlock?: boolean;
      guaranteedCrit?: boolean;
      damageMultiplier?: number;
      extraHits?: number;
    } = {}
  ): void {
    const attackerState = attacker === 'player' ? state.player : state.enemy;
    const defenderState = attacker === 'player' ? state.enemy : state.player;

    const baseHits = card.hits || 1;
    const totalHits = baseHits + (options.extraHits || 0);

    // 공격 수정자는 첫 타격 전에 한 번만 계산 (멀티히트 전체에 동일 적용)
    // 게임과 동일: applyTokenEffectsToCard가 루프 전에 호출됨
    const attackMods = calculateAttackModifiers(attackerState.tokens);
    const baseFencingBonus = getFencingDamageBonus(attackerState.tokens, card);
    const baseGunBonus = getGunDamageBonus(attackerState.tokens, card);

    for (let hit = 0; hit < totalHits; hit++) {
      if (defenderState.hp <= 0) break;

      // 방어 수정자는 매 타격마다 계산 (회피 등 소모 가능)
      const defenseMods = calculateDefenseModifiers(defenderState.tokens);
      const damageTakenMods = calculateDamageTakenModifiers(defenderState.tokens);

      // 기본 피해 계산 (미리 계산된 보너스 사용)
      let damage = card.damage || 0;

      // 검격/총기 카드 보너스 (루프 전에 계산됨)
      damage += baseFencingBonus;
      damage += baseGunBonus;

      // 힘 보너스
      damage += attackMods.damageBonus;

      // 공격력 배율
      damage = Math.floor(damage * attackMods.attackMultiplier);

      // 특성 배율
      damage = Math.floor(damage * traitMods.damageMultiplier);

      // 교차/옵션 피해 배율
      const damageMult = options.damageMultiplier || 1;
      if (damageMult !== 1) {
        damage = Math.floor(damage * damageMult);
      }

      // 치명타 계산
      let isCrit = false;
      if (options.guaranteedCrit) {
        isCrit = true;
        damage = Math.floor(damage * CRIT_MULTIPLIER);
      } else if (this.config.enableCrits) {
        const critChance = BASE_CRIT_CHANCE + (attackMods.critBoost / 100);
        const damageBeforeCrit = damage;
        isCrit = Math.random() < critChance;
        if (isCrit) {
          damage = Math.floor(damage * CRIT_MULTIPLIER);
          // crit_boost 토큰 효과 추적 (치명타 발생 시 보너스 피해)
          if (state.tokenEffects && attackMods.critBoost > 0 && hasToken(attackerState.tokens, 'crit_boost')) {
            const critBonusDamage = damage - damageBeforeCrit;
            this.recordEffectValue(state.tokenEffects, 'crit_boost', { damage: critBonusDamage });
          }
        }
      }

      // 치명타 시 기교(finesse) 획득 (플레이어만)
      if (isCrit && attacker === 'player') {
        let finesseGain = 1;

        // 이변: 광기(FINESSE_BLOCK) - 기교 획득 차단/감소
        if (this.config.enableAnomalies) {
          const finesseBlockLevel = getFinesseBlockLevel();
          if (finesseBlockLevel >= 3) {
            // 레벨 3-4: 완전 차단
            finesseGain = 0;
          } else if (finesseBlockLevel > 0) {
            // 레벨 1-2: 25% 감소 per level
            finesseGain = Math.max(0, Math.floor(1 * (1 - finesseBlockLevel * 0.25)));
          }
        }

        if (finesseGain > 0) {
          this.addTokenTracked(state, state.player, 'finesse', finesseGain);
          state.battleLog.push(`  ✨ 기교 +${finesseGain}`);
        }

        // 치명타시 넉백(critKnockback4) 특수 효과
        if (hasSpecialEffect(card, 'critKnockback4')) {
          const knockbackAmount = 4;
          const targetOwner = attacker === 'player' ? 'enemy' : 'player';
          let pushedCount = 0;
          for (const tc of state.timeline) {
            if (tc.owner === targetOwner && !tc.executed) {
              tc.position = Math.min(this.config.maxSpeed, tc.position + knockbackAmount);
              pushedCount++;
            }
          }
          if (pushedCount > 0) {
            state.battleLog.push(`  ⏩ 치명타 넉백: 상대 카드 ${pushedCount}장 +${knockbackAmount}`);
          }
        }
      }

      // 회피 체크
      if (defenseMods.dodgeChance > 0 && Math.random() < defenseMods.dodgeChance) {
        state.battleLog.push(`  ${attacker === 'player' ? '플레이어' : '적'}: ${card.name} → 회피!`);
        // 회피로 피한 피해량 추적
        if (state.tokenEffects) {
          if (hasToken(defenderState.tokens, 'blur')) {
            this.recordEffectValue(state.tokenEffects, 'blur', { damage: damage });
          }
          if (hasToken(defenderState.tokens, 'evasion')) {
            this.recordEffectValue(state.tokenEffects, 'evasion', { damage: damage });
          }
        }
        if (attacker === 'player') {
          state.enemy.tokens = consumeDamageTakenTokens(state.enemy.tokens);
        } else {
          state.player.tokens = consumeDamageTakenTokens(state.player.tokens);
        }
        continue;
      }

      // 피해 증폭 (허약 등)
      const damageBeforeVuln = damage;
      damage = Math.floor(damage * damageTakenMods.damageMultiplier);
      // vulnerable/weak 토큰 효과 추적 (받는 피해 증가)
      if (state.tokenEffects && damageTakenMods.damageMultiplier > 1) {
        const vulnBonusDamage = damage - damageBeforeVuln;
        if (hasToken(defenderState.tokens, 'vulnerablePlus')) {
          this.recordEffectValue(state.tokenEffects, 'vulnerablePlus', { damage: vulnBonusDamage });
        } else if (hasToken(defenderState.tokens, 'vulnerable')) {
          this.recordEffectValue(state.tokenEffects, 'vulnerable', { damage: vulnBonusDamage });
        }
        if (hasToken(defenderState.tokens, 'weakPlus')) {
          this.recordEffectValue(state.tokenEffects, 'weakPlus', { damage: vulnBonusDamage });
        } else if (hasToken(defenderState.tokens, 'weak')) {
          this.recordEffectValue(state.tokenEffects, 'weak', { damage: vulnBonusDamage });
        }
      }

      // 이변: 취약 (받는 피해 증가)
      if (this.config.enableAnomalies && attacker === 'enemy') {
        const vulnPercent = getVulnerabilityPercent();
        if (vulnPercent > 0) {
          damage = Math.floor(damage * (1 + vulnPercent / 100));
        }
      }

      // 방어력 처리
      let actualDamage = damage;
      let blocked = 0;

      const shouldIgnoreBlock = options.ignoreBlock || attackMods.ignoreBlock;

      // 분쇄(crush) 특성: 방어력에 2배 피해
      const hasCrush = card.traits?.includes('crush');
      const crushDamageToBlock = hasCrush && defenderState.block > 0;

      if (!shouldIgnoreBlock) {
        if (crushDamageToBlock) {
          // 분쇄: 방어력 깎는 피해가 2배
          const damageToBlock = Math.min(defenderState.block, damage * 2);
          defenderState.block -= damageToBlock;
          blocked = Math.floor(damageToBlock / 2); // 실제 막은 양은 원래 피해 기준
          actualDamage = damage - blocked;
          state.battleLog.push(`  🔨 분쇄: 방어력 ${damageToBlock} 파괴`);
        } else {
          blocked = Math.min(defenderState.block, damage);
          actualDamage = damage - blocked;
          defenderState.block -= blocked;
        }

        // 배틀왈츠 Lv2: 검격이 방어력에 50% 추가피해
        const armorPen = state.growthBonuses?.logosEffects?.armorPenetration || 0;
        if (armorPen > 0 && blocked > 0 && attacker === 'player' && card.cardCategory === 'fencing') {
          const bonusDamage = Math.floor(blocked * (armorPen / 100));
          defenderState.hp -= bonusDamage;
          state.playerDamageDealt = (state.playerDamageDealt || 0) + bonusDamage;
          state.battleLog.push(`  ⚔️ 배틀왈츠: 관통 ${bonusDamage} 추가피해`);
        }
      }

      // 치명타시 장전(critLoad) 특성
      if (isCrit && hasSpecialEffect(card, 'critLoad') && attacker === 'player') {
        state.player.tokens = removeToken(state.player.tokens, 'gun_jam', 99);
        state.player.tokens = removeToken(state.player.tokens, 'roulette', 99);
        state.battleLog.push(`  🔫 치명타 장전!`);
      }

      // 피해 적용
      defenderState.hp -= actualDamage;

      // 피해량 추적
      if (attacker === 'player') {
        state.playerDamageDealt = (state.playerDamageDealt || 0) + actualDamage;

        // knockbackOnHit3: 피해 시 넉백 3
        if (actualDamage > 0 && hasSpecialEffect(card, 'knockbackOnHit3')) {
          let pushedCount = 0;
          for (const tc of state.timeline) {
            if (tc.owner === 'enemy' && !tc.executed) {
              tc.position = Math.min(this.config.maxSpeed, tc.position + 3);
              pushedCount++;
            }
          }
          if (pushedCount > 0) {
            state.battleLog.push(`  ⏩ 피해 넉백: 적 카드 ${pushedCount}장 +3`);
          }
        }
      } else {
        state.enemyDamageDealt = (state.enemyDamageDealt || 0) + actualDamage;

        // onHitBlock7Advance3 (rain_defense): 피격시 방어 7, 앞당김 3
        if (actualDamage > 0 && hasToken(state.player.tokens, 'rain_defense')) {
          state.player.block += 7;
          let advancedCount = 0;
          for (const tc of state.timeline) {
            if (tc.owner === 'player' && !tc.executed) {
              tc.position = Math.max(1, tc.position - 3);
              advancedCount++;
            }
          }
          state.battleLog.push(`  🌧️ 비의 눈물: 방어 +7, 앞당김 ${advancedCount}장`);
        }

        // 건카타 Lv1: 방어로 막을 때 총격
        if (blocked > 0 && state.growthBonuses?.logosEffects?.blockToShoot) {
          const gunkataShootDamage = 4; // 건카타 사격 피해
          const enemyBlocked = Math.min(state.enemy.block, gunkataShootDamage);
          const enemyActualDamage = gunkataShootDamage - enemyBlocked;
          state.enemy.block -= enemyBlocked;
          state.enemy.hp -= enemyActualDamage;
          state.playerDamageDealt = (state.playerDamageDealt || 0) + enemyActualDamage;
          state.battleLog.push(`  🔫 건카타: 반격 사격 ${enemyActualDamage} 피해`);
        }
      }

      // 흡혈 처리
      if (attackMods.lifesteal > 0 && actualDamage > 0) {
        let healAmount = Math.floor(actualDamage * attackMods.lifesteal);

        // 마고의 피: 회복량 50% 증가
        if (this.config.enableRelics && attacker === 'player') {
          const healEffects = this.relicSystem.processHeal(attackerState as PlayerState, healAmount);
          for (const effect of healEffects) {
            if (effect.effects.heal) {
              healAmount += effect.effects.heal;
              state.battleLog.push(`  🎁 ${effect.relicName}: 추가 회복 +${effect.effects.heal}`);
              if (state.relicEffects) {
                this.recordEffectValue(state.relicEffects, effect.relicId, { healing: effect.effects.heal });
              }
            }
          }
        }

        attackerState.hp = Math.min(attackerState.maxHp, attackerState.hp + healAmount);
        state.battleLog.push(`  💚 흡수: ${healAmount} 회복`);
      }

      // 로그
      const critText = isCrit ? ' 💥치명타!' : '';
      const blockText = blocked > 0 ? ` (${blocked} 방어)` : '';
      state.battleLog.push(
        `  ${attacker === 'player' ? '플레이어' : '적'}: ${card.name}${totalHits > 1 ? ` (${hit + 1}/${totalHits})` : ''} → ${actualDamage} 피해${blockText}${critText}`
      );

      // 토큰 효과 추적 (첫 타격에서만 기록)
      if (hit === 0 && state.tokenEffects) {
        // 공격 토큰 효과 기록
        const baseDamage = card.damage || 0;
        const bonusDamage = actualDamage - baseDamage;
        if (bonusDamage > 0) {
          // 힘 토큰
          if (attackMods.damageBonus > 0) {
            this.recordEffectValue(state.tokenEffects, 'strength', { damage: attackMods.damageBonus });
          }
          // 공세/공격 토큰 (배율 기반 보너스)
          const multBonus = baseDamage * (attackMods.attackMultiplier - 1);
          if (multBonus > 0) {
            if (hasToken(attackerState.tokens, 'offensePlus')) {
              this.recordEffectValue(state.tokenEffects, 'offensePlus', { damage: multBonus });
            } else if (hasToken(attackerState.tokens, 'offense')) {
              this.recordEffectValue(state.tokenEffects, 'offense', { damage: multBonus });
            }
            if (hasToken(attackerState.tokens, 'attackPlus')) {
              this.recordEffectValue(state.tokenEffects, 'attackPlus', { damage: multBonus });
            } else if (hasToken(attackerState.tokens, 'attack')) {
              this.recordEffectValue(state.tokenEffects, 'attack', { damage: multBonus });
            }
          }
        }
        // 회피 토큰은 실제 회피 성공 시에만 추적 (위 회피 체크 블록에서 처리)
      }

      // 토큰 소모
      // 공격 토큰은 첫 타격에만 소모 (멀티히트 시 한 번만)
      // 피해 수신 토큰은 매 타격마다 소모 (회피 등)
      if (hit === 0) {
        if (attacker === 'player') {
          state.player.tokens = consumeAttackTokens(state.player.tokens);
        } else {
          state.enemy.tokens = consumeAttackTokens(state.enemy.tokens);
        }
      }
      // 피해 수신 토큰은 매 타격마다 체크
      if (attacker === 'player') {
        state.enemy.tokens = consumeDamageTakenTokens(state.enemy.tokens);
      } else {
        state.player.tokens = consumeDamageTakenTokens(state.player.tokens);
      }

      // 반격 처리
      if (actualDamage > 0 && hasToken(defenderState.tokens, 'counter')) {
        const counterResult = processCounter(attackerState.tokens, defenderState.tokens);
        if (counterResult.damage > 0) {
          attackerState.hp -= counterResult.damage;
          defenderState.tokens = counterResult.newDefenderTokens;
          state.battleLog.push(`  ⚔️ 반격: ${counterResult.damage} 피해`);
          // 반격 피해량 추적
          if (state.tokenEffects) {
            this.recordEffectValue(state.tokenEffects, 'counter', { damage: counterResult.damage });
          }
        }
      }

      // 대응사격 처리
      if (actualDamage > 0 && hasToken(defenderState.tokens, 'counterShot')) {
        const counterShotResult = processCounterShot(attackerState.tokens, defenderState.tokens);
        if (counterShotResult.damage > 0) {
          attackerState.hp -= counterShotResult.damage;
          defenderState.tokens = counterShotResult.newDefenderTokens;
          state.battleLog.push(`  🔫 대응사격: ${counterShotResult.damage} 피해`);
          // 대응사격 피해량 추적
          if (state.tokenEffects) {
            this.recordEffectValue(state.tokenEffects, 'counterShot', { damage: counterShotResult.damage });
          }

          // 룰렛 체크 (건카타 Lv2: 탄걸림 확률 감소)
          const reduceJam = attacker === 'enemy' && !!state.growthBonuses?.logosEffects?.reduceJamChance;
          const rouletteResult = checkRoulette(defenderState.tokens, reduceJam);
          if (rouletteResult.jammed) {
            defenderState.tokens = rouletteResult.newTokens;
            state.battleLog.push(`  ⚠️ 탄걸림 발생!`);
          } else {
            defenderState.tokens = rouletteResult.newTokens;
          }
        }
      }

      // 피해 받을 때 상징 트리거
      if (this.config.enableRelics && actualDamage > 0) {
        if (attacker === 'enemy') {
          const damageEffects = this.relicSystem.processDamageTaken(state.player, state.enemy, actualDamage);
          this.applyRelicEffects(state, damageEffects);
        }
      }

      // 부활 체크
      if (defenderState.hp <= 0) {
        const reviveResult = checkRevive(defenderState.tokens, defenderState.maxHp);
        if (reviveResult.revived) {
          defenderState.hp = reviveResult.newHp;
          defenderState.tokens = reviveResult.newTokens;
          state.battleLog.push(`  💫 부활! HP: ${reviveResult.newHp}`);
        }
      }
    }
  }

  // ==================== 방어 처리 ====================

  private processBlock(
    state: GameBattleState,
    actor: 'player' | 'enemy',
    card: GameCard,
    traitMods: TraitModifiers,
    timelineCard: TimelineCard,
    crossBlockMultiplier: number = 1
  ): void {
    const actorState = actor === 'player' ? state.player : state.enemy;

    // 방어 수정자 계산
    const defenseMods = calculateDefenseModifiers(actorState.tokens);

    // 기본 방어력
    let block = card.block || 0;

    // 힘 보너스
    block += getTokenStacks(actorState.tokens, 'strength');

    // 방어력 배율
    block = Math.floor(block * defenseMods.defenseMultiplier);

    // 교차 방어력 배율
    if (crossBlockMultiplier !== 1) {
      block = Math.floor(block * crossBlockMultiplier);
    }

    // 특성 배율
    block = Math.floor(block * traitMods.blockMultiplier);

    // 성장형 방어 (growingDefense): 타임라인 위치에 따라 방어력 증가
    if (card.traits?.includes('growingDefense')) {
      const positionBonus = Math.floor(timelineCard.position / 5);
      block += positionBonus;
      if (positionBonus > 0) {
        state.battleLog.push(`  📈 성장형 방어: +${positionBonus}`);
      }
    }

    // 방어력 적용
    actorState.block += block;

    // 토큰 효과 추적
    if (state.tokenEffects) {
      const baseBlock = card.block || 0;
      const bonusBlock = block - baseBlock;
      if (bonusBlock > 0) {
        // 힘 토큰 (방어에도 보너스)
        const strengthBonus = getTokenStacks(actorState.tokens, 'strength');
        if (strengthBonus > 0) {
          this.recordEffectValue(state.tokenEffects, 'strength', { block: strengthBonus });
        }
        // 수세/방어 토큰 (배율 기반 보너스)
        const multBonus = baseBlock * (defenseMods.defenseMultiplier - 1);
        if (multBonus > 0) {
          if (hasToken(actorState.tokens, 'guardPlus')) {
            this.recordEffectValue(state.tokenEffects, 'guardPlus', { block: multBonus });
          } else if (hasToken(actorState.tokens, 'guard')) {
            this.recordEffectValue(state.tokenEffects, 'guard', { block: multBonus });
          }
          if (hasToken(actorState.tokens, 'defensePlus')) {
            this.recordEffectValue(state.tokenEffects, 'defensePlus', { block: multBonus });
          } else if (hasToken(actorState.tokens, 'defense')) {
            this.recordEffectValue(state.tokenEffects, 'defense', { block: multBonus });
          }
        }
      }
      // shaken/exposed 토큰 효과 추적 (방어력 감소)
      if (defenseMods.defenseMultiplier < 1) {
        const lostBlock = Math.floor(baseBlock * (1 - defenseMods.defenseMultiplier));
        if (lostBlock > 0) {
          if (hasToken(actorState.tokens, 'shakenPlus')) {
            this.recordEffectValue(state.tokenEffects, 'shakenPlus', { block: -lostBlock });
          } else if (hasToken(actorState.tokens, 'shaken')) {
            this.recordEffectValue(state.tokenEffects, 'shaken', { block: -lostBlock });
          }
          if (hasToken(actorState.tokens, 'exposedPlus')) {
            this.recordEffectValue(state.tokenEffects, 'exposedPlus', { block: -lostBlock });
          } else if (hasToken(actorState.tokens, 'exposed')) {
            this.recordEffectValue(state.tokenEffects, 'exposed', { block: -lostBlock });
          }
        }
      }
    }

    // 토큰 소모
    if (actor === 'player') {
      state.player.tokens = consumeDefenseTokens(state.player.tokens);
    } else {
      state.enemy.tokens = consumeDefenseTokens(state.enemy.tokens);
    }

    state.battleLog.push(`  ${actor === 'player' ? '플레이어' : '적'}: ${card.name} → ${block} 방어`);

    // 이변: 역류 (방어 카드 사용 시 자해 피해)
    if (this.config.enableAnomalies && actor === 'player') {
      const backfireDamage = getDefenseBackfireDamage();
      if (backfireDamage > 0) {
        state.player.hp -= backfireDamage;
        state.battleLog.push(`  💔 역류: ${backfireDamage} 자해 피해`);
      }
    }
  }

  // ==================== 특성 처리 ====================

  private processTraits(
    card: GameCard,
    actorState: PlayerState | EnemyState,
    crossed: boolean,
    state?: GameBattleState,
    actor?: 'player' | 'enemy'
  ): TraitModifiers {
    const mods: TraitModifiers = {
      damageMultiplier: 1,
      blockMultiplier: 1,
      speedModifier: 0,
      effects: [],
    };

    if (!card.traits) return mods;

    // 이변: 침묵 - 특성 비활성화 체크
    const silenceLevel = this.config.enableAnomalies ? getTraitSilenceLevel() : 0;

    for (const traitId of card.traits) {
      const trait = this.traits[traitId];
      if (!trait) continue;

      // 침묵 레벨에 따라 특성 비활성화
      // 1: 부정 특성만, 2: 1성 이하, 3: 2성 이하, 4: 모든 특성
      if (silenceLevel >= 4) {
        continue; // 모든 특성 무시
      }
      if (silenceLevel >= 3 && trait.weight <= 2) {
        continue; // 2성 이하 무시
      }
      if (silenceLevel >= 2 && trait.weight <= 1) {
        continue; // 1성 이하 무시
      }
      if (silenceLevel >= 1 && trait.type === 'negative') {
        continue; // 부정 특성 무시
      }

      switch (traitId) {
        case 'swift':
          // 신속함: 속도 -2
          mods.speedModifier -= 2;
          break;

        case 'strongbone':
          // 강골: 25% 증가
          mods.damageMultiplier *= 1.25;
          mods.blockMultiplier *= 1.25;
          break;

        case 'crush':
          // 분쇄: 방어력에 2배 피해 (processAttack에서 처리)
          break;

        case 'destroyer':
          // 파괴자: 50% 공격력 증가
          mods.damageMultiplier *= 1.5;
          break;

        case 'slaughter':
          // 도살: 75% 기본 피해 증가
          mods.damageMultiplier *= 1.75;
          break;

        case 'pinnacle':
          // 정점: 2.5배
          mods.damageMultiplier *= 2.5;
          break;

        case 'weakbone':
          // 약골: 20% 감소
          mods.damageMultiplier *= 0.8;
          mods.blockMultiplier *= 0.8;
          break;

        case 'slow':
          // 굼뜸: 속도 +3
          mods.speedModifier += 3;
          break;

        case 'cross':
          // 교차: 별도 처리
          if (crossed) {
            mods.effects.push('교차 발동');
          }
          break;

        case 'chain':
          // 연계: 다음 카드 앞당김 (속도 -3)
          // 이변: 고립 - 연계 효과 무효화 (레벨 1 이상 또는 레벨 3 이상)
          const chainIsolation = this.config.enableAnomalies ? getChainIsolationLevel() : 0;
          if (chainIsolation >= 1 && chainIsolation !== 2) {
            // 레벨 1 = 연계만 무효, 레벨 2 = 후속만 무효, 레벨 3+ = 둘 다 무효
            break; // 연계 효과 무시
          }
          // 연계 토큰 부여 (다음 후속/마무리 카드에 전달)
          const chainStacks = getTokenStacks(actorState.tokens, 'chain_ready');
          actorState.tokens = addToken(actorState.tokens, 'chain_ready', 1);
          // 연계 중첩 시 추가 속도 보너스 (연계 길이 추적)
          actorState.tokens = addToken(actorState.tokens, 'chain_length', 1);
          mods.speedBonus = (mods.speedBonus ?? 0) - (card.chainSpeedReduction || 3);  // 다음 카드 속도 감소 효과
          mods.effects.push(`연계 준비 (속도 -${card.chainSpeedReduction || 3})`);
          break;

        case 'followup':
          // 후속: 연계되면 50% 증폭 + 연계 길이 보너스
          // 이변: 고립 - 후속 효과 무효화 (레벨 2 이상)
          const followupIsolation = this.config.enableAnomalies ? getChainIsolationLevel() : 0;
          if (followupIsolation >= 2) {
            break; // 후속 효과 무시
          }
          if (hasToken(actorState.tokens, 'chain_ready')) {
            // 연계 길이에 따른 추가 보너스
            const chainLength = getTokenStacks(actorState.tokens, 'chain_length') || 1;
            const chainBonus = Math.min(chainLength * 0.1, 0.5);  // 최대 50% 추가
            mods.damageMultiplier *= (1.5 + chainBonus);
            mods.blockMultiplier *= (1.5 + chainBonus);
            // 연계 속도 보너스 (후속 카드 앞당김)
            mods.speedBonus = (mods.speedBonus ?? 0) - 2;
            // 연계 토큰 소모하지 않고 유지 (연속 후속 가능)
            // 연계 길이 증가
            actorState.tokens = addToken(actorState.tokens, 'chain_length', 1);
            mods.effects.push(`후속 발동 (x${(1.5 + chainBonus).toFixed(1)}, 연계 ${chainLength + 1}단)`);
          }
          break;

        case 'finisher':
          // 마무리: 연계되면 50% + 연계 길이 보너스, 연계 종료
          if (hasToken(actorState.tokens, 'chain_ready')) {
            const chainLength = getTokenStacks(actorState.tokens, 'chain_length') || 1;
            // 연계 길이에 비례한 보너스 (최대 2배)
            const finisherMultiplier = Math.min(1.5 + chainLength * 0.25, 2.5);
            mods.damageMultiplier *= finisherMultiplier;
            // 연계 토큰 모두 소모 (연계 종료)
            actorState.tokens = removeToken(actorState.tokens, 'chain_ready', 999);
            actorState.tokens = removeToken(actorState.tokens, 'chain_length', 999);
            mods.effects.push(`마무리 발동 (x${finisherMultiplier.toFixed(1)}, 연계 ${chainLength + 1}단 완료)`);
          }
          break;

        case 'training':
          // 단련: 힘 +1
          actorState.tokens = addToken(actorState.tokens, 'strength', 1);
          mods.effects.push('단련: 힘 +1');
          break;

        case 'warmup':
          // 몸풀기: 다음 턴 행동력 +2
          actorState.tokens = addToken(actorState.tokens, 'warmedUp', 1);
          mods.effects.push('몸풀기');
          break;

        case 'cooperation':
          // 협동: 조합에 포함되면 50% 추가
          if (state && actor === 'player') {
            const comboRank = state.currentComboRank || 0;
            const comboKeys = state.currentComboKeys || new Set<number>();
            const cardCost = card.actionCost || 1;
            // 콤보 등급이 0보다 크고 (하이카드가 아닌) 카드의 actionCost가 콤보에 포함되면
            if (comboRank > 0 && comboKeys.has(cardCost)) {
              mods.damageMultiplier *= 1.5;
              mods.blockMultiplier *= 1.5;
              mods.effects.push('협동: 콤보 50% 증폭');
            }
          }
          break;

        case 'outcast':
          // 소외: 조합 제외, 행동력 -1 (이미 처리됨)
          break;

        case 'double_edge':
          // 양날의 검: 사용 시 1 피해
          actorState.hp -= 1;
          mods.effects.push('양날: 1 피해');
          break;

        case 'exhaust':
          // 탈진: 다음 턴 행동력 -2
          actorState.tokens = addToken(actorState.tokens, 'dizzy', 1);
          mods.effects.push('탈진');
          break;

        case 'robber':
          // 날강도: 10 골드 소실
          if (state && actor === 'player') {
            const goldLoss = Math.min(10, state.player.gold);
            state.player.gold -= goldLoss;
            mods.effects.push(`날강도: ${goldLoss}G 소실`);
          }
          break;

        case 'repeat':
          // 반복: 다음 턴에도 손패에 확정적으로 등장
          if (state && actor === 'player') {
            state.player.repeatCards = state.player.repeatCards || [];
            if (!state.player.repeatCards.includes(card.id)) {
              state.player.repeatCards.push(card.id);
            }
            mods.effects.push('반복: 다음 턴 등장 확정');
          }
          break;

        case 'mastery':
          // 숙련: 카드 쓸수록 시간 -2, 최소값 1
          if (state) {
            state.masteryUseCount = state.masteryUseCount || {};
            const useCount = state.masteryUseCount[card.id] || 0;
            const speedReduction = useCount * 2;
            mods.speedModifier -= speedReduction;
            state.masteryUseCount[card.id] = useCount + 1;
            if (speedReduction > 0) {
              mods.effects.push(`숙련: 속도 -${speedReduction}`);
            }
          }
          break;

        case 'stun':
          // 기절: 타임라인 5범위 내 상대 카드 파괴
          if (state) {
            const position = state.timeline.find(tc => tc.cardId === card.id)?.position ?? 0;
            const targetOwner = actor === 'player' ? 'enemy' : 'player';
            let destroyed = 0;
            state.timeline = state.timeline.filter(tc => {
              if (tc.owner === targetOwner &&
                  Math.abs(tc.position - position) <= 5 &&
                  !tc.executed) {
                destroyed++;
                return false;
              }
              return true;
            });
            if (destroyed > 0) {
              mods.effects.push(`기절: 상대 카드 ${destroyed}개 파괴`);
            }
          }
          break;

        case 'general':
          // 장군: 다음 턴 보조특기 등장률 25% 증가
          if (state && actor === 'player') {
            state.player.supportSpecialtyBonus = (state.player.supportSpecialtyBonus || 0) + 25;
            mods.effects.push('장군: 보조특기 +25%');
          }
          break;

        case 'knockback':
          // 넉백: 상대 타임라인 3 뒤로 밀기
          if (state) {
            const targetOwner = actor === 'player' ? 'enemy' : 'player';
            state.timeline.forEach(tc => {
              if (tc.owner === targetOwner && !tc.executed) {
                tc.position = Math.min(tc.position + 3, this.config.maxSpeed);
              }
            });
            mods.effects.push('넉백: 상대 카드 +3');
          }
          break;

        case 'advance':
          // 앞당김: 내 타임라인 3 앞당김
          if (state) {
            state.timeline.forEach(tc => {
              if (tc.owner === actor && !tc.executed) {
                tc.position = Math.max(tc.position - 3, 1);
              }
            });
            mods.effects.push('앞당김: 내 카드 -3');
          }
          break;

        case 'escape':
          // 탈주: 다음 턴 손패에 미등장
          if (state && actor === 'player') {
            state.player.escapeCards = state.player.escapeCards || [];
            if (!state.player.escapeCards.includes(card.id)) {
              state.player.escapeCards.push(card.id);
            }
            mods.effects.push('탈주: 다음 턴 미등장');
          }
          break;

        case 'stubborn':
          // 고집: 대응단계 순서변경 불가 (UI 레벨에서 처리, 마킹만)
          mods.effects.push('고집: 순서변경 불가');
          break;

        case 'boredom':
          // 싫증: 사용시마다 시간 +2
          if (state) {
            state.masteryUseCount = state.masteryUseCount || {};
            const useCount = state.masteryUseCount[`boredom_${card.id}`] || 0;
            const speedIncrease = (useCount + 1) * 2;
            mods.speedModifier += speedIncrease;
            state.masteryUseCount[`boredom_${card.id}`] = useCount + 1;
            mods.effects.push(`싫증: 속도 +${speedIncrease}`);
          }
          break;

        case 'vanish':
          // 소멸: 사용 후 게임에서 제외
          if (state) {
            state.vanishedCards = state.vanishedCards || [];
            if (!state.vanishedCards.includes(card.id)) {
              state.vanishedCards.push(card.id);
            }
            // 덱과 버린 카드 더미에서 제거
            if (actor === 'player') {
              state.player.deck = state.player.deck.filter(id => id !== card.id);
              state.player.discard = state.player.discard.filter(id => id !== card.id);
            }
            mods.effects.push('소멸: 게임에서 제외');
          }
          break;

        case 'last':
          // 마지막: 타임라인 마지막에 발동 (배치 시 처리 필요, 마킹만)
          mods.effects.push('마지막: 최후 발동');
          break;

        case 'ruin':
          // 파탄: 다음 턴 주특기만 등장
          if (state && actor === 'player') {
            state.player.mainSpecialtyOnly = true;
            mods.effects.push('파탄: 다음 턴 주특기만');
          }
          break;

        case 'oblivion':
          // 망각: 이후 에테르 획득 불가
          if (state && actor === 'player') {
            state.player.etherBlocked = true;
            mods.effects.push('망각: 에테르 획득 불가');
          }
          break;
      }
    }

    return mods;
  }

  // ==================== 유틸리티 ====================

  private initializePlayer(deck: string[], relics: string[], items?: string[]): PlayerState {
    const passives = this.relicSystem.getPassiveEffects();

    return {
      hp: 100 + passives.maxHp,
      maxHp: 100 + passives.maxHp,
      block: 0,
      tokens: {},
      maxSpeed: DEFAULT_MAX_SPEED + passives.maxSpeed,
      energy: DEFAULT_PLAYER_ENERGY + passives.maxEnergy,
      maxEnergy: DEFAULT_PLAYER_ENERGY + passives.maxEnergy,
      strength: passives.strength,
      agility: passives.agility,
      ether: 0,
      gold: 100, // 시뮬레이션 기본 골드
      hand: [],
      deck: [...deck],
      discard: [],
      relics: [...relics],
      items: items ? [...items] : [],
      insight: 0,
    };
  }

  private applyPassiveRelics(player: PlayerState): void {
    const passives = this.relicSystem.getPassiveEffects();

    if (passives.strength > 0) {
      player.tokens = addToken(player.tokens, 'strength', passives.strength);
    }
    if (passives.agility > 0) {
      player.tokens = addToken(player.tokens, 'agility', passives.agility);
    }
  }

  private applyRelicEffects(state: GameBattleState, effects: { effects: Record<string, unknown>; relicName: string; relicId?: string }[]): void {
    for (const effect of effects) {
      const e = effect.effects as Record<string, number | undefined>;
      const relicKey = effect.relicId || effect.relicName;

      if (e.heal && typeof e.heal === 'number') {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + e.heal);
        state.battleLog.push(`  🎁 ${effect.relicName}: ${e.heal} 회복`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { healing: e.heal });
        }
      }
      if (e.damage && typeof e.damage === 'number') {
        state.player.hp -= e.damage;
        state.battleLog.push(`  💔 ${effect.relicName}: ${e.damage} 피해`);
        // 상징 효과 추적 (자해 피해는 음수로 기록)
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { damage: -e.damage });
        }
      }
      if (e.block && typeof e.block === 'number') {
        state.player.block += e.block;
        state.battleLog.push(`  🛡️ ${effect.relicName}: ${e.block} 방어`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { block: e.block });
        }
      }
      if (e.strength && typeof e.strength === 'number') {
        this.addTokenTracked(state, state.player, 'strength', e.strength);
        state.battleLog.push(`  💪 ${effect.relicName}: 힘 +${e.strength}`);
        // 상징 효과 추적 (힘은 기타 효과로 기록)
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { other: { strength: e.strength } });
        }
      }
      if (e.agility && typeof e.agility === 'number') {
        this.addTokenTracked(state, state.player, 'agility', e.agility);
        state.battleLog.push(`  🏃 ${effect.relicName}: 민첩 +${e.agility}`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { other: { agility: e.agility } });
        }
      }
      if (e.energy && typeof e.energy === 'number') {
        state.player.energy += e.energy;
        state.battleLog.push(`  ⚡ ${effect.relicName}: 에너지 +${e.energy}`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { other: { energy: e.energy } });
        }
      }
      if (e.maxHp && typeof e.maxHp === 'number') {
        state.player.maxHp += e.maxHp;
        state.player.hp += e.maxHp;
        state.battleLog.push(`  ❤️ ${effect.relicName}: 최대체력 +${e.maxHp}`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { healing: e.maxHp, other: { maxHp: e.maxHp } });
        }
      }
      if (e.draw && typeof e.draw === 'number') {
        this.drawCards(state.player, e.draw, state);
        state.battleLog.push(`  🃏 ${effect.relicName}: 카드 ${e.draw}장 드로우`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { other: { draw: e.draw } });
        }
      }
      if (e.etherBonus && typeof e.etherBonus === 'number') {
        state.player.ether = (state.player.ether || 0) + e.etherBonus;
        state.battleLog.push(`  💎 ${effect.relicName}: 에테르 +${e.etherBonus}`);
        // 상징 효과 추적
        if (state.relicEffects) {
          this.recordEffectValue(state.relicEffects, relicKey, { ether: e.etherBonus });
        }
      }
    }
  }

  private drawCards(player: PlayerState, count: number, state?: GameBattleState): void {
    // 이변: 뽑기 확률 감소 (각 드로우마다 확률적으로 실패)
    let effectiveCount = count;
    if (this.config.enableAnomalies) {
      const drawReduction = getDrawReduction(); // 0.1 = 10%, 0.4 = 40%
      if (drawReduction > 0) {
        // 각 드로우에 대해 확률적으로 실패 처리
        let reducedCount = 0;
        for (let i = 0; i < count; i++) {
          if (Math.random() >= drawReduction) {
            reducedCount++;
          }
        }
        effectiveCount = Math.max(1, reducedCount); // 최소 1장은 드로우
        if (effectiveCount < count && state) {
          state.battleLog.push(`  ⚠️ 이변: 뽑기 방해 (-${count - effectiveCount}장)`);
        }
      }
    }

    // 반복 특성: repeatCards를 먼저 손패에 추가
    if (player.repeatCards && player.repeatCards.length > 0) {
      for (const cardId of player.repeatCards) {
        if (!player.hand.includes(cardId)) {
          player.hand.push(cardId);
          state?.battleLog.push(`  🔄 반복: ${cardId} 손패에 확정 등장`);
        }
      }
      // 반복 특성 초기화
      player.repeatCards = [];
    }

    // 탈주 카드 필터링
    const escapeCards = new Set(player.escapeCards || []);

    for (let i = 0; i < effectiveCount; i++) {
      if (player.deck.length === 0) {
        // 버린 더미 셔플 (소멸된 카드 제외)
        const vanished = new Set(state?.vanishedCards || []);
        player.deck = player.discard.filter(id => !vanished.has(id));
        player.discard = [];
        this.shuffle(player.deck);
      }

      if (player.deck.length > 0) {
        // 탈주 카드는 건너뛰기
        let card: string | undefined;
        let attempts = 0;
        const maxAttempts = player.deck.length;

        while (attempts < maxAttempts) {
          const idx = player.deck.length - 1 - attempts;
          if (idx < 0) break;

          const candidate = player.deck[idx];
          if (candidate && !escapeCards.has(candidate)) {
            card = candidate;
            player.deck.splice(idx, 1);
            break;
          }
          attempts++;
        }

        if (card) {
          player.hand.push(card);
        }
      }
    }

    // 탈주 특성 초기화
    player.escapeCards = [];
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private emitEvent(type: BattleEvent['type'], turn: number, data?: Record<string, unknown>): void {
    this.events.push({ type, turn, data });
  }

  private finalizeBattle(state: GameBattleState): BattleResult {
    let winner: 'player' | 'enemy' | 'draw';

    if (state.enemy.hp <= 0 && state.player.hp > 0) {
      winner = 'player';
    } else if (state.player.hp <= 0 && state.enemy.hp > 0) {
      winner = 'enemy';
    } else if (state.player.hp <= 0 && state.enemy.hp <= 0) {
      winner = 'draw';
    } else {
      winner = state.player.hp > state.enemy.hp ? 'player' : 'enemy';
    }

    this.emitEvent('battle_end', state.turn, { winner, playerHp: state.player.hp, enemyHp: state.enemy.hp });

    // 골드 변화량 계산 (초기 골드 100 기준)
    const initialGold = 100;
    const goldChange = state.player.gold - initialGold;

    return {
      winner,
      turns: state.turn,
      playerDamageDealt: state.playerDamageDealt || 0,
      enemyDamageDealt: state.enemyDamageDealt || 0,
      playerFinalHp: Math.max(0, state.player.hp),
      enemyFinalHp: Math.max(0, state.enemy.hp),
      etherGained: state.player.ether,
      goldChange,
      battleLog: state.battleLog,
      events: this.events,
      cardUsage: state.cardUsage || {},
      comboStats: state.comboUsageCount || {},
      tokenStats: state.tokenUsage || {},
      tokenEffectStats: state.tokenEffects || {},
      itemEffectStats: state.itemEffects || {},
      relicEffectStats: state.relicEffects || {},
      timeline: state.timeline,
    };
  }
}

// ==================== 팩토리 함수 ====================

export function createTimelineBattleEngine(config?: Partial<BattleEngineConfig>): TimelineBattleEngine {
  return new TimelineBattleEngine(config);
}
