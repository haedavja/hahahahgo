/**
 * @file battle-engine.ts
 * @description 완전한 전투 엔진 - 실제 게임 로직 통합
 *
 * 기능:
 * - 토큰 시스템 (공세, 방어, 취약, 무딤 등)
 * - 상징(Relic) 효과
 * - 이변(Anomaly) 시스템
 * - 포커 콤보 감지
 * - 카드 특성 (chain, followup, finisher, cross, crush)
 * - 치명타 시스템
 * - 반격 시스템
 */

import type {
  SimulationConfig,
  BattleResult,
  SimPlayerState,
  SimEnemyState,
  TokenState,
  GameState,
  TimelineCard,
} from './types';
import { RelicSystem, getRelicSystem, type RelicEffectResult } from './relic-system';
import { AnomalySystem, getAnomalySystem } from './anomaly-system';
import { getLogger } from './logger';

// ==================== 상수 (설정 가능) ====================

export interface BattleConstants {
  STUN_RANGE: number;
  CRIT_BASE_CHANCE: number;
  CRIT_MULTIPLIER: number;
  FINISHER_MULTIPLIER: number;
  CRUSH_BONUS_PER_HP_PERCENT: number;
  CROSS_MULTIPLIER: number;
  MAX_COMBO_CARDS: number;
  MAX_TURNS: number;
}

export const DEFAULT_CONSTANTS: BattleConstants = {
  STUN_RANGE: 5,
  CRIT_BASE_CHANCE: 0.05,
  CRIT_MULTIPLIER: 2.0,
  FINISHER_MULTIPLIER: 2.0,        // finisher 특성 피해 배율
  CRUSH_BONUS_PER_HP_PERCENT: 0.5, // crush 특성: 잃은 HP 1%당 0.5% 추가 피해
  CROSS_MULTIPLIER: 1.5,           // cross 특성: 다른 타입 카드 후 피해 증가
  MAX_COMBO_CARDS: 5,
  MAX_TURNS: 30,
};

let BATTLE_CONSTANTS = { ...DEFAULT_CONSTANTS };

export function configureConstants(overrides: Partial<BattleConstants>): void {
  BATTLE_CONSTANTS = { ...DEFAULT_CONSTANTS, ...overrides };
}

export function getConstants(): BattleConstants {
  return { ...BATTLE_CONSTANTS };
}

// ==================== 토큰 시스템 ====================

export interface TokenEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'special';
  stackable: boolean;
  duration?: number;
}

export const TOKENS: Record<string, TokenEffect> = {
  offensive: { id: 'offensive', name: '공세', type: 'buff', stackable: true },
  defensive: { id: 'defensive', name: '방어', type: 'buff', stackable: true },
  vulnerable: { id: 'vulnerable', name: '취약', type: 'debuff', stackable: true },
  weak: { id: 'weak', name: '무딤', type: 'debuff', stackable: true },
  strength: { id: 'strength', name: '힘', type: 'buff', stackable: true },
  dexterity: { id: 'dexterity', name: '민첩', type: 'buff', stackable: true },
  burn: { id: 'burn', name: '화상', type: 'debuff', stackable: true },
  poison: { id: 'poison', name: '독', type: 'debuff', stackable: true },
  stun: { id: 'stun', name: '기절', type: 'debuff', stackable: false },
  counter: { id: 'counter', name: '반격', type: 'buff', stackable: true },
  absorb: { id: 'absorb', name: '흡수', type: 'buff', stackable: true },
  crit_boost: { id: 'crit_boost', name: '치명타 집중', type: 'buff', stackable: true },
  finesse: { id: 'finesse', name: '기교', type: 'buff', stackable: true },
  immunity: { id: 'immunity', name: '면역', type: 'buff', stackable: true },
  guard: { id: 'guard', name: '수세', type: 'buff', stackable: true },
  followup_ready: { id: 'followup_ready', name: '후속 준비', type: 'buff', stackable: true },
  cross_attack: { id: 'cross_attack', name: '십자 공격', type: 'buff', stackable: false },
  cross_defense: { id: 'cross_defense', name: '십자 방어', type: 'buff', stackable: false },
  cross_skill: { id: 'cross_skill', name: '십자 스킬', type: 'buff', stackable: false },
};

export function addToken(tokens: TokenState, tokenId: string, stacks: number = 1): TokenState {
  const newTokens = { ...tokens };
  newTokens[tokenId] = (newTokens[tokenId] || 0) + stacks;
  return newTokens;
}

export function removeToken(tokens: TokenState, tokenId: string, stacks: number = 1): TokenState {
  const newTokens = { ...tokens };
  if (newTokens[tokenId]) {
    newTokens[tokenId] = Math.max(0, newTokens[tokenId] - stacks);
    if (newTokens[tokenId] === 0) delete newTokens[tokenId];
  }
  return newTokens;
}

export function hasToken(tokens: TokenState, tokenId: string): boolean {
  return (tokens[tokenId] || 0) > 0;
}

