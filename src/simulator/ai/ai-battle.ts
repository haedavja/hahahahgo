/**
 * @file ai-battle.ts
 * @description AI vs AI 대전 시스템 - 두 AI 플레이어가 자동으로 대전
 */

import type { GameState, SimPlayerState, SimEnemyState, BattleResult } from '../core/types';
import { MCTSEngine, MCTSPlayer, type MCTSOptions, type MCTSResult } from '../analysis/mcts';
import { BattleEngine, createPlayerState, createEnemyState, type CardDefinition } from '../core/battle-engine';
import { AdvancedBattleAI, type BattleContext, type CardSelectionResult } from './advanced-battle-ai';
import type { GameCard, TokenState } from '../core/game-types';
import { loadCards, loadEnemies } from '../data/loader';
import { getLogger } from '../core/logger';
import { createError, safeAsync } from '../core/error-handling';

const log = getLogger('AIBattle');

// ==================== AI 타입 정의 ====================

export type AIType = 'mcts' | 'greedy' | 'random' | 'defensive' | 'aggressive' | 'advanced';

export interface AIConfig {
  type: AIType;
  name: string;
  deck: string[];
  hp?: number;
  energy?: number;
  relics?: string[];
  mctsOptions?: Partial<MCTSOptions>;
}

export interface AIBattleConfig {
  player1: AIConfig;
  player2: AIConfig;
  maxTurns?: number;
  verbose?: boolean;
}

export interface AIBattleResult {
  winner: 'player1' | 'player2' | 'draw';
  turns: number;
  player1FinalHp: number;
  player2FinalHp: number;
  player1DamageDealt: number;
  player2DamageDealt: number;
  turnHistory: TurnRecord[];
  duration: number;
}

export interface TurnRecord {
  turn: number;
  player: 'player1' | 'player2';
  action: string;
  cardsPlayed: string[];
  damageDealt: number;
  player1Hp: number;
  player2Hp: number;
}

// ==================== AI 전략 구현 ====================

interface AIStrategy {
  selectCards(state: GameState, cards: CardDefinition[]): CardDefinition[];
}

class GreedyAI implements AIStrategy {
  selectCards(state: GameState, cards: CardDefinition[]): CardDefinition[] {
    // 가장 높은 피해를 주는 카드부터 선택
    const sorted = [...cards].sort((a, b) => {
      const scoreA = (a.damage || 0) * (a.hits || 1) + (a.block || 0) * 0.5;
      const scoreB = (b.damage || 0) * (b.hits || 1) + (b.block || 0) * 0.5;
      return scoreB - scoreA;
    });

    const selected: CardDefinition[] = [];
    let energy = state.player.energy;

    for (const card of sorted) {
      if (card.cost <= energy && selected.length < 3) {
        selected.push(card);
        energy -= card.cost;
      }
    }

    return selected;
  }
}

class RandomAI implements AIStrategy {
  selectCards(state: GameState, cards: CardDefinition[]): CardDefinition[] {
    const playable = cards.filter(c => c.cost <= state.player.energy);
    const shuffled = [...playable].sort(() => Math.random() - 0.5);

    const selected: CardDefinition[] = [];
    let energy = state.player.energy;

    for (const card of shuffled) {
      if (card.cost <= energy && selected.length < 3) {
        selected.push(card);
        energy -= card.cost;
      }
    }

    return selected;
  }
}

class DefensiveAI implements AIStrategy {
  selectCards(state: GameState, cards: CardDefinition[]): CardDefinition[] {
    // 체력이 낮으면 방어 우선, 그렇지 않으면 균형
    const hpRatio = state.player.hp / state.player.maxHp;

    const sorted = [...cards].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (hpRatio < 0.3) {
        // 위기 상황: 방어 우선
        scoreA = (a.block || 0) * 2 + (a.damage || 0);
        scoreB = (b.block || 0) * 2 + (b.damage || 0);
      } else {
        // 일반 상황: 균형
        scoreA = (a.block || 0) + (a.damage || 0);
        scoreB = (b.block || 0) + (b.damage || 0);
      }

      return scoreB - scoreA;
    });

    const selected: CardDefinition[] = [];
    let energy = state.player.energy;

    for (const card of sorted) {
      if (card.cost <= energy && selected.length < 3) {
        selected.push(card);
        energy -= card.cost;
      }
    }

    return selected;
  }
}

