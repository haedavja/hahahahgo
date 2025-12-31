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
  TimelineCard,
  BattleEvent,
  BattleResult,
  TokenState,
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
} from './token-system';
import { getRelicSystemV2, RelicSystemV2 } from './relic-system-v2';
import { getAnomalySystem } from './anomaly-system';
import { getLogger } from './logger';
import { RespondAI, type ResponseDecision, type TimelineAnalysis } from '../ai/respond-ai';

const log = getLogger('TimelineBattleEngine');

// ==================== 상수 ====================

export const DEFAULT_MAX_SPEED = 30;
export const DEFAULT_PLAYER_ENERGY = 6;
export const DEFAULT_MAX_SUBMIT_CARDS = 5;
export const DEFAULT_HAND_SIZE = 5;
export const BASE_CRIT_CHANCE = 0.05;
export const CRIT_MULTIPLIER = 2.0;

// ==================== 전투 엔진 설정 ====================

export interface BattleEngineConfig {
  maxSpeed: number;
  maxTurns: number;
  enableCrits: boolean;
  enableCombos: boolean;
  enableRelics: boolean;
  enableAnomalies: boolean;
  enableTimeline: boolean;
  verbose: boolean;
}

const DEFAULT_CONFIG: BattleEngineConfig = {
  maxSpeed: DEFAULT_MAX_SPEED,
  maxTurns: 30,
  enableCrits: true,
  enableCombos: true,
  enableRelics: true,
  enableAnomalies: true,
  enableTimeline: true,
  verbose: false,
};

// ==================== 타임라인 전투 엔진 ====================

export class TimelineBattleEngine {
  private cards: Record<string, GameCard>;
  private traits: Record<string, { id: string; name: string; type: 'positive' | 'negative'; weight: number; description: string }>;
  private config: BattleEngineConfig;
  private relicSystem: RelicSystemV2;
  private respondAI: RespondAI;
  private events: BattleEvent[] = [];

  constructor(config: Partial<BattleEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cards = syncAllCards();
    this.traits = syncAllTraits();
    this.relicSystem = getRelicSystemV2();
    this.respondAI = new RespondAI(this.cards);
  }

  // ==================== 메인 전투 실행 ====================