export function getTokenStacks(tokens: TokenState, tokenId: string): number {
  return tokens[tokenId] || 0;
}

// ==================== 카드 정의 ====================

export interface CardDefinition {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'skill';
  cost: number;
  speedCost?: number;
  damage?: number;
  block?: number;
  hits?: number;
  traits?: string[];
  effects?: CardEffects;
  cardCategory?: string;
}

export interface CardEffects {
  applyVulnerable?: number;
  applyWeak?: number;
  applyBurn?: number;
  applyPoison?: number;
  addStrength?: number;
  addDexterity?: number;
  heal?: number;
  draw?: number;
  energy?: number;
  stun?: boolean;
  knockback?: number;
  advance?: number;
  executeThreshold?: number;
  lifesteal?: number;
}

// ==================== 콤보 시스템 ====================

export interface ComboResult {
  name: string;
  rank: number;
  damageMultiplier: number;
  description: string;
}

export const COMBO_RANKS: Record<string, ComboResult> = {
  fiveOfAKind: { name: '파이브카드', rank: 10, damageMultiplier: 3.0, description: '같은 카드 5장' },
  fourOfAKind: { name: '포카드', rank: 8, damageMultiplier: 2.5, description: '같은 카드 4장' },
  fullHouse: { name: '풀하우스', rank: 6, damageMultiplier: 2.0, description: '트리플 + 페어' },
  flush: { name: '플러쉬', rank: 5, damageMultiplier: 1.8, description: '같은 타입 5장' },
  straight: { name: '스트레이트', rank: 4, damageMultiplier: 1.6, description: '연속 카드' },
  triple: { name: '트리플', rank: 3, damageMultiplier: 1.5, description: '같은 카드 3장' },
  twoPair: { name: '투페어', rank: 2, damageMultiplier: 1.3, description: '페어 2개' },
  pair: { name: '페어', rank: 1, damageMultiplier: 1.2, description: '같은 카드 2장' },
  highCard: { name: '하이카드', rank: 0, damageMultiplier: 1.0, description: '조합 없음' },
};

export function detectCombo(cards: CardDefinition[]): ComboResult {
  if (cards.length < 2) return COMBO_RANKS.highCard;

  // 카드 ID 빈도수 계산
  const idCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};

  for (const card of cards) {
    idCounts[card.id] = (idCounts[card.id] || 0) + 1;
    typeCounts[card.type] = (typeCounts[card.type] || 0) + 1;
  }

  const counts = Object.values(idCounts).sort((a, b) => b - a);

  // 파이브카드
  if (counts[0] >= 5) return COMBO_RANKS.fiveOfAKind;

  // 포카드
  if (counts[0] >= 4) return COMBO_RANKS.fourOfAKind;

  // 풀하우스
  if (counts[0] >= 3 && counts[1] >= 2) return COMBO_RANKS.fullHouse;

  // 플러쉬 (같은 타입 5장)
  const maxTypeCount = Math.max(...Object.values(typeCounts));
  if (maxTypeCount >= 5) return COMBO_RANKS.flush;

  // 트리플
  if (counts[0] >= 3) return COMBO_RANKS.triple;

  // 투페어
  if (counts[0] >= 2 && counts[1] >= 2) return COMBO_RANKS.twoPair;

  // 페어
  if (counts[0] >= 2) return COMBO_RANKS.pair;

  return COMBO_RANKS.highCard;
}

// ==================== 데미지 계산 ====================

export interface DamageContext {
  baseDamage: number;
  attacker: SimPlayerState | SimEnemyState;
  defender: SimPlayerState | SimEnemyState;
  card: CardDefinition;
  comboMultiplier?: number;
  isCritical?: boolean;
}

export function calculateDamage(ctx: DamageContext): {
  finalDamage: number;
  actualDamage: number;
  blocked: number;
  isCritical: boolean;
  lifesteal: number;
} {
  let damage = ctx.baseDamage;

  // 힘 보너스
  damage += getTokenStacks(ctx.attacker.tokens, 'strength');

  // 공세 토큰 (50% 추가)
  if (hasToken(ctx.attacker.tokens, 'offensive')) {
    damage = Math.floor(damage * 1.5);
  }

  // 무딤 토큰 (25% 감소)
  if (hasToken(ctx.attacker.tokens, 'weak')) {
    damage = Math.floor(damage * 0.75);
  }

  // 취약 토큰 (50% 추가 피해)
  if (hasToken(ctx.defender.tokens, 'vulnerable')) {
    damage = Math.floor(damage * 1.5);
  }

  // 콤보 배율
  if (ctx.comboMultiplier && ctx.comboMultiplier > 1) {
    damage = Math.floor(damage * ctx.comboMultiplier);
  }

  // 치명타 계산
  let isCritical = ctx.isCritical || false;
  if (!isCritical) {
    const critChance = CRIT_BASE_CHANCE + getTokenStacks(ctx.attacker.tokens, 'crit_boost') * 0.05;
    isCritical = Math.random() < critChance;
  }

  if (isCritical) {
    damage = Math.floor(damage * CRIT_MULTIPLIER);
  }

  const finalDamage = damage;

  // 방어력 적용
  const blocked = Math.min(ctx.defender.block, damage);
  const actualDamage = Math.max(0, damage - ctx.defender.block);

  // 흡수 (피해의 50% 회복)
  let lifesteal = 0;
  if (hasToken(ctx.attacker.tokens, 'absorb')) {
    lifesteal = Math.floor(actualDamage * 0.5);
  }
  if (ctx.card.effects?.lifesteal) {
    lifesteal += Math.floor(actualDamage * ctx.card.effects.lifesteal);
  }

  return { finalDamage, actualDamage, blocked, isCritical, lifesteal };
}