class AggressiveAI implements AIStrategy {
  selectCards(state: GameState, cards: CardDefinition[]): CardDefinition[] {
    // 공격 카드 우선
    const sorted = [...cards].sort((a, b) => {
      const scoreA = (a.damage || 0) * (a.hits || 1) * 2 + (a.block || 0);
      const scoreB = (b.damage || 0) * (b.hits || 1) * 2 + (b.block || 0);
      return scoreB - scoreA;
    });

    const selected: CardDefinition[] = [];
    let energy = state.player.energy;

    for (const card of sorted) {
      if (card.cost <= energy && selected.length < 3) {
        selected.push(card);
        energy -= card.cost;
      }
    }

    return selected;
  }
}

/**
 * 고급 AI - AdvancedBattleAI를 래핑
 * 타임라인, 특성, 상황별 전략을 고려한 카드 선택
 */
class AdvancedAIWrapper implements AIStrategy {
  private advancedAI: AdvancedBattleAI;
  private cardLibrary: Record<string, CardDefinition>;

  constructor(cardLibrary: Record<string, CardDefinition>) {
    // CardDefinition을 GameCard 형태로 변환
    const gameCardLibrary: Record<string, GameCard> = {};
    for (const [id, card] of Object.entries(cardLibrary)) {
      gameCardLibrary[id] = {
        id: card.id,
        name: card.name,
        type: card.type as 'attack' | 'defense' | 'skill' | 'reaction',
        speedCost: 3, // 기본값
        energyCost: card.cost,
        actionCost: card.cost,
        description: (card as { description?: string }).description || '',
        damage: card.damage,
        block: card.block,
        hits: card.hits,
        traits: card.traits,
      };
    }
    this.advancedAI = new AdvancedBattleAI(gameCardLibrary, false);
    this.cardLibrary = cardLibrary;
  }

  selectCards(state: GameState, cards: CardDefinition[]): CardDefinition[] {
    // BattleContext 생성
    const context: BattleContext = {
      playerHp: state.player.hp,
      playerMaxHp: state.player.maxHp,
      playerBlock: state.player.block,
      playerTokens: (state.player.tokens || {}) as TokenState,
      enemyHp: state.enemy.hp,
      enemyMaxHp: state.enemy.maxHp,
      enemyBlock: state.enemy.block,
      enemyTokens: (state.enemy.tokens || {}) as TokenState,
      turn: state.turn || 1,
      timeline: state.timeline || [],
      playerEnergy: state.player.energy,
    };

    // 핸드 카드 ID 목록
    const handIds = cards.map(c => c.id);

    // 고급 AI로 카드 선택
    const result: CardSelectionResult = this.advancedAI.selectCards(handIds, context, 3);

    // 선택된 카드를 CardDefinition으로 변환
    const selectedCards: CardDefinition[] = [];
    for (const evaluation of result.selectedCards) {
      const card = this.cardLibrary[evaluation.cardId];
      if (card) {
        selectedCards.push(card);
      }
    }

    return selectedCards;
  }
}

// 고급 AI 인스턴스 캐시 (카드 라이브러리가 같으면 재사용)
let cachedAdvancedAI: AdvancedAIWrapper | null = null;
let cachedCardLibrary: Record<string, CardDefinition> | null = null;

function createAIStrategy(type: AIType, cardLibrary?: Record<string, CardDefinition>): AIStrategy {
  switch (type) {
    case 'greedy':
      return new GreedyAI();
    case 'random':
      return new RandomAI();
    case 'defensive':
      return new DefensiveAI();
    case 'aggressive':
      return new AggressiveAI();
    case 'advanced':
      if (cardLibrary) {
        // 카드 라이브러리가 같으면 캐시된 인스턴스 재사용
        if (cachedAdvancedAI && cachedCardLibrary === cardLibrary) {
          return cachedAdvancedAI;
        }
        cachedCardLibrary = cardLibrary;
        cachedAdvancedAI = new AdvancedAIWrapper(cardLibrary);
        return cachedAdvancedAI;
      }
      // 카드 라이브러리 없으면 Greedy로 폴백
      log.warn('Advanced AI requested without card library, falling back to Greedy');
      return new GreedyAI();
    default:
      return new GreedyAI();
  }
}

// ==================== AI 대전 엔진 ====================

export class AIBattleEngine {
  private cards: Record<string, CardDefinition>;
  private maxTurns: number;
  private verbose: boolean;

  constructor(cardData?: Record<string, CardDefinition>) {
    this.cards = cardData || this.loadCardData();
    this.maxTurns = 30;
    this.verbose = false;
  }