  /**
   * 전투 실행
   */
  runBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemy: EnemyState,
    anomalyId?: string
  ): BattleResult {
    this.events = [];

    // 플레이어 초기화
    const player = this.initializePlayer(playerDeck, playerRelics);

    // 상징 초기화
    if (this.config.enableRelics) {
      this.relicSystem.initializeRelics(playerRelics);
      this.applyPassiveRelics(player);
    }

    // 이변 초기화
    if (this.config.enableAnomalies && anomalyId) {
      const anomalySystem = getAnomalySystem();
      anomalySystem.clear();
      anomalySystem.activateAnomaly(anomalyId);
    }

    // 전투 상태 초기화
    const state: GameBattleState = {
      player,
      enemy: { ...enemy },
      turn: 0,
      phase: 'select',
      timeline: [],
      anomalyId,
      battleLog: [],
    };

    // 전투 시작 트리거
    this.emitEvent('battle_start', 0, { playerHp: player.hp, enemyHp: enemy.hp });
    if (this.config.enableRelics) {
      const startEffects = this.relicSystem.processCombatStart(player, enemy);
      this.applyRelicEffects(state, startEffects);
    }

    // 덱 셔플
    this.shuffle(state.player.deck);
    this.shuffle(state.enemy.deck);

    // 초기 핸드 드로우
    this.drawCards(state.player, DEFAULT_HAND_SIZE);

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
    state.player.energy = state.player.maxEnergy + calculateEnergyModifier(state.player.tokens);
    state.timeline = [];

    // 턴 시작 상징 트리거
    if (this.config.enableRelics) {
      const turnStartEffects = this.relicSystem.processTurnStart(state.player, state.enemy, state.turn);
      this.applyRelicEffects(state, turnStartEffects);
    }

    // 화상 피해
    const burnResult = processBurn(state.player.tokens);
    if (burnResult.damage > 0) {
      state.player.hp -= burnResult.damage;
      state.battleLog.push(`🔥 화상 피해: ${burnResult.damage}`);
    }

    if (state.player.hp <= 0 || state.enemy.hp <= 0) return;

    // 1단계: 카드 선택 (선택 단계)
    state.phase = 'select';
    const playerCards = this.selectPlayerCards(state);
    const enemyCards = this.selectEnemyCards(state);

    // 2단계: 타임라인 배치
    this.placeCardsOnTimeline(state, playerCards, enemyCards);

    // 3단계: 대응 단계 (선택적)
    state.phase = 'respond';
    this.executeRespondPhase(state)

    // 4단계: 타임라인 해결 (진행 단계)
    state.phase = 'resolve';
    this.resolveTimeline(state);

    // 5단계: 턴 종료
    state.phase = 'end';

    // 핸드 버리기 및 드로우
    state.player.discard.push(...state.player.hand);
    state.player.hand = [];
    this.drawCards(state.player, DEFAULT_HAND_SIZE);

    // 턴 종료 토큰 처리
    state.player.tokens = processTurnEnd(state.player.tokens);
    state.enemy.tokens = processTurnEnd(state.enemy.tokens);

    // 턴 종료 상징 트리거
    if (this.config.enableRelics) {
      const turnEndEffects = this.relicSystem.processTurnEnd(state.player, state.enemy, state.turn);
      this.applyRelicEffects(state, turnEndEffects);
    }

    this.emitEvent('turn_end', state.turn, { playerHp: state.player.hp, enemyHp: state.enemy.hp });
  }

  // ==================== 대응 단계 ====================

  private executeRespondPhase(state: GameBattleState): void {
    // 타임라인 분석
    const analysis = this.respondAI.analyzeTimeline(state);

    if (this.config.verbose) {
      state.battleLog.push(`📊 타임라인 분석: 예상 피해 ${analysis.expectedDamage}, 위험도 ${analysis.riskScore}%`);
    }

    // 플레이어 대응 결정
    const playerHand = state.player.hand
      .map(id => this.cards[id])
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
        this.applyPlayerResponse(state, decision);
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

  private applyPlayerResponse(state: GameBattleState, decision: ResponseDecision): void {
    for (const cardId of decision.responseCards) {
      const card = this.cards[cardId];
      if (!card) continue;

      // 핸드에서 카드 제거
      const handIndex = state.player.hand.indexOf(cardId);
      if (handIndex >= 0) {
        state.player.hand.splice(handIndex, 1);
      }

      // 타임라인에 추가 (즉발 카드는 position 0)
      const position = card.priority === 'instant' ? 0 : (card.speedCost || 5);

      state.timeline.push({
        cardId: card.id,
        owner: 'player',
        position,
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

      const position = card.priority === 'instant' ? 0 : (card.speedCost || 5);

      state.timeline.push({
        cardId: card.id,
        owner: 'enemy',
        position,
        crossed: false,
        executed: false,
      });

      state.battleLog.push(`⚡ 적 대응: ${card.name}`);
    }

    state.timeline.sort((a, b) => a.position - b.position);
  }

  // ==================== 카드 선택 ====================

  private selectPlayerCards(state: GameBattleState): GameCard[] {
    const selected: GameCard[] = [];
    let energyLeft = state.player.energy;
    let cardsSelected = 0;
    const maxCards = DEFAULT_MAX_SUBMIT_CARDS;

    // 간단한 그리디 선택: 에너지 내에서 가장 효율적인 카드 선택
    const sortedHand = [...state.player.hand]
      .map(id => this.cards[id])
      .filter((c): c is GameCard => c !== undefined)
      .sort((a, b) => {
        // 피해 효율로 정렬
        const effA = (a.damage || 0) / (a.actionCost || 1);
        const effB = (b.damage || 0) / (b.actionCost || 1);
        return effB - effA;
      });

    for (const card of sortedHand) {
      if (cardsSelected >= maxCards) break;
      if (card.actionCost <= energyLeft) {
        selected.push(card);
        energyLeft -= card.actionCost;
        cardsSelected++;
      }
    }

    return selected;
  }

  private selectEnemyCards(state: GameBattleState): GameCard[] {
    const selected: GameCard[] = [];
    const cardsToPlay = state.enemy.cardsPerTurn;

    // 덱에서 카드 선택
    for (let i = 0; i < cardsToPlay && state.enemy.deck.length > 0; i++) {
      const cardId = state.enemy.deck[i % state.enemy.deck.length];
      const card = this.cards[cardId];
      if (card) {
        selected.push(card);
      }
    }

    return selected;
  }

  // ==================== 타임라인 배치 ====================

  private placeCardsOnTimeline(state: GameBattleState, playerCards: GameCard[], enemyCards: GameCard[]): void {
    state.timeline = [];

    // 플레이어 카드 배치
    for (const card of playerCards) {
      const speedMod = calculateSpeedModifier(state.player.tokens);
      const position = Math.max(1, (card.speedCost || 5) + speedMod);
      state.timeline.push({
        cardId: card.id,
        owner: 'player',
        position,
        crossed: false,
        executed: false,
      });
    }

    // 적 카드 배치
    for (const card of enemyCards) {
      const speedMod = calculateSpeedModifier(state.enemy.tokens);
      const position = Math.max(1, (card.speedCost || 5) + speedMod);
      state.timeline.push({
        cardId: card.id,
        owner: 'enemy',
        position,
        crossed: false,
        executed: false,
      });
    }

    // 위치순 정렬
    state.timeline.sort((a, b) => a.position - b.position);

    // 교차 체크
    this.checkCrossings(state);
  }

  private checkCrossings(state: GameBattleState): void {
    const playerPositions = new Set<number>();
    const enemyPositions = new Set<number>();

    for (const card of state.timeline) {
      if (card.owner === 'player') {
        playerPositions.add(card.position);
      } else {
        enemyPositions.add(card.position);
      }
    }

    // 같은 위치에 있는 카드들은 교차
    for (const card of state.timeline) {
      if (card.owner === 'player' && enemyPositions.has(card.position)) {
        card.crossed = true;
      }
      if (card.owner === 'enemy' && playerPositions.has(card.position)) {
        card.crossed = true;
      }
    }
  }

  // ==================== 타임라인 해결 ====================

  private resolveTimeline(state: GameBattleState): void {
    // 위치순으로 카드 발동
    const sortedCards = [...state.timeline].sort((a, b) => a.position - b.position);

    for (const timelineCard of sortedCards) {
      if (state.player.hp <= 0 || state.enemy.hp <= 0) break;
      if (timelineCard.executed) continue;

      const card = this.cards[timelineCard.cardId];
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

    // 상징 트리거
    if (this.config.enableRelics) {
      const cardEffects = this.relicSystem.processCardPlayed(state.player, state.enemy, card.id);
      this.applyRelicEffects(state, cardEffects);
    }

    // 특성 처리
    const traitMods = this.processTraits(card, state.player, timelineCard.crossed);

    // 공격 처리
    if (card.damage && card.damage > 0) {
      this.processAttack(state, 'player', card, traitMods, timelineCard.crossed);
    }

    // 방어 처리
    if (card.block && card.block > 0) {
      this.processBlock(state, 'player', card, traitMods, timelineCard);
    }

    // 토큰 적용
    if (card.appliedTokens) {
      for (const token of card.appliedTokens) {
        if (token.target === 'player') {
          state.player.tokens = addToken(state.player.tokens, token.id, token.stacks || 1);
          state.battleLog.push(`  플레이어: ${token.id} +${token.stacks || 1}`);
        } else {
          // 면역 체크
          const immunityCheck = checkImmunity(state.enemy.tokens, token.id);
          if (!immunityCheck.blocked) {
            state.enemy.tokens = addToken(state.enemy.tokens, token.id, token.stacks || 1);
            state.battleLog.push(`  적: ${token.id} +${token.stacks || 1}`);
          } else {
            state.enemy.tokens = immunityCheck.newTokens;
            state.battleLog.push(`  적: 면역으로 ${token.id} 차단`);
          }
        }
      }
    }
  }

  private executeEnemyCard(state: GameBattleState, card: GameCard, timelineCard: TimelineCard): void {
    this.emitEvent('card_execute', state.turn, { cardId: card.id, actor: 'enemy' });

    const traitMods = this.processTraits(card, state.enemy, timelineCard.crossed);

    // 공격 처리
    if (card.damage && card.damage > 0) {
      this.processAttack(state, 'enemy', card, traitMods, timelineCard.crossed);
    }

    // 방어 처리
    if (card.block && card.block > 0) {
      this.processBlock(state, 'enemy', card, traitMods, timelineCard);
    }

    // 토큰 적용
    if (card.appliedTokens) {
      for (const token of card.appliedTokens) {
        if (token.target === 'enemy') {
          state.enemy.tokens = addToken(state.enemy.tokens, token.id, token.stacks || 1);
        } else {
          // 면역 체크
          const immunityCheck = checkImmunity(state.player.tokens, token.id);
          if (!immunityCheck.blocked) {
            state.player.tokens = addToken(state.player.tokens, token.id, token.stacks || 1);
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
    crossed: boolean
  ): void {
    const attackerState = attacker === 'player' ? state.player : state.enemy;
    const defenderState = attacker === 'player' ? state.enemy : state.player;

    const hits = card.hits || 1;

    for (let hit = 0; hit < hits; hit++) {
      if (defenderState.hp <= 0) break;

      // 공격 수정자 계산
      const attackMods = calculateAttackModifiers(attackerState.tokens);
      const defenseMods = calculateDefenseModifiers(defenderState.tokens);
      const damageTakenMods = calculateDamageTakenModifiers(defenderState.tokens);

      // 기본 피해 계산
      let damage = card.damage || 0;

      // 힘 보너스
      damage += attackMods.damageBonus;

      // 공격력 배율
      damage = Math.floor(damage * attackMods.attackMultiplier);

      // 특성 배율
      damage = Math.floor(damage * traitMods.damageMultiplier);

      // 교차 보너스
      if (crossed && card.crossBonus?.type === 'damage_mult') {
        damage = Math.floor(damage * (card.crossBonus.value || 2));
        state.battleLog.push(`  ⚡ 교차 발동: 피해 ${card.crossBonus.value || 2}배`);
      }

      // 치명타 계산
      let isCrit = false;
      if (this.config.enableCrits) {
        const critChance = BASE_CRIT_CHANCE + (attackMods.critBoost / 100);
        isCrit = Math.random() < critChance;
        if (isCrit) {
          damage = Math.floor(damage * CRIT_MULTIPLIER);
        }
      }

      // 회피 체크
      if (defenseMods.dodgeChance > 0 && Math.random() < defenseMods.dodgeChance) {
        state.battleLog.push(`  ${attacker === 'player' ? '플레이어' : '적'}: ${card.name} → 회피!`);
        if (attacker === 'player') {
          state.enemy.tokens = consumeDamageTakenTokens(state.enemy.tokens);
        } else {
          state.player.tokens = consumeDamageTakenTokens(state.player.tokens);
        }
        continue;
      }

      // 피해 증폭 (허약 등)
      damage = Math.floor(damage * damageTakenMods.damageMultiplier);

      // 방어력 처리
      let actualDamage = damage;
      let blocked = 0;

      if (!attackMods.ignoreBlock) {
        blocked = Math.min(defenderState.block, damage);
        actualDamage = damage - blocked;
        defenderState.block -= blocked;
      }

      // 피해 적용
      defenderState.hp -= actualDamage;

      // 흡혈 처리
      if (attackMods.lifesteal > 0 && actualDamage > 0) {
        const healAmount = Math.floor(actualDamage * attackMods.lifesteal);
        attackerState.hp = Math.min(attackerState.maxHp, attackerState.hp + healAmount);
        state.battleLog.push(`  💚 흡수: ${healAmount} 회복`);
      }

      // 로그
      const critText = isCrit ? ' 💥치명타!' : '';
      const blockText = blocked > 0 ? ` (${blocked} 방어)` : '';
      state.battleLog.push(
        `  ${attacker === 'player' ? '플레이어' : '적'}: ${card.name}${hits > 1 ? ` (${hit + 1}/${hits})` : ''} → ${actualDamage} 피해${blockText}${critText}`
      );

      // 토큰 소모
      if (attacker === 'player') {
        state.player.tokens = consumeAttackTokens(state.player.tokens);
        state.enemy.tokens = consumeDamageTakenTokens(state.enemy.tokens);
      } else {
        state.enemy.tokens = consumeAttackTokens(state.enemy.tokens);
        state.player.tokens = consumeDamageTakenTokens(state.player.tokens);
      }

      // 반격 처리
      if (actualDamage > 0 && hasToken(defenderState.tokens, 'counter')) {
        const counterResult = processCounter(attackerState.tokens, defenderState.tokens);
        if (counterResult.damage > 0) {
          attackerState.hp -= counterResult.damage;
          defenderState.tokens = counterResult.newDefenderTokens;
          state.battleLog.push(`  ⚔️ 반격: ${counterResult.damage} 피해`);
        }
      }

      // 대응사격 처리
      if (actualDamage > 0 && hasToken(defenderState.tokens, 'counterShot')) {
        const counterShotResult = processCounterShot(attackerState.tokens, defenderState.tokens);
        if (counterShotResult.damage > 0) {
          attackerState.hp -= counterShotResult.damage;
          defenderState.tokens = counterShotResult.newDefenderTokens;
          state.battleLog.push(`  🔫 대응사격: ${counterShotResult.damage} 피해`);

          // 룰렛 체크
          const rouletteResult = checkRoulette(defenderState.tokens);
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
    timelineCard: TimelineCard
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

    // 토큰 소모
    if (actor === 'player') {
      state.player.tokens = consumeDefenseTokens(state.player.tokens);
    } else {
      state.enemy.tokens = consumeDefenseTokens(state.enemy.tokens);
    }

    state.battleLog.push(`  ${actor === 'player' ? '플레이어' : '적'}: ${card.name} → ${block} 방어`);
  }

  // ==================== 특성 처리 ====================

  interface TraitModifiers {
    damageMultiplier: number;
    blockMultiplier: number;
    speedModifier: number;
    effects: string[];
  }

  private processTraits(card: GameCard, actorState: PlayerState | EnemyState, crossed: boolean): TraitModifiers {
    const mods: TraitModifiers = {
      damageMultiplier: 1,
      blockMultiplier: 1,
      speedModifier: 0,
      effects: [],
    };

    if (!card.traits) return mods;

    for (const traitId of card.traits) {
      const trait = this.traits[traitId];
      if (!trait) continue;

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
          // 분쇄: 방어력에 2배 피해 (별도 처리 필요)
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
          // 연계: 다음 카드 앞당김
          actorState.tokens = addToken(actorState.tokens, 'chain_ready', 1);
          mods.effects.push('연계 준비');
          break;

        case 'followup':
          // 후속: 연계되면 50% 증폭
          if (hasToken(actorState.tokens, 'chain_ready')) {
            mods.damageMultiplier *= 1.5;
            mods.blockMultiplier *= 1.5;
            actorState.tokens = removeToken(actorState.tokens, 'chain_ready', 1);
            mods.effects.push('후속 발동');
          }
          break;

        case 'finisher':
          // 마무리: 연계되면 50% 피해 증가
          if (hasToken(actorState.tokens, 'chain_ready')) {
            mods.damageMultiplier *= 1.5;
            actorState.tokens = removeToken(actorState.tokens, 'chain_ready', 1);
            mods.effects.push('마무리 발동');
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
          // 협동: 조합에 포함되면 50% 추가 (콤보 체크 필요)
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
          // 날강도: 10 골드 소실 (골드 시스템 필요)
          break;
      }
    }

    return mods;
  }

  // ==================== 유틸리티 ====================

  private initializePlayer(deck: string[], relics: string[]): PlayerState {
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
      hand: [],
      deck: [...deck],
      discard: [],
      relics: [...relics],
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

  private applyRelicEffects(state: GameBattleState, effects: { effects: Record<string, unknown>; relicName: string }[]): void {
    for (const effect of effects) {
      const e = effect.effects as Record<string, number | undefined>;

      if (e.heal && typeof e.heal === 'number') {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + e.heal);
        state.battleLog.push(`  🎁 ${effect.relicName}: ${e.heal} 회복`);
      }
      if (e.damage && typeof e.damage === 'number') {
        state.player.hp -= e.damage;
        state.battleLog.push(`  💔 ${effect.relicName}: ${e.damage} 피해`);
      }
      if (e.block && typeof e.block === 'number') {
        state.player.block += e.block;
        state.battleLog.push(`  🛡️ ${effect.relicName}: ${e.block} 방어`);
      }
      if (e.strength && typeof e.strength === 'number') {
        state.player.tokens = addToken(state.player.tokens, 'strength', e.strength);
        state.battleLog.push(`  💪 ${effect.relicName}: 힘 +${e.strength}`);
      }
    }
  }

  private drawCards(player: PlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        // 버린 더미 셔플
        player.deck = [...player.discard];
        player.discard = [];
        this.shuffle(player.deck);
      }

      if (player.deck.length > 0) {
        const card = player.deck.pop();
        if (card) {
          player.hand.push(card);
        }
      }
    }
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

    return {
      winner,
      turns: state.turn,
      playerDamageDealt: 0, // TODO: 추적 필요
      enemyDamageDealt: 0,
      playerFinalHp: Math.max(0, state.player.hp),
      enemyFinalHp: Math.max(0, state.enemy.hp),
      etherGained: state.player.ether,
      battleLog: state.battleLog,
      events: this.events,
      cardUsage: {},
      comboStats: {},
      tokenStats: {},
      timeline: state.timeline,
    };
  }
}

// ==================== 특성 수정자 인터페이스 ====================

interface TraitModifiers {
  damageMultiplier: number;
  blockMultiplier: number;
  speedModifier: number;
  effects: string[];
}

// ==================== 팩토리 함수 ====================

export function createTimelineBattleEngine(config?: Partial<BattleEngineConfig>): TimelineBattleEngine {
  return new TimelineBattleEngine(config);
}
