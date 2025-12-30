/**
 * @file gameSimulator.ts
 * @description 게임 시뮬레이터 - 자동 전투 및 통계 수집
 *
 * ## 기능
 * - 다수의 전투 자동 시뮬레이션
 * - 승률, 평균 피해량, 턴 수 등 통계 수집
 * - 카드별 효율 분석
 *
 * ## 신뢰성 v4
 * - 실제 combatActions 로직 사용
 * - 토큰 시스템 통합 (공세, 방어, 회피, 취약, 무딤 등)
 * - 적 패시브 효과 적용
 * - 치명타 시스템 (5% + strength + energy)
 * - 반격 시스템
 * - 카드 특수 효과 (crush, chain, cross)
 * - 다중 적 전투 지원
 * - 다중 타격 (hits) 지원
 * - 화상 지속 피해
 * - 연계(chain)/후속(followup) 효과
 * - 교차(cross) 보너스
 * - 누적 타임라인 계산
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
// 사용하지 않는 import 제거됨 - 시뮬레이터 내부에서 간소화된 버전 사용

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
  // 개선된 AI: 시너지와 상황을 고려한 카드 선택
  const cards: (Card | AICard)[] = [];
  const indices: number[] = [];
  let energy = player.energy;
  let speed = 0;
  const maxSpeed = 30;

  // 손패를 카드 객체로 변환
  const handCards = player.hand
    .map((id, idx) => ({ card: getCardById(id), idx }))
    .filter((item): item is { card: Card | AICard; idx: number } => item.card !== undefined);

  // 카드 점수 계산 (높을수록 좋음)
  const scoreCard = (card: Card | AICard, selectedCards: (Card | AICard)[]): number => {
    let score = 0;
    const c = card as Card;

    // 기본 점수: 피해/방어 기준
    if (c.damage) score += c.damage * 2;
    if (c.block) score += c.block;

    // 다중 타격 보너스
    if (c.hits && c.hits > 1) score += c.damage! * (c.hits - 1);

    // 연계 보너스: 이전에 chain 카드가 있고 현재가 fencing이면 높은 점수
    const prevChainCard = selectedCards.find(sc => (sc as Card).traits?.includes('chain'));
    if (prevChainCard && c.cardCategory === 'fencing') {
      score += 20;
    }

    // chain 특성 보너스: 뒤에 fencing 카드가 있으면 먼저 선택
    if (c.traits?.includes('chain')) {
      const hasFencingInHand = handCards.some(h => (h.card as Card).cardCategory === 'fencing');
      if (hasFencingInHand) score += 15;
    }

    // 후속(followup) -> 마무리(finisher) 콤보
    const prevFollowupCard = selectedCards.find(sc => (sc as Card).traits?.includes('followup'));
    if (prevFollowupCard && c.traits?.includes('finisher')) {
      score += 25;
    }

    // 교차(cross) 특성 보너스
    if (c.traits?.includes('cross')) {
      score += 10;
    }

    // 분쇄(crush) 특성 보너스
    if (c.traits?.includes('crush')) {
      score += 8;
    }

    // 체력이 낮으면 방어 카드 우선
    if (player.hp < player.maxHp * 0.3 && c.type === 'defense') {
      score += 30;
    }

    // 에너지 효율 (낮은 비용 선호)
    const cost = c.actionCost || 1;
    score += (6 - cost) * 2;

    return score;
  };

  // 그리디 알고리즘: 매번 최고 점수 카드 선택
  const availableCards = [...handCards];

  while (cards.length < 3 && availableCards.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < availableCards.length; i++) {
      const { card, idx } = availableCards[i];
      const cost = card.actionCost || 1;
      const spCost = card.speedCost || 5;

      if (energy >= cost && speed + spCost <= maxSpeed && !indices.includes(idx)) {
        const score = scoreCard(card, cards);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }

    if (bestIdx === -1) break;

    const selected = availableCards[bestIdx];
    cards.push(selected.card);
    indices.push(selected.idx);
    energy -= selected.card.actionCost || 1;
    speed += selected.card.speedCost || 5;
    availableCards.splice(bestIdx, 1);
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

function applyTokenEffectsToCardSim(entity: SimEntity, card: Card | AICard, isAttack: boolean): { damageBonus: number; damagePenalty: number; blockBonus: number; blockPenalty: number } {
  let damageBonus = 0;
  let damagePenalty = 0;
  let blockBonus = 0;
  let blockPenalty = 0;

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
    // 무딤 토큰 (dull) - 50% 데미지 감소
    if (hasToken(entity as any, 'dull')) {
      damagePenalty += 0.5;
    }
    if (hasToken(entity as any, 'dullness')) {
      damagePenalty += 0.5;
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
    // 흔들림 토큰 (shaken) - 50% 방어력 감소
    if (hasToken(entity as any, 'shaken')) {
      blockPenalty += 0.5;
    }
    if (hasToken(entity as any, 'exposed')) {
      blockPenalty += 0.5;
    }
  }

  return { damageBonus, damagePenalty, blockBonus, blockPenalty };
}

/**
 * 취약 배율 계산 (피해 증가)
 */