// ==================== 방어력 계산 ====================

export function calculateBlock(
  baseBlock: number,
  defender: SimPlayerState | SimEnemyState
): number {
  let block = baseBlock;

  // 민첩 보너스
  block += getTokenStacks(defender.tokens, 'dexterity');

  // 방어 토큰 (50% 추가)
  if (hasToken(defender.tokens, 'defensive')) {
    block = Math.floor(block * 1.5);
  }

  return block;
}

// ==================== 전투 엔진 ====================

export interface BattleEngineOptions {
  verbose?: boolean;
  enableCombos?: boolean;
  enableCrits?: boolean;
  enableRelics?: boolean;
  enableAnomalies?: boolean;
}

export class BattleEngine {
  private cards: Map<string, CardDefinition> = new Map();
  private options: Required<BattleEngineOptions>;
  private replayLog: BattleEvent[] = [];
  private relicSystem: RelicSystem;
  private anomalySystem: AnomalySystem;
  private log = getLogger('BattleEngine');

  constructor(
    cardData: Record<string, CardDefinition>,
    options: BattleEngineOptions = {}
  ) {
    for (const [id, card] of Object.entries(cardData)) {
      this.cards.set(id, { ...card, id });
    }

    this.options = {
      verbose: options.verbose ?? false,
      enableCombos: options.enableCombos ?? true,
      enableCrits: options.enableCrits ?? true,
      enableRelics: options.enableRelics ?? true,
      enableAnomalies: options.enableAnomalies ?? true,
    };

    this.relicSystem = getRelicSystem();
    this.anomalySystem = getAnomalySystem();
  }

  // ==================== 메인 전투 ====================

