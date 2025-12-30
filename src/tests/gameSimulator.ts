/**
 * @file gameSimulator.ts
 * @description 게임 시뮬레이터 - 자동 전투 및 통계 수집
 *
 * ## 기능
 * - 다수의 전투 자동 시뮬레이션
 * - 승률, 평균 피해량, 턴 수 등 통계 수집
 * - 카드별 효율 분석
 *
 * ## 신뢰성 v2
 * - 실제 combatActions 로직 사용
 * - 토큰 시스템 통합 (공세, 방어, 회피 등)
 * - 적 패시브 효과 적용
 * - 치명타/반격 시스템
 */

import type { Card, TokenState } from '../types/core';
import type { AICard, AIMode, Combatant, BattleContext } from '../types';
import { CARDS, ENEMY_CARDS, ENEMIES, DEFAULT_STARTING_DECK } from '../components/battle/battleData';
import { applyAction } from '../components/battle/logic/combatActions';
import { decideEnemyMode, generateEnemyActions } from '../components/battle/utils/enemyAI';
import { getPatternAction, patternActionToMode, ENEMY_PATTERNS } from '../data/enemyPatterns';
import { createEmptyTokenState } from '../test/factories';
import { addToken, removeToken, hasToken, getTokenStacks, clearTurnTokens } from '../lib/tokenUtils';
import { TOKENS } from '../data/tokens';

// ==================== 타입 정의 ====================

export interface SimEntity {
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  etherPts: number;
  tokens: TokenState;
  def?: boolean;
  counter?: number;
  vulnMult?: number;
  etherOverdriveActive?: boolean;
}

export interface SimPlayerState extends SimEntity {
  deck: string[];
  hand: string[];
  discard: string[];
  energy: number;
  maxEnergy: number;
}

export interface SimEnemyState extends SimEntity {
  id: string;
  name: string;
  deck: string[];
  cardsPerTurn: number;
}

export interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  cardUsage: Record<string, number>;
  log: string[];
}

export interface SimulationStats {
  totalBattles: number;
  playerWins: number;
  enemyWins: number;
  draws: number;
  winRate: number;
  avgTurns: number;
  avgPlayerDamageDealt: number;
  avgEnemyDamageDealt: number;
  avgPlayerFinalHp: number;
  cardEfficiency: Record<string, { uses: number; avgDamage: number }>;
  enemyStats: Record<string, { battles: number; winRate: number }>;
}

export interface SimulationConfig {
  battles: number;
  maxTurns: number;
  enemyIds?: string[];
  playerDeck?: string[];
  playerHp?: number;
  verbose?: boolean;
}

// ==================== 헬퍼 함수 ====================

function getCardById(cardId: string): Card | AICard | undefined {
  const playerCard = CARDS.find((c: { id: string }) => c.id === cardId);
  if (playerCard) return playerCard as Card;

  const enemyCard = ENEMY_CARDS.find((c: AICard) => c.id === cardId);
  return enemyCard;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function drawCards(player: SimPlayerState, count: number): void {
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      // 버린 카드 더미를 셔플해서 덱으로
      if (player.discard.length === 0) break;
      player.deck = shuffle(player.discard);
      player.discard = [];
    }
    const card = player.deck.pop();
    if (card) player.hand.push(card);
  }
}

function createPlayer(config: SimulationConfig): SimPlayerState {
  const deckIds = config.playerDeck || DEFAULT_STARTING_DECK;
  return {
    hp: config.playerHp || 100,
    maxHp: config.playerHp || 100,
    block: 0,
    strength: 0,
    etherPts: 0,
    tokens: createEmptyTokenState(),
    deck: shuffle([...deckIds]),
    hand: [],
    discard: [],
    energy: 6,
    maxEnergy: 6,
  };
}

function createEnemy(enemyId: string): SimEnemyState {
  const def = ENEMIES.find(e => e.id === enemyId);
  if (!def) throw new Error(`Enemy not found: ${enemyId}`);

  return {
    id: def.id,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    block: 0,
    strength: 0,
    etherPts: 0,
    tokens: createEmptyTokenState(),
    deck: [...def.deck],
    cardsPerTurn: def.cardsPerTurn,
  };
}

// ==================== AI 시스템 ====================