  private loadCardData(): Record<string, CardDefinition> {
    const rawCards = loadCards();
    const result: Record<string, CardDefinition> = {};

    for (const [id, card] of Object.entries(rawCards)) {
      result[id] = {
        id,
        name: card.name || id,
        type: (card.type as 'attack' | 'defense' | 'skill') || 'attack',
        cost: card.cost || 0,
        damage: card.attack,
        block: card.defense,
        hits: card.hits,
        traits: card.traits,
      };
    }

    return result;
  }

  async runBattle(config: AIBattleConfig): Promise<AIBattleResult> {
    log.time('ai_battle');
    this.maxTurns = config.maxTurns || 30;
    this.verbose = config.verbose || false;

    log.info('AI Battle started', {
      player1: `${config.player1.name} (${config.player1.type})`,
      player2: `${config.player2.name} (${config.player2.type})`,
      maxTurns: this.maxTurns,
    });

    // 플레이어 상태 초기화
    const player1State = this.createPlayerState(config.player1);
    const player2State = this.createPlayerState(config.player2);

    // AI 전략 또는 MCTS 엔진 생성
    const ai1 = config.player1.type === 'mcts'
      ? new MCTSEngine(config.player1.mctsOptions)
      : createAIStrategy(config.player1.type, this.cards);

    const ai2 = config.player2.type === 'mcts'
      ? new MCTSEngine(config.player2.mctsOptions)
      : createAIStrategy(config.player2.type, this.cards);

    const turnHistory: TurnRecord[] = [];
    let turn = 0;
    let player1DamageDealt = 0;
    let player2DamageDealt = 0;

    // 초기 핸드 드로우
    this.drawCards(player1State, 5);
    this.drawCards(player2State, 5);

    while (turn < this.maxTurns && player1State.hp > 0 && player2State.hp > 0) {
      turn++;

      // 턴 시작 처리
      player1State.block = 0;
      player2State.block = 0;
      player1State.energy = player1State.maxEnergy;
      player2State.energy = player2State.maxEnergy;

      // Player 1 턴
      const p1Cards = await this.selectCards(ai1, config.player1.type, player1State, player2State);
      const p1Result = this.executeCards(p1Cards, player1State, player2State);
      player1DamageDealt += p1Result.damageDealt;

      turnHistory.push({
        turn,
        player: 'player1',
        action: config.player1.type,
        cardsPlayed: p1Cards.map(c => c.id),
        damageDealt: p1Result.damageDealt,
        player1Hp: player1State.hp,
        player2Hp: player2State.hp,
      });

      if (this.verbose) {
        log.debug(`Turn ${turn} - P1: ${p1Cards.map(c => c.name).join(', ')} → ${p1Result.damageDealt} dmg`);
      }

      if (player2State.hp <= 0) break;

      // Player 2 턴
      const p2Cards = await this.selectCards(ai2, config.player2.type, player2State, player1State);
      const p2Result = this.executeCards(p2Cards, player2State, player1State);
      player2DamageDealt += p2Result.damageDealt;

      turnHistory.push({
        turn,
        player: 'player2',
        action: config.player2.type,
        cardsPlayed: p2Cards.map(c => c.id),
        damageDealt: p2Result.damageDealt,
        player1Hp: player1State.hp,
        player2Hp: player2State.hp,
      });

      if (this.verbose) {
        log.debug(`Turn ${turn} - P2: ${p2Cards.map(c => c.name).join(', ')} → ${p2Result.damageDealt} dmg`);
      }

      // 핸드 버리기 및 드로우
      player1State.discard.push(...player1State.hand);
      player1State.hand = [];
      this.drawCards(player1State, 5);

      player2State.discard.push(...player2State.hand);
      player2State.hand = [];
      this.drawCards(player2State, 5);
    }

    // 승자 결정
    let winner: 'player1' | 'player2' | 'draw';
    if (player2State.hp <= 0 && player1State.hp > 0) {
      winner = 'player1';
    } else if (player1State.hp <= 0 && player2State.hp > 0) {
      winner = 'player2';
    } else if (player1State.hp <= 0 && player2State.hp <= 0) {
      winner = 'draw';
    } else {
      winner = player1State.hp > player2State.hp ? 'player1' :
               player2State.hp > player1State.hp ? 'player2' : 'draw';
    }

    const duration = log.timeEnd('ai_battle', 'AI Battle completed');

    log.info('AI Battle result', {
      winner,
      turns: turn,
      player1Hp: player1State.hp,
      player2Hp: player2State.hp,
      duration,
    });

    return {
      winner,
      turns: turn,
      player1FinalHp: Math.max(0, player1State.hp),
      player2FinalHp: Math.max(0, player2State.hp),
      player1DamageDealt,
      player2DamageDealt,
      turnHistory,
      duration,
    };
  }