  runBattle(player: SimPlayerState, enemy: SimEnemyState, maxTurns: number = 30, anomalyId?: string): BattleResult {
    this.replayLog = [];
    const battleLog: string[] = [];
    const cardUsage: Record<string, number> = {};
    const comboStats: Record<string, number> = {};

    let turn = 0;
    let playerDamageDealt = 0;
    let enemyDamageDealt = 0;

    // 상징 초기화
    if (this.options.enableRelics && player.relics.length > 0) {
      this.relicSystem.initializeRelics(player.relics);
      const passiveEffects = this.relicSystem.getPassiveEffects(player.relics);
      if (passiveEffects.energyGain) {
        player.maxEnergy += passiveEffects.energyGain;
        player.energy += passiveEffects.energyGain;
        this.log.debug('Relic passive energy bonus', { bonus: passiveEffects.energyGain });
      }
    }

    // 이변 초기화
    if (this.options.enableAnomalies && anomalyId) {
      this.anomalySystem.clear();
      this.anomalySystem.activateAnomaly(anomalyId);
      // 이변으로 적 스탯 수정
      const modifiedEnemy = this.anomalySystem.modifyEnemyStats(enemy);
      enemy.hp = modifiedEnemy.hp;
      enemy.maxHp = modifiedEnemy.maxHp;
      battleLog.push(`⚠️ 이변 활성화: ${this.anomalySystem.getAnomalyInfo(anomalyId)?.name}`);
    }

    // 덱 셔플
    this.shuffle(player.deck);
    this.shuffle(enemy.deck);

    // 초기 핸드 드로우 (이변 적용)
    let drawCount = 5;
    if (this.options.enableAnomalies) {
      const gameState = this.createGameState(player, enemy, 0);
      drawCount = this.anomalySystem.modifyDrawCount(drawCount, gameState);
    }
    this.drawCards(player, drawCount);

    this.logEvent({ type: 'battle_start', turn: 0, data: { playerHp: player.hp, enemyHp: enemy.hp } });

    // 전투 시작 상징 트리거
    if (this.options.enableRelics) {
      const results = this.relicSystem.processTrigger('battle_start', player, enemy, 0);
      this.applyRelicResults(results, player, enemy, battleLog);
    }

    while (turn < maxTurns && player.hp > 0 && enemy.hp > 0) {
      turn++;
      battleLog.push(`\n=== 턴 ${turn} ===`);
      this.logEvent({ type: 'turn_start', turn, data: { playerHp: player.hp, enemyHp: enemy.hp } });

      // 턴 시작 처리
      player.block = 0;
      enemy.block = 0;
      player.energy = player.maxEnergy;

      // 이변 에너지 수정
      if (this.options.enableAnomalies) {
        const gameState = this.createGameState(player, enemy, turn);
        player.energy = this.anomalySystem.modifyEnergy(player.energy, gameState);
      }

      // 턴 시작 상징 트리거
      if (this.options.enableRelics) {
        const results = this.relicSystem.processTrigger('turn_start', player, enemy, turn);
        this.applyRelicResults(results, player, enemy, battleLog);
      }

      // 이변 턴 시작 효과
      if (this.options.enableAnomalies) {
        const gameState = this.createGameState(player, enemy, turn);
        const effects = this.anomalySystem.processPhase('turn_start', gameState);
        for (const effect of effects) {
          if (effect.damage) {
            player.hp -= effect.damage;
            battleLog.push(`  ⚠️ 이변 피해: ${effect.damage}`);
          }
          if (effect.heal) {
            player.hp = Math.min(player.maxHp, player.hp + effect.heal);
            battleLog.push(`  ⚠️ 이변 회복: ${effect.heal}`);
          }
        }
      }

      // 독/화상 피해
      this.applyDotDamage(player, battleLog);
      this.applyDotDamage(enemy, battleLog);

      if (player.hp <= 0 || enemy.hp <= 0) break;

      // 플레이어 카드 선택
      const selectedCards = this.selectPlayerCards(player);

      // 콤보 계산
      let comboMultiplier = 1;
      if (this.options.enableCombos && selectedCards.length >= 2) {
        const combo = detectCombo(selectedCards);
        if (combo.rank > 0) {
          comboMultiplier = combo.damageMultiplier;
          comboStats[combo.name] = (comboStats[combo.name] || 0) + 1;
          battleLog.push(`🎴 콤보: ${combo.name} (x${combo.damageMultiplier})`);
          this.logEvent({ type: 'combo', turn, data: { combo: combo.name, multiplier: combo.damageMultiplier } });
        }
      }

      // 플레이어 카드 실행
      for (const card of selectedCards) {
        cardUsage[card.id] = (cardUsage[card.id] || 0) + 1;

        const result = this.executeCard(card, player, enemy, comboMultiplier, battleLog);
        playerDamageDealt += result.damageDealt;

        if (enemy.hp <= 0) break;
      }

      // 핸드 버리기 및 드로우
      player.discard.push(...player.hand);
      player.hand = [];
      this.drawCards(player, 5);

      if (enemy.hp <= 0) break;

      // 적 턴
      const enemyCards = this.selectEnemyCards(enemy);
      for (const card of enemyCards) {
        const result = this.executeCard(card, enemy, player, 1, battleLog);
        enemyDamageDealt += result.damageDealt;

        if (player.hp <= 0) break;
      }

      // 턴 종료 토큰 감소
      this.tickTokens(player);
      this.tickTokens(enemy);

      // 턴 종료 상징 트리거
      if (this.options.enableRelics) {
        const results = this.relicSystem.processTrigger('turn_end', player, enemy, turn);
        this.applyRelicResults(results, player, enemy, battleLog);
      }

      // 이변 턴 종료 처리
      if (this.options.enableAnomalies) {
        this.anomalySystem.processTurnEnd();
      }

      this.logEvent({ type: 'turn_end', turn, data: { playerHp: player.hp, enemyHp: enemy.hp } });
    }

    // 승자 결정
    let winner: 'player' | 'enemy' | 'draw';
    if (enemy.hp <= 0 && player.hp > 0) {
      winner = 'player';
    } else if (player.hp <= 0 && enemy.hp > 0) {
      winner = 'enemy';
    } else if (player.hp <= 0 && enemy.hp <= 0) {
      winner = 'draw';
    } else {
      winner = player.hp > enemy.hp ? 'player' : 'enemy';
    }

    // 전투 종료 상징 트리거
    if (this.options.enableRelics && winner === 'player') {
      const results = this.relicSystem.processTrigger('battle_end', player, enemy, turn);
      // 전투 후 회복 등
      for (const result of results) {
        if (result.heal) {
          player.hp = Math.min(player.maxHp, player.hp + result.heal);
          battleLog.push(`🎁 전투 후 회복: ${result.heal}`);
        }
      }
    }

    this.logEvent({ type: 'battle_end', turn, data: { winner, playerHp: player.hp, enemyHp: enemy.hp } });

    return {
      winner,
      turns: turn,
      playerDamageDealt,
      enemyDamageDealt,
      playerFinalHp: Math.max(0, player.hp),
      enemyFinalHp: Math.max(0, enemy.hp),
      battleLog,
      cardUsage,
      comboStats,
    };
  }

  // ==================== 카드 실행 ====================