function selectPlayerActions(player: SimPlayerState): { cards: (Card | AICard)[]; indices: number[] } {
  // 간단한 AI: 손패에서 에너지가 허용하는 한 카드 선택
  // 우선순위: 공격 > 방어 > 기타
  const cards: (Card | AICard)[] = [];
  const indices: number[] = [];
  let energy = player.energy;
  let speed = 0;
  const maxSpeed = 30;

  // 손패를 카드 객체로 변환
  const handCards = player.hand
    .map((id, idx) => ({ card: getCardById(id), idx }))
    .filter((item): item is { card: Card | AICard; idx: number } => item.card !== undefined);

  // 공격 카드 우선 선택
  const attacks = handCards.filter(h => h.card.type === 'attack');
  const defenses = handCards.filter(h => h.card.type === 'defense' || h.card.type === 'general');
  const others = handCards.filter(h => h.card.type !== 'attack' && h.card.type !== 'defense' && h.card.type !== 'general');

  const sorted = [...attacks, ...defenses, ...others];

  for (const { card, idx } of sorted) {
    const cost = card.actionCost || 1;
    const spCost = card.speedCost || 5;

    if (energy >= cost && speed + spCost <= maxSpeed && !indices.includes(idx)) {
      cards.push(card);
      indices.push(idx);
      energy -= cost;
      speed += spCost;

      if (cards.length >= 3) break; // 최대 3장
    }
  }

  return { cards, indices };
}

function selectEnemyActions(enemy: SimEnemyState, turnNumber: number): AICard[] {
  // 패턴이 있으면 패턴 사용
  const patternConfig = ENEMY_PATTERNS[enemy.id];
  let mode: AIMode | null = null;

  if (patternConfig) {
    const action = getPatternAction(enemy.id, turnNumber, enemy.hp, enemy.maxHp);
    if (action) {
      const actionMode = patternActionToMode(action, patternConfig);
      mode = { name: actionMode.key, key: actionMode.key, prefer: actionMode.prefer } as AIMode;
    }
  }

  if (!mode) {
    mode = decideEnemyMode(enemy.id);
  }

  const actions = generateEnemyActions(
    { id: enemy.id, hp: enemy.hp, deck: enemy.deck } as never,
    mode,
    0,
    enemy.cardsPerTurn,
    1
  );

  return actions;
}

// ==================== 토큰 효과 적용 ====================

function applyTokenEffectsToCard(entity: SimEntity, card: Card | AICard, isAttack: boolean): { damageBonus: number; blockBonus: number } {
  let damageBonus = 0;
  let blockBonus = 0;

  if (isAttack) {
    // 공세 토큰 (usage) - 50% 데미지 증가
    if (hasToken(entity as any, 'offense')) {
      damageBonus += 0.5;
    }
    if (hasToken(entity as any, 'offensePlus')) {
      damageBonus += 1.0;
    }
    // 공격 토큰 (turn) - 50% 데미지 증가
    if (hasToken(entity as any, 'attack')) {
      damageBonus += 0.5;
    }
    if (hasToken(entity as any, 'attackPlus')) {
      damageBonus += 1.0;
    }
  } else {
    // 수세 토큰 (usage) - 50% 방어력 증가
    if (hasToken(entity as any, 'guard')) {
      blockBonus += 0.5;
    }
    if (hasToken(entity as any, 'guardPlus')) {
      blockBonus += 1.0;
    }
    // 방어 토큰 (turn) - 50% 방어력 증가
    if (hasToken(entity as any, 'defense')) {
      blockBonus += 0.5;
    }
    if (hasToken(entity as any, 'defensePlus')) {
      blockBonus += 1.0;
    }
  }

  return { damageBonus, blockBonus };
}

function rollDodge(defender: SimEntity): boolean {
  // 흐릿함 토큰 - 50% 회피
  if (hasToken(defender as any, 'blur')) {
    if (Math.random() < 0.5) {
      removeToken(defender as any, 'blur', 'usage', 1);
      return true;
    }
    removeToken(defender as any, 'blur', 'usage', 1);
  }
  // 흐릿함+ 토큰 - 75% 회피
  if (hasToken(defender as any, 'blurPlus')) {
    if (Math.random() < 0.75) {
      removeToken(defender as any, 'blurPlus', 'usage', 1);
      return true;
    }
    removeToken(defender as any, 'blurPlus', 'usage', 1);
  }
  // 회피 토큰 (turn) - 50% 회피
  if (hasToken(defender as any, 'dodge')) {
    if (Math.random() < 0.5) {
      return true;
    }
  }
  return false;
}