  private createPlayerState(config: AIConfig): SimPlayerState {
    const deck = [...config.deck];
    this.shuffle(deck);

    return {
      hp: config.hp || 100,
      maxHp: config.hp || 100,
      block: 0,
      strength: 0,
      etherPts: 0,
      tokens: {},
      deck,
      hand: [],
      discard: [],
      energy: config.energy || 3,
      maxEnergy: config.energy || 3,
      relics: config.relics || [],
    };
  }

  private async selectCards(
    ai: MCTSEngine | AIStrategy,
    type: AIType,
    attacker: SimPlayerState,
    defender: SimPlayerState
  ): Promise<CardDefinition[]> {
    // 핸드의 카드들을 CardDefinition으로 변환
    const handCards = attacker.hand
      .map(id => this.cards[id])
      .filter((c): c is CardDefinition => c !== undefined);

    if (type === 'mcts') {
      // MCTS 사용
      const mctsEngine = ai as MCTSEngine;
      const gameState = this.createGameState(attacker, defender);
      const result = mctsEngine.findBestAction(gameState);

      if (result.bestAction) {
        const card = this.cards[result.bestAction];
        return card ? [card] : [];
      }
      return [];
    } else {
      // 일반 AI 전략 사용
      const strategy = ai as AIStrategy;
      const gameState = this.createGameState(attacker, defender);
      return strategy.selectCards(gameState, handCards);
    }
  }

  private createGameState(player: SimPlayerState, enemy: SimPlayerState): GameState {
    return {
      player: { ...player },
      enemy: {
        id: 'opponent',
        name: 'Opponent',
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        block: enemy.block,
        strength: enemy.strength,
        etherPts: enemy.etherPts,
        tokens: { ...enemy.tokens },
        deck: [...enemy.deck],
        cardsPerTurn: 1,
      },
      turn: 1,
      phase: 'select',
      timeline: [],
    };
  }

  private executeCards(
    cards: CardDefinition[],
    attacker: SimPlayerState,
    defender: SimPlayerState
  ): { damageDealt: number } {
    let damageDealt = 0;

    for (const card of cards) {
      if (card.cost > attacker.energy) continue;
      attacker.energy -= card.cost;

      // 핸드에서 제거
      const handIdx = attacker.hand.indexOf(card.id);
      if (handIdx >= 0) {
        attacker.hand.splice(handIdx, 1);
        attacker.discard.push(card.id);
      }

      // 공격
      if (card.damage) {
        const hits = card.hits || 1;
        for (let i = 0; i < hits; i++) {
          let damage = card.damage + attacker.strength;

          // 취약
          if (defender.tokens['vulnerable']) {
            damage = Math.floor(damage * 1.5);
          }

          // 무딤
          if (attacker.tokens['weak']) {
            damage = Math.floor(damage * 0.75);
          }

          const blocked = Math.min(defender.block, damage);
          const actualDamage = Math.max(0, damage - defender.block);
          defender.block = Math.max(0, defender.block - damage);
          defender.hp -= actualDamage;
          damageDealt += actualDamage;

          if (defender.hp <= 0) break;
        }
      }

      // 방어
      if (card.block) {
        attacker.block += card.block;
      }

      if (defender.hp <= 0) break;
    }

    return { damageDealt };
  }

  private drawCards(player: SimPlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        player.deck = [...player.discard];
        player.discard = [];
        this.shuffle(player.deck);
      }
      if (player.deck.length > 0) {
        player.hand.push(player.deck.pop()!);
      }
    }
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// ==================== 토너먼트 시스템 ====================

export interface TournamentConfig {
  participants: AIConfig[];
  roundsPerMatch?: number;
  verbose?: boolean;
}

export interface TournamentResult {
  standings: Array<{
    name: string;
    type: AIType;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    damageDealt: number;
    damageTaken: number;
  }>;
  matches: Array<{
    player1: string;
    player2: string;
    results: AIBattleResult[];
    winner: string | null;
  }>;
  duration: number;
}

export class AITournament {
  private engine: AIBattleEngine;

  constructor() {
    this.engine = new AIBattleEngine();
  }