  private executeCard(
    card: CardDefinition,
    attacker: SimPlayerState | SimEnemyState,
    defender: SimPlayerState | SimEnemyState,
    comboMultiplier: number,
    log: string[]
  ): { damageDealt: number } {
    let damageDealt = 0;
    const isPlayer = 'hand' in attacker;
    const prefix = isPlayer ? '플레이어' : (attacker as SimEnemyState).name;

    this.logEvent({
      type: 'card_play',
      turn: 0,
      data: { cardId: card.id, attacker: isPlayer ? 'player' : 'enemy' }
    });

    // 특성 보너스 계산 (finisher, crush, cross 등)
    const traitBonus = this.calculateTraitBonus(card, attacker, defender);
    const totalMultiplier = comboMultiplier * traitBonus.damageMultiplier;

    // 특성 보너스 로그
    for (const effect of traitBonus.bonusEffects) {
      log.push(`  ⚡ ${effect}`);
    }

    // 공격
    if (card.damage) {
      const hits = card.hits || 1;

      // 공격 시 상징 트리거 (플레이어가 공격할 때만)
      if (isPlayer && this.options.enableRelics) {
        const attackResults = this.relicSystem.processTrigger(
          'on_attack',
          attacker as SimPlayerState,
          defender as SimEnemyState,
          0,
          { cardType: card.type }
        );
        this.applyRelicResults(attackResults, attacker as SimPlayerState, defender as SimEnemyState, log);
      }

      for (let i = 0; i < hits; i++) {
        let baseDamage = card.damage;

        // 이변으로 데미지 수정
        if (this.options.enableAnomalies) {
          const gameState = this.createGameState(
            isPlayer ? attacker as SimPlayerState : defender as SimPlayerState,
            isPlayer ? defender as SimEnemyState : attacker as SimEnemyState,
            0
          );
          baseDamage = this.anomalySystem.modifyDamage(baseDamage, isPlayer ? 'player' : 'enemy', gameState);
        }

        const result = calculateDamage({
          baseDamage,
          attacker,
          defender,
          card,
          comboMultiplier: i === 0 ? totalMultiplier : 1,  // 첫 타격에만 콤보/특성 적용
        });

        defender.block = Math.max(0, defender.block - result.finalDamage);
        defender.hp -= result.actualDamage;
        damageDealt += result.actualDamage;

        // 피해 받을 시 상징 트리거 (플레이어가 피해를 받을 때만)
        if (!isPlayer && this.options.enableRelics && result.actualDamage > 0) {
          const damageResults = this.relicSystem.processTrigger(
            'on_take_damage',
            defender as SimPlayerState,
            attacker as SimEnemyState,
            0,
            { damage: result.actualDamage }
          );
          this.applyRelicResults(damageResults, defender as SimPlayerState, attacker as SimEnemyState, log);
        }

        // 흡수 회복
        if (result.lifesteal > 0) {
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + result.lifesteal);
          log.push(`  💚 흡수: ${result.lifesteal} 회복`);
        }

        const critText = result.isCritical ? ' 💥치명타!' : '';
        const multiplierText = totalMultiplier > 1 ? ` (x${totalMultiplier.toFixed(1)})` : '';
        log.push(`${prefix}: ${card.name}${hits > 1 ? ` (${i + 1}/${hits})` : ''}${multiplierText} → ${result.actualDamage} 피해${critText}`);

        // 반격 처리 (defender가 counter 토큰 보유 시)
        if (hasToken(defender.tokens, 'counter') && result.actualDamage > 0) {
          const counterDamage = getTokenStacks(defender.tokens, 'counter') * 2;
          attacker.hp -= counterDamage;
          defender.tokens = removeToken(defender.tokens, 'counter', 1);
          log.push(`  ⚔️ 반격! ${counterDamage} 피해`);
        }

        // 처형 체크 (카드 효과)
        if (card.effects?.executeThreshold && defender.hp > 0) {
          const threshold = defender.maxHp * card.effects.executeThreshold;
          if (defender.hp <= threshold) {
            log.push(`  ⚰️ 처형! (${defender.hp}/${threshold.toFixed(0)} 이하)`);
            defender.hp = 0;
          }
        }

        // 처형 체크 (execute 특성)
        if (card.traits?.includes('execute') && defender.hp > 0 && defender.hp <= defender.maxHp * 0.25) {
          log.push(`  ⚰️ 처형 특성 발동!`);
          defender.hp = 0;
        }

        if (defender.hp <= 0) break;
      }
    }

    // 방어
    if (card.block) {
      let block = calculateBlock(card.block, attacker);

      // 이변으로 블록 수정
      if (this.options.enableAnomalies) {
        const gameState = this.createGameState(
          isPlayer ? attacker as SimPlayerState : defender as SimPlayerState,
          isPlayer ? defender as SimEnemyState : attacker as SimEnemyState,
          0
        );
        block = this.anomalySystem.modifyBlock(block, gameState);
      }

      attacker.block += block;
      log.push(`${prefix}: ${card.name} → ${block} 방어`);

      // 블록 생성 시 상징 트리거
      if (isPlayer && this.options.enableRelics) {
        const blockResults = this.relicSystem.processTrigger(
          'on_block',
          attacker as SimPlayerState,
          defender as SimEnemyState,
          0,
          { block }
        );
        this.applyRelicResults(blockResults, attacker as SimPlayerState, defender as SimEnemyState, log);
      }
    }