function applyCardTokenEffects(card: Card | AICard, actor: SimEntity, target: SimEntity): void {
  // 카드에 정의된 토큰 적용
  const appliedTokens = (card as any).appliedTokens;
  if (appliedTokens && Array.isArray(appliedTokens)) {
    for (const tokenInfo of appliedTokens) {
      const targetEntity = tokenInfo.target === 'enemy' ? target : actor;
      const result = addToken(targetEntity as any, tokenInfo.id, tokenInfo.stacks || 1);
      targetEntity.tokens = result.tokens;
    }
  }
}

// ==================== 전투 시뮬레이션 ====================

function simulateTurn(
  player: SimPlayerState,
  enemy: SimEnemyState,
  turnNumber: number,
  log: string[],
  enemyDef: { passives?: { healPerTurn?: number; strengthPerTurn?: number } } | null
): { playerDamage: number; enemyDamage: number; ended: boolean; winner?: 'player' | 'enemy' } {
  // 1. 턴 시작 - 카드 드로우
  drawCards(player, 5 - player.hand.length);

  // 2. 적 패시브 효과
  if (enemyDef?.passives) {
    if (enemyDef.passives.healPerTurn && enemyDef.passives.healPerTurn > 0) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemyDef.passives.healPerTurn);
    }
    if (enemyDef.passives.strengthPerTurn && enemyDef.passives.strengthPerTurn > 0) {
      enemy.strength += enemyDef.passives.strengthPerTurn;
    }
  }

  // 3. 카드 선택
  const playerSelection = selectPlayerActions(player);
  const enemyActions = selectEnemyActions(enemy, turnNumber);

  // 4. 타임라인 생성 (속도순 정렬)
  interface TimelineStep {
    actor: 'player' | 'enemy';
    card: Card | AICard;
    sp: number;
  }

  const timeline: TimelineStep[] = [];

  for (const card of playerSelection.cards) {
    timeline.push({ actor: 'player', card, sp: card.speedCost || 5 });
  }

  for (const card of enemyActions) {
    timeline.push({ actor: 'enemy', card, sp: card.speedCost || 5 });
  }

  // 속도순 정렬 (낮은 것이 먼저)
  timeline.sort((a, b) => a.sp - b.sp);

  // 5. 타임라인 실행 (실제 combatActions 사용)
  let playerDamage = 0;
  let enemyDamage = 0;

  // Combatant 상태 생성
  const playerCombatant: Combatant = {
    hp: player.hp,
    maxHp: player.maxHp,
    block: player.block,
    strength: player.strength,
    def: false,
    counter: 0,
    vulnMult: 1,
    tokens: player.tokens,
  };

  const enemyCombatant: Combatant = {
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    block: enemy.block,
    strength: enemy.strength,
    def: false,
    counter: 0,
    vulnMult: 1,
    tokens: enemy.tokens,
  };

  const combatState = {
    player: playerCombatant,
    enemy: enemyCombatant,
    log: [] as string[],
  };

  for (const step of timeline) {
    if (combatState.player.hp <= 0 || combatState.enemy.hp <= 0) break;

    const attacker = step.actor === 'player' ? combatState.player : combatState.enemy;
    const defender = step.actor === 'player' ? combatState.enemy : combatState.player;

    // 회피 체크
    if (step.card.type === 'attack' && rollDodge(defender as SimEntity)) {
      log.push(`${step.actor === 'player' ? '적' : '플레이어'}이 ${step.card.name}을(를) 회피!`);
      continue;
    }

    // 토큰 효과 적용
    const isAttack = step.card.type === 'attack';
    const tokenEffects = applyTokenEffectsToCard(attacker as SimEntity, step.card, isAttack);

    // 카드 복사 및 수정
    const modifiedCard: Card = {
      ...step.card,
      damage: step.card.damage ? Math.floor(step.card.damage * (1 + tokenEffects.damageBonus)) : undefined,
      block: step.card.block ? Math.floor(step.card.block * (1 + tokenEffects.blockBonus)) : undefined,
    } as Card;

    // 힘 보너스 적용
    if (modifiedCard.damage && attacker.strength) {
      modifiedCard.damage += attacker.strength;
    }

    // 실제 applyAction 호출
    const battleContext: BattleContext = {
      playerAttackCards: [],
      isLastCard: false,
    };

    try {
      const result = applyAction(combatState, step.actor, modifiedCard, battleContext);

      if (result.updatedState) {
        combatState.player = result.updatedState.player;
        combatState.enemy = result.updatedState.enemy;
      }

      if (step.actor === 'player') {
        playerDamage += result.dealt || 0;
      } else {
        enemyDamage += result.dealt || 0;
      }

      // 카드 토큰 효과 적용
      applyCardTokenEffects(step.card, attacker as SimEntity, defender as SimEntity);

    } catch (e) {
      // 오류 발생 시 기본 피해 계산
      if (isAttack && modifiedCard.damage) {
        const damage = Math.max(0, modifiedCard.damage - (defender.block || 0));
        defender.hp = Math.max(0, defender.hp - damage);
        if (step.actor === 'player') {
          playerDamage += damage;
        } else {
          enemyDamage += damage;
        }
      }
    }
  }

  // 6. 상태 업데이트
  player.hp = combatState.player.hp;
  player.tokens = combatState.player.tokens;
  enemy.hp = combatState.enemy.hp;
  enemy.tokens = combatState.enemy.tokens;

  // 7. 턴 종료 - 손패 버리기, 블록 초기화, 턴 토큰 정리
  for (const idx of playerSelection.indices.sort((a, b) => b - a)) {
    const cardId = player.hand.splice(idx, 1)[0];
    player.discard.push(cardId);
  }

  player.block = 0;
  enemy.block = 0;

  // 턴 종료 토큰 정리
  const playerTokenResult = clearTurnTokens(player as any);
  player.tokens = playerTokenResult.tokens;
  const enemyTokenResult = clearTurnTokens(enemy as any);
  enemy.tokens = enemyTokenResult.tokens;

  // 8. 로그 기록
  log.push(`턴 ${turnNumber}: 플레이어 HP ${player.hp}/${player.maxHp}, 적 HP ${enemy.hp}/${enemy.maxHp}`);

  // 9. 승패 확인
  if (player.hp <= 0) {
    return { playerDamage, enemyDamage, ended: true, winner: 'enemy' };
  }
  if (enemy.hp <= 0) {
    return { playerDamage, enemyDamage, ended: true, winner: 'player' };
  }

  return { playerDamage, enemyDamage, ended: false };
}