  async run(config: TournamentConfig): Promise<TournamentResult> {
    log.time('tournament');
    const rounds = config.roundsPerMatch || 3;
    const participants = config.participants;

    log.info('Tournament started', {
      participants: participants.length,
      roundsPerMatch: rounds,
    });

    const standings: Map<string, {
      name: string;
      type: AIType;
      wins: number;
      losses: number;
      draws: number;
      damageDealt: number;
      damageTaken: number;
    }> = new Map();

    // 스탠딩 초기화
    for (const p of participants) {
      standings.set(p.name, {
        name: p.name,
        type: p.type,
        wins: 0,
        losses: 0,
        draws: 0,
        damageDealt: 0,
        damageTaken: 0,
      });
    }

    const matches: TournamentResult['matches'] = [];

    // 리그전 (모든 참가자끼리 대결)
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i];
        const p2 = participants[j];

        log.debug(`Match: ${p1.name} vs ${p2.name}`);

        const results: AIBattleResult[] = [];
        let p1Wins = 0;
        let p2Wins = 0;

        // 라운드 진행
        for (let r = 0; r < rounds; r++) {
          const result = await this.engine.runBattle({
            player1: p1,
            player2: p2,
            verbose: config.verbose,
          });

          results.push(result);

          if (result.winner === 'player1') p1Wins++;
          else if (result.winner === 'player2') p2Wins++;

          // 스탯 업데이트
          const s1 = standings.get(p1.name)!;
          const s2 = standings.get(p2.name)!;
          s1.damageDealt += result.player1DamageDealt;
          s1.damageTaken += result.player2DamageDealt;
          s2.damageDealt += result.player2DamageDealt;
          s2.damageTaken += result.player1DamageDealt;
        }

        // 매치 승자 결정
        let matchWinner: string | null = null;
        const s1 = standings.get(p1.name)!;
        const s2 = standings.get(p2.name)!;

        if (p1Wins > p2Wins) {
          s1.wins++;
          s2.losses++;
          matchWinner = p1.name;
        } else if (p2Wins > p1Wins) {
          s2.wins++;
          s1.losses++;
          matchWinner = p2.name;
        } else {
          s1.draws++;
          s2.draws++;
        }

        matches.push({
          player1: p1.name,
          player2: p2.name,
          results,
          winner: matchWinner,
        });

        log.debug(`Match result: ${p1.name} ${p1Wins} - ${p2Wins} ${p2.name}`);
      }
    }

    // 순위 계산 (승리 3점, 무승부 1점)
    const sortedStandings = Array.from(standings.values())
      .map(s => ({
        ...s,
        points: s.wins * 3 + s.draws,
      }))
      .sort((a, b) => b.points - a.points || (b.damageDealt - b.damageTaken) - (a.damageDealt - a.damageTaken));

    const duration = log.timeEnd('tournament', 'Tournament completed');

    log.info('Tournament result', {
      winner: sortedStandings[0]?.name,
      topScore: sortedStandings[0]?.points,
    });

    return {
      standings: sortedStandings,
      matches,
      duration,
    };
  }
}

// ==================== 유틸리티 함수 ====================

export async function runQuickAIBattle(
  deck1: string[],
  deck2: string[],
  ai1Type: AIType = 'greedy',
  ai2Type: AIType = 'greedy'
): Promise<AIBattleResult> {
  const engine = new AIBattleEngine();

  return engine.runBattle({
    player1: {
      type: ai1Type,
      name: 'Player 1',
      deck: deck1,
    },
    player2: {
      type: ai2Type,
      name: 'Player 2',
      deck: deck2,
    },
  });
}

export async function benchmarkAITypes(
  deck: string[],
  iterations: number = 10
): Promise<Record<AIType, { winRate: number; avgTurns: number; avgDamage: number }>> {
  const aiTypes: AIType[] = ['greedy', 'random', 'defensive', 'aggressive', 'advanced'];
  const results: Record<string, { wins: number; totalTurns: number; totalDamage: number }> = {};

  for (const type of aiTypes) {
    results[type] = { wins: 0, totalTurns: 0, totalDamage: 0 };
  }

  const engine = new AIBattleEngine();

  // 각 AI 타입을 greedy와 대결
  for (const type of aiTypes) {
    for (let i = 0; i < iterations; i++) {
      const result = await engine.runBattle({
        player1: { type, name: type, deck: [...deck] },
        player2: { type: 'greedy', name: 'greedy', deck: [...deck] },
      });

      if (result.winner === 'player1') {
        results[type].wins++;
      }
      results[type].totalTurns += result.turns;
      results[type].totalDamage += result.player1DamageDealt;
    }
  }

  const summary = {} as Record<AIType, { winRate: number; avgTurns: number; avgDamage: number }>;

  for (const type of aiTypes) {
    summary[type] = {
      winRate: results[type].wins / iterations,
      avgTurns: results[type].totalTurns / iterations,
      avgDamage: results[type].totalDamage / iterations,
    };
  }

  return summary;
}