    // 효과 적용
    if (card.effects) {
      this.applyCardEffects(card.effects, attacker, defender, log);
    }

    // 특성 처리 (카드 사용 후 효과)
    if (card.traits) {
      this.processTraits(card.traits, attacker, defender, log, card);
    }

    return { damageDealt };
  }

  // ==================== 효과 적용 ====================

  private applyCardEffects(
    effects: CardEffects,
    attacker: SimPlayerState | SimEnemyState,
    defender: SimPlayerState | SimEnemyState,
    log: string[]
  ): void {
    if (effects.applyVulnerable) {
      defender.tokens = addToken(defender.tokens, 'vulnerable', effects.applyVulnerable);
      log.push(`  → 취약 ${effects.applyVulnerable} 부여`);
    }
    if (effects.applyWeak) {
      defender.tokens = addToken(defender.tokens, 'weak', effects.applyWeak);
      log.push(`  → 무딤 ${effects.applyWeak} 부여`);
    }
    if (effects.applyBurn) {
      defender.tokens = addToken(defender.tokens, 'burn', effects.applyBurn);
      log.push(`  → 화상 ${effects.applyBurn} 부여`);
    }
    if (effects.applyPoison) {
      defender.tokens = addToken(defender.tokens, 'poison', effects.applyPoison);
      log.push(`  → 독 ${effects.applyPoison} 부여`);
    }
    if (effects.addStrength) {
      attacker.tokens = addToken(attacker.tokens, 'strength', effects.addStrength);
      log.push(`  → 힘 +${effects.addStrength}`);
    }
    if (effects.heal) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + effects.heal);
      log.push(`  → 회복 ${effects.heal}`);
    }
    if (effects.stun) {
      defender.tokens = addToken(defender.tokens, 'stun', 1);
      log.push(`  → 기절!`);
    }
  }

  // ==================== 특성 처리 ====================

  /**
   * 카드 사용 전 특성 보너스 계산
   */
  private calculateTraitBonus(
    card: CardDefinition,
    attacker: SimPlayerState | SimEnemyState,
    defender: SimPlayerState | SimEnemyState
  ): { damageMultiplier: number; bonusEffects: string[] } {
    let damageMultiplier = 1;
    const bonusEffects: string[] = [];

    if (!card.traits) return { damageMultiplier, bonusEffects };

    for (const trait of card.traits) {
      switch (trait) {
        case 'finisher':
          // 마무리: followup_ready 토큰이 있으면 피해 2배
          if (hasToken(attacker.tokens, 'followup_ready')) {
            damageMultiplier *= BATTLE_CONSTANTS.FINISHER_MULTIPLIER;
            bonusEffects.push('마무리 발동!');
            attacker.tokens = removeToken(attacker.tokens, 'followup_ready', getTokenStacks(attacker.tokens, 'followup_ready'));
          }
          break;

        case 'crush':
          // 분쇄: 적 체력이 낮을수록 추가 피해
          const hpLostPercent = 1 - (defender.hp / defender.maxHp);
          const crushBonus = 1 + (hpLostPercent * BATTLE_CONSTANTS.CRUSH_BONUS_PER_HP_PERCENT);
          damageMultiplier *= crushBonus;
          if (crushBonus > 1.1) {
            bonusEffects.push(`분쇄 +${((crushBonus - 1) * 100).toFixed(0)}%`);
          }
          break;

        case 'cross':
          // 십자: 이전 카드와 다른 타입이면 피해 증가
          const crossToken = `cross_${card.type}`;
          const oppositeTypes = ['attack', 'defense', 'skill'].filter(t => t !== card.type);
          const hasCross = oppositeTypes.some(t => hasToken(attacker.tokens, `cross_${t}`));

          if (hasCross) {
            damageMultiplier *= BATTLE_CONSTANTS.CROSS_MULTIPLIER;
            bonusEffects.push('십자 발동!');
          }
          // 현재 타입 토큰 설정 (다음 카드용)
          for (const t of ['attack', 'defense', 'skill']) {
            attacker.tokens = removeToken(attacker.tokens, `cross_${t}`, 1);
          }
          attacker.tokens = addToken(attacker.tokens, crossToken, 1);
          break;

        case 'execute':
          // 처형: 적 체력이 25% 이하면 즉사
          if (defender.hp <= defender.maxHp * 0.25) {
            bonusEffects.push('처형!');
            // 실제 처형은 데미지 적용 후 처리
          }
          break;
      }
    }

    return { damageMultiplier, bonusEffects };
  }

  /**
   * 카드 사용 후 특성 효과 적용
   */
  private processTraits(
    traits: string[],
    attacker: SimPlayerState | SimEnemyState,
    defender: SimPlayerState | SimEnemyState,
    log: string[],
    card?: CardDefinition
  ): void {
    for (const trait of traits) {
      switch (trait) {
        case 'chain':
          // 연계: 다음 카드 피해 증가 (공세 토큰)
          attacker.tokens = addToken(attacker.tokens, 'offensive', 1);
          log.push(`  → 연계: 다음 공격 강화`);
          break;

        case 'followup':
          // 후속: 다음 카드가 finisher면 피해 2배
          attacker.tokens = addToken(attacker.tokens, 'followup_ready', 1);
          log.push(`  → 후속 준비`);
          break;

        case 'counter':
          // 반격: 다음 피해를 받으면 반격
          attacker.tokens = addToken(attacker.tokens, 'counter', 2);
          log.push(`  → 반격 준비`);
          break;

        case 'training':
          // 단련: 영구 힘 +1
          attacker.tokens = addToken(attacker.tokens, 'strength', 1);
          log.push(`  → 단련: 힘 +1`);
          break;

        case 'swift':
          // 신속: 카드 1장 드로우
          if ('hand' in attacker) {
            this.drawCards(attacker as SimPlayerState, 1);
            log.push(`  → 신속: 카드 드로우`);
          }
          break;

        case 'thorns':
          // 가시: 반사 피해 준비
          attacker.tokens = addToken(attacker.tokens, 'counter', 1);
          break;

        case 'echo':
          // 메아리: 이 카드 효과를 한 번 더 (간소화: 공격력의 50% 추가 피해)
          if (card?.damage && defender.hp > 0) {
            const echoDamage = Math.floor(card.damage * 0.5);
            defender.hp -= Math.max(0, echoDamage - defender.block);
            log.push(`  → 메아리: ${echoDamage} 추가 피해`);
          }
          break;

        case 'leech':
          // 흡혈: 가한 피해의 일부 회복
          attacker.tokens = addToken(attacker.tokens, 'absorb', 1);
          break;

        case 'pierce':
          // 관통: 다음 공격 방어력 무시 (취약 부여로 구현)
          defender.tokens = addToken(defender.tokens, 'vulnerable', 1);
          log.push(`  → 관통: 취약 부여`);
          break;

        case 'momentum':
          // 기세: 콤보 중 피해 증가
          attacker.tokens = addToken(attacker.tokens, 'offensive', 1);
          break;

        case 'protect':
          // 보호: 다음 피해 감소
          attacker.tokens = addToken(attacker.tokens, 'defensive', 2);
          log.push(`  → 보호: 방어 강화`);
          break;

        case 'focus':
          // 집중: 치명타 확률 증가
          attacker.tokens = addToken(attacker.tokens, 'crit_boost', 2);
          log.push(`  → 집중: 치명타 집중`);
          break;
      }
    }
  }

  // ==================== DOT 데미지 ====================

  private applyDotDamage(entity: SimPlayerState | SimEnemyState, log: string[]): void {
    const burn = getTokenStacks(entity.tokens, 'burn');
    if (burn > 0) {
      entity.hp -= burn;
      log.push(`🔥 화상 피해: ${burn}`);
      entity.tokens = removeToken(entity.tokens, 'burn', 1);
    }

    const poison = getTokenStacks(entity.tokens, 'poison');
    if (poison > 0) {
      entity.hp -= poison;
      log.push(`☠️ 독 피해: ${poison}`);
      entity.tokens = removeToken(entity.tokens, 'poison', 1);
    }
  }

  // ==================== 토큰 틱 ====================

  private tickTokens(entity: SimPlayerState | SimEnemyState): void {
    // 턴 종료 시 일부 토큰 감소
    const tickDownTokens = ['vulnerable', 'weak', 'offensive', 'defensive', 'guard'];

    for (const tokenId of tickDownTokens) {
      if (hasToken(entity.tokens, tokenId)) {
        entity.tokens = removeToken(entity.tokens, tokenId, 1);
      }
    }
  }

  // ==================== AI: 플레이어 카드 선택 ====================

  private selectPlayerCards(player: SimPlayerState): CardDefinition[] {
    const selected: CardDefinition[] = [];
    let energy = player.energy;

    // 손패를 카드 객체로 변환
    const handCards = player.hand
      .map(id => this.cards.get(id))
      .filter((c): c is CardDefinition => c !== undefined);

    // 점수 기반 선택
    const scored = handCards.map(card => ({
      card,
      score: this.scoreCard(card, player, selected),
    })).sort((a, b) => b.score - a.score);

    for (const { card } of scored) {
      if (selected.length >= 3) break;
      if (card.cost <= energy) {
        selected.push(card);
        energy -= card.cost;
      }
    }

    return selected;
  }

  private scoreCard(card: CardDefinition, player: SimPlayerState, selected: CardDefinition[]): number {
    let score = 0;

    // 기본 점수
    if (card.damage) score += card.damage * 2;
    if (card.block) score += card.block;

    // 다중 타격 보너스
    if (card.hits && card.hits > 1) score += (card.damage || 0) * (card.hits - 1);

    // 체력이 낮으면 방어 우선
    if (player.hp < player.maxHp * 0.3 && card.type === 'defense') {
      score += 30;
    }

    // 콤보 잠재력
    if (selected.length > 0 && card.id === selected[0].id) {
      score += 20;  // 같은 카드 = 페어/트리플 가능
    }

    // 연계 특성
    if (card.traits?.includes('chain')) score += 15;
    if (card.traits?.includes('finisher') && selected.some(c => c.traits?.includes('followup'))) {
      score += 25;
    }

    // 에너지 효율
    score += (6 - card.cost) * 2;

    return score;
  }

  // ==================== AI: 적 카드 선택 ====================

  private selectEnemyCards(enemy: SimEnemyState): CardDefinition[] {
    const selected: CardDefinition[] = [];

    for (let i = 0; i < enemy.cardsPerTurn; i++) {
      const cardId = enemy.deck[i % enemy.deck.length];
      const card = this.cards.get(cardId);
      if (card) selected.push(card);
    }

    return selected;
  }

  // ==================== 유틸리티 ====================

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

  // ==================== 리플레이 ====================

  private logEvent(event: BattleEvent): void {
    this.replayLog.push({ ...event, timestamp: Date.now() });
  }

  getReplayLog(): BattleEvent[] {
    return [...this.replayLog];
  }

  // ==================== 상징 결과 적용 ====================

  private applyRelicResults(
    results: RelicEffectResult[],
    player: SimPlayerState,
    enemy: SimEnemyState,
    log: string[]
  ): void {
    for (const result of results) {
      // 카드 드로우
      if (result.draw && result.draw > 0) {
        this.drawCards(player, result.draw);
        log.push(`  🎴 상징 효과: ${result.draw}장 드로우`);
      }

      // 에너지 획득
      if (result.energyGain && result.energyGain > 0) {
        player.energy += result.energyGain;
        log.push(`  ⚡ 상징 효과: 에너지 +${result.energyGain}`);
      }

      // 피해 가하기
      if (result.dealDamage && result.dealDamage > 0) {
        const actualDamage = Math.max(0, result.dealDamage - enemy.block);
        enemy.block = Math.max(0, enemy.block - result.dealDamage);
        enemy.hp -= actualDamage;
        log.push(`  💥 상징 효과: ${actualDamage} 피해`);
      }

      // 회복
      if (result.heal && result.heal > 0) {
        player.hp = Math.min(player.maxHp, player.hp + result.heal);
        log.push(`  💚 상징 효과: ${result.heal} 회복`);
      }

      // 방어력 획득
      if (result.blockGain && result.blockGain > 0) {
        player.block += result.blockGain;
        log.push(`  🛡️ 상징 효과: 방어력 +${result.blockGain}`);
      }

      // 토큰 부여
      if (result.tokenGrant) {
        for (const { tokenId, stacks, target } of result.tokenGrant) {
          if (target === 'player') {
            player.tokens = addToken(player.tokens, tokenId, stacks);
            log.push(`  ✨ 상징 효과: ${tokenId} +${stacks}`);
          } else {
            enemy.tokens = addToken(enemy.tokens, tokenId, stacks);
            log.push(`  ✨ 상징 효과: 적에게 ${tokenId} +${stacks}`);
          }
        }
      }

      // 힘/민첩 영구 보너스
      if (result.strengthBonus) {
        player.tokens = addToken(player.tokens, 'strength', result.strengthBonus);
        log.push(`  💪 상징 효과: 힘 +${result.strengthBonus}`);
      }

      if (result.dexterityBonus) {
        player.tokens = addToken(player.tokens, 'dexterity', result.dexterityBonus);
        log.push(`  🏃 상징 효과: 민첩 +${result.dexterityBonus}`);
      }
    }
  }

  // ==================== 게임 상태 생성 ====================

  private createGameState(
    player: SimPlayerState,
    enemy: SimEnemyState,
    turn: number
  ): GameState {
    return {
      player: { ...player },
      enemy: { ...enemy },
      turn,
      phase: 'action',
      timeline: [],
    };
  }
}