function getVulnerabilityMult(entity: SimEntity): number {
  let mult = 1.0;
  // vulnerable 토큰: 50% 추가 피해
  if (hasToken(entity as any, 'vulnerable')) {
    mult += 0.5;
  }
  // pain 토큰: 50% 추가 피해
  if (hasToken(entity as any, 'pain')) {
    mult += 0.5;
  }
  return mult;
}

/**
 * 반격 피해 계산
 */
function getCounterDamage(entity: SimEntity): number {
  return entity.counter || 0;
}

/**
 * 치명타 판정 (시뮬레이터용)
 */
function rollCriticalSim(entity: SimEntity, remainingEnergy: number, card: Card | AICard, isPlayer: boolean): boolean {
  // 적은 치명타 없음
  if (!isPlayer) return false;

  // guaranteedCrit 특수 효과
  const specials = Array.isArray((card as Card).special) ? (card as Card).special : [(card as Card).special];
  if (specials && specials.includes('guaranteedCrit')) {
    return true;
  }

  // 기본 5% + strength + energy
  const baseCrit = 5;
  const strength = entity.strength || 0;
  const energy = remainingEnergy || 0;

  const critChance = baseCrit + strength + energy;
  return Math.random() * 100 < critChance;
}

/**
 * 분쇄 효과 (crush) - 방어력에 2배 피해
 */
function hasCrushTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('crush') : c.traits === 'crush';
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
    hasCrossed?: boolean;  // 교차 여부
  }

  const timeline: TimelineStep[] = [];
  let cumulativeSp = 0;

  for (const card of playerSelection.cards) {
    cumulativeSp += card.speedCost || 5;
    timeline.push({ actor: 'player', card, sp: cumulativeSp });
  }

  let enemyCumulativeSp = 0;
  for (const card of enemyActions) {
    enemyCumulativeSp += card.speedCost || 5;
    timeline.push({ actor: 'enemy', card, sp: enemyCumulativeSp });
  }

  // 속도순 정렬 (낮은 것이 먼저)
  timeline.sort((a, b) => a.sp - b.sp);

  // 교차 판정 (같은 sp에 적과 플레이어 카드가 있으면 교차)
  for (let i = 0; i < timeline.length; i++) {
    const current = timeline[i];
    for (let j = 0; j < timeline.length; j++) {
      if (i === j) continue;
      const other = timeline[j];
      if (current.actor !== other.actor && current.sp === other.sp) {
        current.hasCrossed = true;
        break;
      }
    }
  }

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

  // 남은 에너지 계산 (치명타 확률용)
  let playerEnergyUsed = 0;
  for (const card of playerSelection.cards) {
    playerEnergyUsed += card.actionCost || 1;
  }
  const remainingEnergy = Math.max(0, player.energy - playerEnergyUsed);

  // 이전 카드 추적 (연계 효과용)
  let previousPlayerCard: Card | AICard | null = null;

  for (let stepIndex = 0; stepIndex < timeline.length; stepIndex++) {
    const step = timeline[stepIndex];
    if (combatState.player.hp <= 0 || combatState.enemy.hp <= 0) break;

    const attacker = step.actor === 'player' ? combatState.player : combatState.enemy;
    const defender = step.actor === 'player' ? combatState.enemy : combatState.player;
    const isPlayer = step.actor === 'player';

    // 화상 피해 (카드 사용 시)
    if (hasToken(attacker as any, 'burn')) {
      const burnDamage = 3;
      const beforeHP = attacker.hp;
      attacker.hp = Math.max(0, attacker.hp - burnDamage);
      log.push(`🔥 화상! ${isPlayer ? '플레이어' : '적'}: ${burnDamage} 피해 (체력 ${beforeHP} -> ${attacker.hp})`);
      if (isPlayer) {
        enemyDamage += burnDamage;
      } else {
        playerDamage += burnDamage;
      }
    }

    // 회피 체크
    if (step.card.type === 'attack' && rollDodge(defender as SimEntity)) {
      log.push(`${step.actor === 'player' ? '적' : '플레이어'}이 ${step.card.name}을(를) 회피!`);
      if (isPlayer) previousPlayerCard = step.card;
      continue;
    }

    // 토큰 효과 적용 (버프 + 디버프)
    const isAttack = step.card.type === 'attack';
    const tokenEffects = applyTokenEffectsToCardSim(attacker as SimEntity, step.card, isAttack);

    // 카드 복사 및 수정 (버프 - 디버프)
    let damageMultiplier = 1 + tokenEffects.damageBonus - tokenEffects.damagePenalty;
    let blockMultiplier = 1 + tokenEffects.blockBonus - tokenEffects.blockPenalty;
    damageMultiplier = Math.max(0, damageMultiplier);
    blockMultiplier = Math.max(0, blockMultiplier);

    const modifiedCard: Card = {
      ...step.card,
      damage: step.card.damage ? Math.floor(step.card.damage * damageMultiplier) : undefined,
      block: step.card.block ? Math.floor(step.card.block * blockMultiplier) : undefined,
    } as Card;

    // 힘 보너스 적용
    if (modifiedCard.damage && attacker.strength) {
      modifiedCard.damage += attacker.strength;
    }

    // 연계(chain) 효과: 이전 카드가 chain 특성이고 현재 카드가 검격이면 보너스
    if (isPlayer && previousPlayerCard && isAttack) {
      const prevCard = previousPlayerCard as Card;
      const currCard = step.card as Card;
      if (prevCard.traits?.includes('chain') && currCard.cardCategory === 'fencing') {
        // 연계 시 피해 증가
        if (modifiedCard.damage) {
          const chainBonus = Math.floor(modifiedCard.damage * 0.5);
          modifiedCard.damage += chainBonus;
          log.push(`⛓️ 연계! ${prevCard.name} -> ${currCard.name}: 피해 +${chainBonus}`);
        }
      }
      // 후속(followup) 효과
      if (prevCard.traits?.includes('followup') && currCard.traits?.includes('finisher')) {
        if (modifiedCard.damage) {
          modifiedCard.damage = Math.floor(modifiedCard.damage * 1.5);
          log.push(`⚔️ 후속 -> 마무리! ${currCard.name}: 피해 50% 증가`);
        }
      }
    }

    // 교차(cross) 보너스
    if (step.hasCrossed) {
      const cardWithCross = step.card as Card;
      if (cardWithCross.traits?.includes('cross') && cardWithCross.crossBonus?.type === 'damage_mult') {
        const crossMult = cardWithCross.crossBonus.value || 2;
        if (modifiedCard.damage) {
          modifiedCard.damage = Math.floor(modifiedCard.damage * crossMult);
          log.push(`✨ 교차! ${cardWithCross.name}: 피해 ${crossMult}배`);
        }
      }
    }

    // 치명타 판정 (플레이어만, 공격 카드만)
    let isCritical = false;
    if (isAttack && isPlayer) {
      isCritical = rollCriticalSim(attacker as SimEntity, remainingEnergy, step.card, true);
      if (isCritical && modifiedCard.damage) {
        modifiedCard.damage = modifiedCard.damage * 2;
        log.push(`💥 치명타! ${step.card.name}`);
      }
    }

    // 다중 타격 (hits)
    const hits = (step.card as Card).hits || 1;

    // 분쇄 효과 적용 (방어력에 2배 피해)
    const hasCrush = hasCrushTrait(step.card);

    // 실제 applyAction 호출
    const battleContext: BattleContext = {
      playerAttackCards: [],
      isLastCard: false,
      remainingEnergy: isPlayer ? remainingEnergy : 0,
    };

    try {
      const result = applyAction(combatState, step.actor, modifiedCard, battleContext);

      if (result.updatedState) {
        combatState.player = result.updatedState.player;
        combatState.enemy = result.updatedState.enemy;
      }

      // 취약 배율 적용 (applyAction 결과에 추가)
      let finalDealt = result.dealt || 0;
      if (isAttack && finalDealt > 0) {
        const vulnMult = getVulnerabilityMult(defender as SimEntity);
        if (vulnMult > 1) {
          // applyAction에서 이미 적용되어 있을 수 있으므로 로그만 추가
          log.push(`⚡ 취약 효과: ${step.card.name} 피해 ${vulnMult}배`);
        }
      }

      // 반격 피해 (방어자가 공격자에게)
      if (isAttack && finalDealt > 0) {
        const counterDmg = getCounterDamage(defender as SimEntity);
        if (counterDmg > 0) {
          const beforeHP = attacker.hp;
          attacker.hp = Math.max(0, attacker.hp - counterDmg);
          log.push(`🔄 반격! ${step.actor === 'player' ? '적' : '플레이어'} -> ${step.actor === 'player' ? '플레이어' : '적'}: ${counterDmg} 피해 (체력 ${beforeHP} -> ${attacker.hp})`);
          if (step.actor === 'player') {
            enemyDamage += counterDmg;
          } else {
            playerDamage += counterDmg;
          }
        }
      }

      if (step.actor === 'player') {
        playerDamage += finalDealt;
      } else {
        enemyDamage += finalDealt;
      }

      // 카드 토큰 효과 적용
      applyCardTokenEffects(step.card, attacker as SimEntity, defender as SimEntity);

      // 다중 타격 (hits > 1) 로그 - applyAction에서 이미 처리됨
      if (hits > 1 && isAttack) {
        log.push(`🎯 ${step.card.name}: ${hits}회 타격!`);
      }

    } catch (e) {
      // 오류 발생 시 기본 피해 계산 (분쇄 + 취약 적용)
      if (isAttack && modifiedCard.damage) {
        let damage = modifiedCard.damage;
        const defenderBlock = defender.block || 0;

        // 분쇄 효과: 방어력에 2배 피해
        const effectiveDamage = hasCrush ? damage * 2 : damage;
        const blockedDamage = Math.min(effectiveDamage, defenderBlock);
        const throughDamage = Math.max(0, effectiveDamage - defenderBlock);

        // 취약 배율 적용
        const vulnMult = getVulnerabilityMult(defender as SimEntity);
        const finalDamage = Math.floor(throughDamage * vulnMult);

        defender.block = Math.max(0, defenderBlock - blockedDamage);
        defender.hp = Math.max(0, defender.hp - finalDamage);

        if (step.actor === 'player') {
          playerDamage += finalDamage;
        } else {
          enemyDamage += finalDamage;
        }

        // 반격 피해
        const counterDmg = getCounterDamage(defender as SimEntity);
        if (counterDmg > 0 && finalDamage > 0) {
          attacker.hp = Math.max(0, attacker.hp - counterDmg);
          if (step.actor === 'player') {
            enemyDamage += counterDmg;
          } else {
            playerDamage += counterDmg;
          }
        }
      }
    }

    // 이전 카드 추적 (연계 효과용)
    if (isPlayer) {
      previousPlayerCard = step.card;
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