export function runBattle(enemyId: string, config: SimulationConfig): BattleResult {
  const player = createPlayer(config);
  const enemy = createEnemy(enemyId);

  // 적 정의 가져오기 (패시브 효과용)
  const enemyDef = ENEMIES.find(e => e.id === enemyId) || null;

  let turn = 0;
  let totalPlayerDamage = 0;
  let totalEnemyDamage = 0;
  const cardUsage: Record<string, number> = {};
  const log: string[] = [];

  log.push(`전투 시작: ${enemy.name} (HP: ${enemy.hp})`);

  while (turn < config.maxTurns) {
    turn++;

    const result = simulateTurn(player, enemy, turn, log, enemyDef);
    totalPlayerDamage += result.playerDamage;
    totalEnemyDamage += result.enemyDamage;

    if (result.ended) {
      log.push(`전투 종료: ${result.winner === 'player' ? '플레이어 승리' : '적 승리'} (${turn}턴)`);

      return {
        winner: result.winner!,
        turns: turn,
        playerDamageDealt: totalPlayerDamage,
        enemyDamageDealt: totalEnemyDamage,
        playerFinalHp: player.hp,
        enemyFinalHp: enemy.hp,
        cardUsage,
        log,
      };
    }
  }

  // 최대 턴 초과 - 무승부
  log.push(`전투 종료: 무승부 (최대 턴 초과)`);

  return {
    winner: 'draw',
    turns: turn,
    playerDamageDealt: totalPlayerDamage,
    enemyDamageDealt: totalEnemyDamage,
    playerFinalHp: player.hp,
    enemyFinalHp: enemy.hp,
    cardUsage,
    log,
  };
}

// ==================== 통계 수집 ====================