// ==================== 이벤트 타입 ====================

export interface BattleEvent {
  type: 'battle_start' | 'battle_end' | 'turn_start' | 'turn_end' | 'card_play' | 'damage' | 'heal' | 'combo' | 'effect';
  turn: number;
  timestamp?: number;
  data: Record<string, unknown>;
}

// ==================== 팩토리 함수 ====================

export function createPlayerState(config: {
  hp?: number;
  deck: string[];
  energy?: number;
  relics?: string[];
}): SimPlayerState {
  return {
    hp: config.hp || 100,
    maxHp: config.hp || 100,
    block: 0,
    strength: 0,
    etherPts: 0,
    tokens: {},
    deck: [...config.deck],
    hand: [],
    discard: [],
    energy: config.energy || 3,
    maxEnergy: config.energy || 3,
    relics: config.relics || [],
  };
}

export function createEnemyState(config: {
  id: string;
  name: string;
  hp: number;
  deck: string[];
  cardsPerTurn: number;
}): SimEnemyState {
  return {
    id: config.id,
    name: config.name,
    hp: config.hp,
    maxHp: config.hp,
    block: 0,
    strength: 0,
    etherPts: 0,
    tokens: {},
    deck: [...config.deck],
    cardsPerTurn: config.cardsPerTurn,
  };
}
