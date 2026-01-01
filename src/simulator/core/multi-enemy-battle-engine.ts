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
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  calculateSpeedModifier,
  processTurnEnd,
  processBurn,
  checkImmunity,
} from './token-system';
import { getRelicSystemV2 } from './relic-system-v2';
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
  private enemyAIs: Map<number, EnemyAI> = new Map();
  private enhancedCards: Record<string, GameCard> = {};
  private cardEnhancements: Record<string, number> = {};

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
   * 카드 조회 (강화 적용)
   */
  private getCard(cardId: string): GameCard | undefined {
    return this.enhancedCards[cardId] || this.cards[cardId];
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
    // 단일 적이면 기본 엔진 사용
    if (enemies.length === 1) {
      const baseEngine = new TimelineBattleEngine({ verbose: this.config.verbose });
      const result = baseEngine.runBattle(playerDeck, playerRelics, enemies[0], anomalyId, cardEnhancements);
      return this.convertToMultiEnemyResult(result, enemies);
    }

    // 카드 강화 초기화
    this.cardEnhancements = cardEnhancements || {};
    this.enhancedCards = {};
    this.buildEnhancedCardCache();

    // 적 AI 초기화
    this.initializeEnemyAIs(enemies);

    // 플레이어 초기화
    const player = this.initializePlayer(playerDeck, playerRelics);

    // 전투 상태 초기화
    const state: MultiEnemyBattleState = {
      player,
      enemies: enemies.map(e => ({ ...e })),
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
      hp: 80,
      maxHp: 80,
      block: 0,
      energy: DEFAULT_PLAYER_ENERGY,
      maxEnergy: DEFAULT_PLAYER_ENERGY,
      ether: 0,
      insight: 0,
      deck: [...deck],
      hand: [],
      discard: [],
      tokens: [],
      strength: 0,
      agility: 0,
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
    state.player.energy = state.player.maxEnergy;
    state.timeline = [];

    // 화상 피해 처리
    const burnResult = processBurn(state.player.tokens);
    if (burnResult.damage > 0) {
      state.player.hp -= burnResult.damage;
      state.battleLog.push(`🔥 화상 피해: ${burnResult.damage}`);
    }

    if (state.player.hp <= 0) return;

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

    // 핸드 버리기 및 드로우
    state.player.discard.push(...state.player.hand);
    state.player.hand = [];
    this.drawCards(state.player, DEFAULT_HAND_SIZE);

    // 토큰 턴 종료 처리
    state.player.tokens = processTurnEnd(state.player.tokens);
    for (const enemy of state.enemies) {
      if (enemy.hp > 0) {
        enemy.tokens = processTurnEnd(enemy.tokens);
      }
    }
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
   * 적 카드 기본 선택 (랜덤)
   */
  private selectEnemyCardsBasic(enemy: EnemyState): GameCard[] {
    const available: GameCard[] = [];
    for (const cardId of enemy.deck) {
      const card = this.cards[cardId];
      if (card) available.push(card);
    }

    this.shuffle(available);
    return available.slice(0, enemy.cardsPerTurn);
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

    if (card.traits) {
      for (const trait of card.traits) {
        if (trait === 'swift') position -= 2;
        if (trait === 'slow') position += 3;
        if (trait === 'last') position = this.config.maxSpeed;
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

    // 타겟 결정
    const targets = this.determineTargets(state, card);

    if (targets.length === 0) {
      state.battleLog.push(`  ⚠️ ${card.name}: 대상 없음`);
      return;
    }

    // 공격 처리
    if (card.damage && card.damage > 0) {
      const hits = card.hits || 1;
      const baseDamage = card.damage + (state.player.strength || 0);

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

          // 방어력 처리
          const blocked = Math.min(enemy.block, damage);
          const actualDamage = damage - blocked;
          enemy.block = Math.max(0, enemy.block - damage);
          enemy.hp -= actualDamage;

          state.playerDamageDealt += actualDamage;

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
      let block = card.block + (state.player.agility || 0);

      if (tc.crossed && card.crossBonus?.type === 'block_mult') {
        block = Math.floor(block * (card.crossBonus.value || 1.5));
      }

      state.player.block += block;
      state.battleLog.push(`  🛡️ ${card.name}: 방어 +${block}`);
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
      const strength = this.getTokenStacks(enemy.tokens, 'strength');
      const baseDamage = card.damage + strength;

      for (let hit = 0; hit < hits; hit++) {
        if (state.player.hp <= 0) break;

        let damage = baseDamage;

        // 취약 체크
        const vulnerable = this.getTokenStacks(state.player.tokens, 'vulnerable');
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
   * 토큰 스택 수 가져오기
   */
  private getTokenStacks(tokens: TokenState[], tokenId: string): number {
    const token = tokens.find(t => t.id === tokenId);
    return token?.stacks || 0;
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

    return {
      winner,
      turns: state.turn,
      playerDamageDealt: state.playerDamageDealt,
      enemyDamageDealt: state.totalEnemyDamageDealt,
      playerFinalHp: Math.max(0, state.player.hp),
      enemyFinalHp: state.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0),
      etherGained: 0,
      goldChange: 0,
      battleLog: state.battleLog,
      events: [],
      cardUsage: state.cardUsage,
      comboStats: {},
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