export function runSimulation(config: SimulationConfig): SimulationStats {
  const enemyIds = config.enemyIds || ['ghoul', 'marauder', 'deserter'];
  const results: BattleResult[] = [];
  const enemyStats: Record<string, { wins: number; losses: number; draws: number }> = {};

  // 각 적에 대해 시뮬레이션 실행
  for (const enemyId of enemyIds) {
    enemyStats[enemyId] = { wins: 0, losses: 0, draws: 0 };

    const battlesPerEnemy = Math.ceil(config.battles / enemyIds.length);

    for (let i = 0; i < battlesPerEnemy; i++) {
      const result = runBattle(enemyId, config);
      results.push(result);

      if (result.winner === 'player') {
        enemyStats[enemyId].wins++;
      } else if (result.winner === 'enemy') {
        enemyStats[enemyId].losses++;
      } else {
        enemyStats[enemyId].draws++;
      }
    }
  }

  // 통계 계산
  const totalBattles = results.length;
  const playerWins = results.filter(r => r.winner === 'player').length;
  const enemyWins = results.filter(r => r.winner === 'enemy').length;
  const draws = results.filter(r => r.winner === 'draw').length;

  const avgTurns = results.reduce((sum, r) => sum + r.turns, 0) / totalBattles;
  const avgPlayerDamage = results.reduce((sum, r) => sum + r.playerDamageDealt, 0) / totalBattles;
  const avgEnemyDamage = results.reduce((sum, r) => sum + r.enemyDamageDealt, 0) / totalBattles;
  const avgPlayerFinalHp = results.filter(r => r.winner === 'player')
    .reduce((sum, r) => sum + r.playerFinalHp, 0) / Math.max(playerWins, 1);

  // 적별 통계
  const enemyStatsFormatted: Record<string, { battles: number; winRate: number }> = {};
  for (const [enemyId, stats] of Object.entries(enemyStats)) {
    const battles = stats.wins + stats.losses + stats.draws;
    enemyStatsFormatted[enemyId] = {
      battles,
      winRate: battles > 0 ? stats.wins / battles : 0,
    };
  }

  return {
    totalBattles,
    playerWins,
    enemyWins,
    draws,
    winRate: playerWins / totalBattles,
    avgTurns,
    avgPlayerDamageDealt: avgPlayerDamage,
    avgEnemyDamageDealt: avgEnemyDamage,
    avgPlayerFinalHp,
    cardEfficiency: {},
    enemyStats: enemyStatsFormatted,
  };
}

// ==================== 출력 함수 ====================

export function printStats(stats: SimulationStats): void {
  console.log('\n========================================');
  console.log('         게임 시뮬레이션 결과           ');
  console.log('========================================\n');

  console.log(`📊 총 전투 횟수: ${stats.totalBattles}`);
  console.log(`🏆 플레이어 승리: ${stats.playerWins} (${(stats.winRate * 100).toFixed(1)}%)`);
  console.log(`💀 플레이어 패배: ${stats.enemyWins} (${((stats.enemyWins / stats.totalBattles) * 100).toFixed(1)}%)`);
  console.log(`⚖️  무승부: ${stats.draws}`);

  console.log('\n📈 평균 통계:');
  console.log(`   - 평균 턴 수: ${stats.avgTurns.toFixed(1)}`);
  console.log(`   - 플레이어 평균 피해량: ${stats.avgPlayerDamageDealt.toFixed(1)}`);
  console.log(`   - 적 평균 피해량: ${stats.avgEnemyDamageDealt.toFixed(1)}`);
  console.log(`   - 승리 시 평균 잔여 HP: ${stats.avgPlayerFinalHp.toFixed(1)}`);

  console.log('\n👾 적별 승률:');
  for (const [enemyId, enemyStat] of Object.entries(stats.enemyStats)) {
    const enemy = ENEMIES.find(e => e.id === enemyId);
    const name = enemy?.name || enemyId;
    console.log(`   - ${name}: ${(enemyStat.winRate * 100).toFixed(1)}% (${enemyStat.battles}전)`);
  }

  console.log('\n========================================\n');
}

// ==================== 테스트용 함수 ====================

export function runQuickTest(): SimulationStats {
  const config: SimulationConfig = {
    battles: 100,
    maxTurns: 30,
    enemyIds: ['ghoul', 'marauder', 'wildrat', 'berserker', 'deserter'],
    verbose: false,
  };

  const stats = runSimulation(config);
  printStats(stats);

  return stats;
}

// CLI에서 직접 실행 시
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('gameSimulator')) {
  runQuickTest();
}
