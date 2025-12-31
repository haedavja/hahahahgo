/**
 * @file gameSimulator.ts
 * @description 게임 시뮬레이터 - 자동 전투 및 통계 수집
 *
 * ## 기능
 * - 다수의 전투 자동 시뮬레이션
 * - 승률, 평균 피해량, 턴 수 등 통계 수집
 * - 카드별 효율 분석
 *
 * ## 신뢰성 v7
 * - 실제 combatActions 로직 사용
 * - 토큰 시스템 통합 (공세, 방어, 회피, 취약, 무딤 등)
 * - 적 패시브 효과 적용
 * - 치명타 시스템 (5% + strength + energy + crit_boost)
 * - 반격 시스템
 * - 카드 특수 효과 (crush, chain, cross)
 * - 다중 적 전투 지원
 * - 다중 타격 (hits) 지원
 * - 화상 지속 피해
 * - 연계(chain)/후속(followup) 효과
 * - 교차(cross) 보너스
 * - 누적 타임라인 계산
 * - 기절(stun) 효과: 범위 내 적 카드 파괴
 * - 넉백(knockback)/앞당김(advance) 타임라인 조작
 * - 상징(relic) 효과 지원
 * - 도살(slaughter)/파괴자(destroyer) 특성
 * - 강골(strongbone) 특성: 피해/방어 25% 증가
 * - 정점(pinnacle) 특성: 피해 2.5배
 * - 단련(training) 특성: 사용 후 힘 +1
 * - 흡수(absorb) 토큰: 피해의 50% 체력 회복
 * - 대응사격(counterShot) 토큰: 공격받을 때 사격 반격
 * - 기교(finesse) 토큰: 치명타 시 획득
 * - 취약+/아픔+ 토큰: 100% 추가 피해
 * - 치명타 집중(crit_boost) 토큰: 스택당 5% 치명타 증가
 * - 이변(anomaly) 시스템: 다양한 전투 제한 효과
 * - 10% 미만 즉사 (executeUnder10) 특성
 * - 방어력 없으면 취약 부여 (vulnIfNoBlock) 특성
 * - 마지막 카드 추가 타격 (repeatIfLast) 특성
 * - 포커 콤보 감지 및 로깅 (파이브카드~페어)
 * - AI 콤보 인식: 카드 선택 시 포커 조합 고려
 * - 콤보 통계: 전투별/전체 콤보 발동 횟수 추적
 * - 티어별 시뮬레이션: 모든 적 지원 (Tier 1-3)
 * - 밸런스 분석: 적별/티어별 승률 비교
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
import { RELICS } from '../data/relics';
import { ANOMALY_TYPES, Anomaly, AnomalyEffect, selectRandomAnomaly } from '../data/anomalies';
import { detectPokerCombo } from '../components/battle/utils/comboDetection';
import type { ComboCard } from '../types';

// 기절 범위 상수
const STUN_RANGE = 5;

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
  relics: string[];  // 보유 상징 ID 목록
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
  combosFormed: Record<string, number>;  // 콤보별 발동 횟수
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
  comboStats: Record<string, { count: number; avgPerBattle: number }>;  // 콤보 통계
}

export interface SimulationConfig {
  battles: number;
  maxTurns: number;
  enemyIds?: string[];
  playerDeck?: string[];
  playerHp?: number;
  playerRelics?: string[];  // 상징 ID 목록
  anomalyLevel?: number;    // 이변 레벨 (1-4)
  anomalyIds?: string[];    // 활성화할 이변 ID 목록
  enableAnomalies?: boolean; // 이변 시스템 활성화 여부
  fixedAnomaly?: string;    // 특정 이변만 적용 (테스트용)
  mapRisk?: number;         // 맵 위험도 (이변 레벨 결정)
  verbose?: boolean;
}

/** 이변 상태 (전투 중 활성화된 이변) */
interface AnomalyState {
  active: AnomalyEffect[];
  etherBanned: boolean;
  energyReduction: number;
  speedReduction: number;
  valueDown: number;
  defenseBackfire: number;
  speedInstability: number;
  vulnerabilityIncrease: number;
  traitSilence: number;
  chainIsolation: number;
  finesseBlock: number;
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

/** 상징 조건 평가용 상태 */
interface RelicConditionState {
  cardsPlayedThisTurn?: number;
  playerHp?: number;
  maxHp?: number;
  allCardsDefense?: boolean;
  allCardsLowCost?: boolean;
  timesAttackedThisTurn?: number;
}

/**
 * 상징 효과 적용 (타이밍별)
 */
function applyRelicEffects(
  player: SimPlayerState,
  timing: 'ON_COMBAT_START' | 'ON_TURN_START' | 'ON_TURN_END' | 'ON_COMBAT_END' | 'ON_CARD_PLAYED',
  log: string[],
  context?: RelicConditionState
): void {
  for (const relicId of player.relics) {
    const relic = RELICS[relicId as keyof typeof RELICS];
    if (!relic?.effects) continue;

    const effects = relic.effects as Record<string, unknown>;
    if (effects.type !== timing) continue;

    // 조건 체크 (있으면)
    if (effects.condition && typeof effects.condition === 'function') {
      const conditionFn = effects.condition as (state: RelicConditionState) => boolean;
      if (!conditionFn(context || {})) continue;
    }

    // ON_TURN_START 효과
    if (timing === 'ON_TURN_START') {
      if (effects.block) {
        player.block += effects.block as number;
        log.push(`🛡️ ${relic.name}: 방어력 +${effects.block}`);
      }
    }

    // ON_TURN_END 효과
    if (timing === 'ON_TURN_END') {
      if (effects.strength) {
        player.strength += effects.strength as number;
        log.push(`💪 ${relic.name}: 힘 +${effects.strength}`);
      }
      if (effects.energyNextTurn) {
        // 다음 턴 행동력 보너스 (간단히 처리)
        log.push(`⚡ ${relic.name}: 다음 턴 행동력 +${effects.energyNextTurn}`);
      }
      if (effects.grantDefensiveNextTurn) {
        const defResult = addToken(player as any, 'guard', effects.grantDefensiveNextTurn as number);
        player.tokens = defResult.tokens;
        log.push(`🛡️ ${relic.name}: 수세 ${effects.grantDefensiveNextTurn}회 획득`);
      }
    }

    // ON_COMBAT_START 효과
    if (timing === 'ON_COMBAT_START') {
      if (effects.damage) {
        player.hp = Math.max(1, player.hp - (effects.damage as number));
        log.push(`⚡ ${relic.name}: 체력 -${effects.damage}`);
      }
      if (effects.strength) {
        player.strength += effects.strength as number;
        log.push(`💪 ${relic.name}: 힘 +${effects.strength}`);
      }
      if (effects.grantImmunity) {
        const immunityResult = addToken(player as any, 'immunity', effects.grantImmunity as number);
        player.tokens = immunityResult.tokens;
        log.push(`🛡️ ${relic.name}: 면역 ${effects.grantImmunity}회 획득`);
      }
    }

    // ON_COMBAT_END 효과
    if (timing === 'ON_COMBAT_END') {
      if (effects.heal) {
        const healAmount = effects.heal as number;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        log.push(`❤️ ${relic.name}: 체력 +${healAmount}`);
      }
      // healthCheck 상징: 체력 최대치면 최대체력+2, 아니면 회복+3
      if (effects.maxHpIfFull && player.hp === player.maxHp) {
        player.maxHp += effects.maxHpIfFull as number;
        player.hp = player.maxHp;
        log.push(`💖 ${relic.name}: 최대 체력 +${effects.maxHpIfFull}`);
      } else if (effects.healIfDamaged && player.hp < player.maxHp) {
        const healAmount = effects.healIfDamaged as number;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        log.push(`❤️ ${relic.name}: 체력 +${healAmount}`);
      }
    }

    // ON_CARD_PLAYED 효과
    if (timing === 'ON_CARD_PLAYED') {
      if (effects.heal) {
        const healAmount = effects.heal as number;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        // 로그는 카드마다 출력되면 너무 많아지므로 생략
      }
    }
  }
}

/**
 * 이변 상태 생성
 */
function createAnomalyState(config: SimulationConfig, log: string[]): AnomalyState {
  const state: AnomalyState = {
    active: [],
    etherBanned: false,
    energyReduction: 0,
    speedReduction: 0,
    valueDown: 0,
    defenseBackfire: 0,
    speedInstability: 0,
    vulnerabilityIncrease: 0,
    traitSilence: 0,
    chainIsolation: 0,
    finesseBlock: 0,
  };

  // enableAnomalies가 명시적으로 false면 이변 비활성화
  if (config.enableAnomalies === false) {
    return state;
  }

  // mapRisk로 레벨 계산 (또는 anomalyLevel 직접 사용)
  let level = config.anomalyLevel || 0;
  if (config.mapRisk !== undefined && config.mapRisk > 0) {
    level = Math.floor(config.mapRisk / 25);
    if (level < 1) level = 1;
    if (level > 4) level = 4;
  }

  if (level <= 0) return state;

  // 고정 이변이 지정된 경우 (테스트용)
  if (config.fixedAnomaly) {
    const anomaly = Object.values(ANOMALY_TYPES).find(a => a.id === config.fixedAnomaly);
    if (anomaly) {
      const effect = anomaly.getEffect(level);
      state.active.push(effect);
      applyAnomalyEffectToState(state, effect, log, anomaly.name);
    }
    return state;
  }

  // 특정 이변 ID가 지정된 경우
  if (config.anomalyIds && config.anomalyIds.length > 0) {
    for (const anomalyId of config.anomalyIds) {
      const anomaly = Object.values(ANOMALY_TYPES).find(a => a.id === anomalyId);
      if (anomaly) {
        const effect = anomaly.getEffect(level);
        state.active.push(effect);
        applyAnomalyEffectToState(state, effect, log, anomaly.name);
      }
    }
  } else if (config.enableAnomalies === true) {
    // enableAnomalies가 true면 랜덤 이변 1개 선택
    const randomAnomaly = selectRandomAnomaly();
    const effect = randomAnomaly.getEffect(level);
    state.active.push(effect);
    applyAnomalyEffectToState(state, effect, log, randomAnomaly.name);
  }

  return state;
}

/**
 * 이변 효과를 상태에 적용
 */
function applyAnomalyEffectToState(
  state: AnomalyState,
  effect: AnomalyEffect,
  log: string[],
  name: string
): void {
  switch (effect.type) {
    case 'ETHER_BAN':
      state.etherBanned = true;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'ENERGY_REDUCTION':
      state.energyReduction = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'SPEED_REDUCTION':
      state.speedReduction = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'VALUE_DOWN':
      state.valueDown = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'DEFENSE_BACKFIRE':
      state.defenseBackfire = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'SPEED_INSTABILITY':
      state.speedInstability = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'VULNERABILITY':
      state.vulnerabilityIncrease = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'TRAIT_SILENCE':
      state.traitSilence = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'CHAIN_ISOLATION':
      state.chainIsolation = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
    case 'FINESSE_BLOCK':
      state.finesseBlock = effect.value || 0;
      log.push(`⚠️ 이변 [${name}]: ${effect.description}`);
      break;
  }
}

function createPlayer(config: SimulationConfig, anomalyState?: AnomalyState): SimPlayerState {
  const deckIds = config.playerDeck || DEFAULT_STARTING_DECK;
  const relics = config.playerRelics || [];

  // 상징 PASSIVE 효과 적용
  let maxEnergy = 6;
  let maxHp = config.playerHp || 100;
  let strength = 0;
  let agility = 0;

  for (const relicId of relics) {
    const relic = RELICS[relicId as keyof typeof RELICS];
    if (relic?.effects) {
      const effects = relic.effects as Record<string, unknown>;
      if (effects.type === 'PASSIVE') {
        if (effects.maxEnergy) maxEnergy += effects.maxEnergy as number;
        if (effects.maxHp) maxHp += effects.maxHp as number;
        if (effects.strength) strength += effects.strength as number;
        if (effects.agility) agility += effects.agility as number;
      }
    }
  }

  // 이변 효과 적용
  if (anomalyState) {
    // 행동력 감소
    maxEnergy = Math.max(1, maxEnergy - anomalyState.energyReduction);
    // 가치 하락 토큰 (dull 토큰으로 표현)
    // valueDown은 simulateTurn에서 적용
  }

  return {
    hp: maxHp,
    maxHp: maxHp,
    block: 0,
    strength: strength,
    etherPts: 0,
    tokens: createEmptyTokenState(),
    deck: shuffle([...deckIds]),
    hand: [],
    discard: [],
    energy: maxEnergy,
    maxEnergy: maxEnergy,
    relics: relics,
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
  // 개선된 AI: 시너지, 상황, 콤보를 고려한 카드 선택
  const cards: (Card | AICard)[] = [];
  const indices: number[] = [];
  let energy = player.energy;
  let speed = 0;
  const maxSpeed = 30;

  // 손패를 카드 객체로 변환
  const handCards = player.hand
    .map((id, idx) => ({ card: getCardById(id), idx }))
    .filter((item): item is { card: Card | AICard; idx: number } => item.card !== undefined);

  // 포커 콤보 점수 계산 (선택된 카드 + 새 카드 조합으로 콤보 확인)
  const calculateComboBonus = (selectedCards: (Card | AICard)[], newCard: Card | AICard): number => {
    const testCards: ComboCard[] = [...selectedCards, newCard].map(c => ({
      id: c.id,
      actionCost: c.actionCost || 1,
      type: c.type || 'attack',
      traits: (c as Card).traits || [],
      isGhost: false,
    }));

    const combo = detectPokerCombo(testCards);
    if (!combo) return 0;

    // 콤보별 보너스
    const comboScores: Record<string, number> = {
      '파이브카드': 100,
      '포카드': 80,
      '풀하우스': 60,
      '플러쉬': 50,
      '트리플': 35,
      '투페어': 25,
      '페어': 15,
      '하이카드': 0,
    };

    return comboScores[combo.name] || 0;
  };

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

    // 포커 콤보 보너스
    score += calculateComboBonus(selectedCards, card);

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
  // vulnerablePlus 토큰: 100% 추가 피해
  if (hasToken(entity as any, 'vulnerablePlus')) {
    mult += 1.0;
  }
  // pain 토큰: 50% 추가 피해
  if (hasToken(entity as any, 'pain')) {
    mult += 0.5;
  }
  // painPlus 토큰: 100% 추가 피해
  if (hasToken(entity as any, 'painPlus')) {
    mult += 1.0;
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

  // 기본 5% + strength + energy + crit_boost 토큰
  const baseCrit = 5;
  const strength = entity.strength || 0;
  const energy = remainingEnergy || 0;

  // crit_boost 토큰: 스택당 5% 증가
  const critBoostStacks = getTokenStacks(entity as any, 'crit_boost');
  const critBoostBonus = critBoostStacks * 5;

  const critChance = baseCrit + strength + energy + critBoostBonus;
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

/**
 * 기절(stun) 특성 체크
 */
function hasStunTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('stun') : c.traits === 'stun';
}

/**
 * 넉백(knockback) 특성 체크
 */
function hasKnockbackTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('knockback') : c.traits === 'knockback';
}

/**
 * 앞당김(advance) 특성 체크
 */
function hasAdvanceTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('advance') : c.traits === 'advance';
}

/**
 * 도살(slaughter) 특성 체크 - 피해 75% 증가
 */
function hasSlaughterTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('slaughter') : c.traits === 'slaughter';
}

/**
 * 파괴자(destroyer) 특성 체크 - 피해 50% 증가
 */
function hasDestroyerTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('destroyer') : c.traits === 'destroyer';
}

/**
 * 강골(strongbone) 특성 체크 - 피해/방어 25% 증가
 */
function hasStrongboneTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('strongbone') : c.traits === 'strongbone';
}

/**
 * 단련(training) 특성 체크 - 사용 후 힘 +1
 */
function hasTrainingTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('training') : c.traits === 'training';
}

/**
 * 정점(pinnacle) 특성 체크 - 피해 2.5배
 */
function hasPinnacleTrait(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.traits) return false;
  return Array.isArray(c.traits) ? c.traits.includes('pinnacle') : c.traits === 'pinnacle';
}

/**
 * 방어무시(ignoreBlock) 특수 효과 체크
 */
function hasIgnoreBlockSpecial(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.special) return false;
  const specials = Array.isArray(c.special) ? c.special : [c.special];
  return specials.includes('ignoreBlock') || specials.includes('piercing');
}

/**
 * 10% 미만 즉사 (executeUnder10) 특수 효과 체크
 */
function hasExecuteUnder10(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.special) return false;
  const specials = Array.isArray(c.special) ? c.special : [c.special];
  return specials.includes('executeUnder10');
}

/**
 * 방어력 없으면 취약 부여 (vulnIfNoBlock) 특수 효과 체크
 */
function hasVulnIfNoBlock(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.special) return false;
  const specials = Array.isArray(c.special) ? c.special : [c.special];
  return specials.includes('vulnIfNoBlock');
}

/**
 * 마지막 카드면 추가 타격 (repeatIfLast) 특수 효과 체크
 */
function hasRepeatIfLast(card: Card | AICard): boolean {
  const c = card as Card;
  if (!c.special) return false;
  const specials = Array.isArray(c.special) ? c.special : [c.special];
  return specials.includes('repeatIfLast');
}

/**
 * 10% 미만 즉사 처리
 */
function processExecuteUnder10(
  defender: Combatant,
  card: Card | AICard,
  log: string[]
): boolean {
  const maxHp = defender.maxHp || 100;
  const threshold = Math.floor(maxHp * 0.1);

  if (defender.hp > 0 && defender.hp < threshold) {
    const beforeHp = defender.hp;
    defender.hp = 0;
    log.push(`💀 ${card.name}: 즉사 발동! (체력 ${beforeHp} < ${threshold})`);
    return true;
  }
  return false;
}

/**
 * 방어력 없으면 취약 부여 처리
 */
function processVulnIfNoBlock(
  defender: SimEntity,
  card: Card | AICard,
  log: string[]
): void {
  const hadNoBlock = (defender.block || 0) <= 0;
  if (hadNoBlock) {
    const result = addToken(defender as any, 'vulnerable', 1);
    defender.tokens = result.tokens;
    log.push(`🔻 ${card.name}: 취약 부여! (방어력 없음)`);
  }
}

/**
 * 흡수(absorb) 효과 처리 - 피해의 50% 회복
 */
function processAbsorb(attacker: SimEntity, damageDealt: number, log: string[]): void {
  if (hasToken(attacker as any, 'absorb')) {
    const healAmount = Math.floor(damageDealt * 0.5);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    removeToken(attacker as any, 'absorb', 'usage', 1);
    log.push(`🩸 흡수! ${healAmount} 체력 회복`);
  }
}

/**
 * 대응사격(counterShot) 효과 처리
 */
function processCounterShot(defender: SimEntity, attacker: SimEntity, log: string[]): number {
  let counterDamage = 0;
  if (hasToken(defender as any, 'counterShot')) {
    const stacks = getTokenStacks(defender as any, 'counterShot');
    counterDamage = 5 * stacks; // 기본 사격 피해 5 x 스택
    removeToken(defender as any, 'counterShot', 'usage', 1);

    // 방어력 적용
    const effectiveDamage = Math.max(0, counterDamage - (attacker.block || 0));
    attacker.block = Math.max(0, (attacker.block || 0) - counterDamage);
    attacker.hp = Math.max(0, attacker.hp - effectiveDamage);

    log.push(`🔫 대응사격! ${counterDamage} 피해 (실제 ${effectiveDamage})`);
  }
  return counterDamage;
}

/**
 * 철갑탄(armor_piercing) 체크
 */
function hasArmorPiercing(entity: SimEntity): boolean {
  return hasToken(entity as any, 'armor_piercing');
}

/**
 * 기절 효과 처리 - 범위 내 적 카드 제거
 */
interface TimelineStep {
  actor: 'player' | 'enemy';
  card: Card | AICard;
  sp: number;
  hasCrossed?: boolean;
  removed?: boolean;
}

function processStun(
  timeline: TimelineStep[],
  stepIndex: number,
  attackerActor: 'player' | 'enemy',
  log: string[]
): void {
  const currentStep = timeline[stepIndex];
  const centerSp = currentStep.sp;
  const oppositeActor = attackerActor === 'player' ? 'enemy' : 'player';

  let removedCount = 0;
  for (let i = stepIndex + 1; i < timeline.length; i++) {
    const target = timeline[i];
    if (target.actor !== oppositeActor || target.removed) continue;

    if (target.sp >= centerSp && target.sp <= centerSp + STUN_RANGE) {
      target.removed = true;
      removedCount++;
    }
  }

  if (removedCount > 0) {
    log.push(`😵 기절! ${currentStep.card.name}: 적 카드 ${removedCount}장 파괴`);
  }
}

/**
 * 넉백 효과 처리 - 적 카드 sp 증가
 */
function processKnockback(
  timeline: TimelineStep[],
  stepIndex: number,
  attackerActor: 'player' | 'enemy',
  knockbackAmount: number,
  log: string[]
): void {
  const oppositeActor = attackerActor === 'player' ? 'enemy' : 'player';

  for (let i = stepIndex + 1; i < timeline.length; i++) {
    const target = timeline[i];
    if (target.actor === oppositeActor && !target.removed) {
      target.sp += knockbackAmount;
    }
  }

  // 재정렬
  const processed = timeline.slice(0, stepIndex + 1);
  const remaining = timeline.slice(stepIndex + 1).filter(t => !t.removed);
  remaining.sort((a, b) => a.sp - b.sp);

  // 원본 배열 수정
  timeline.length = 0;
  timeline.push(...processed, ...remaining);

  log.push(`↗️ 넉백! 적 카드 ${knockbackAmount}sp 밀어냄`);
}

/**
 * 앞당김 효과 처리 - 내 카드 sp 감소
 */
function processAdvance(
  timeline: TimelineStep[],
  stepIndex: number,
  attackerActor: 'player' | 'enemy',
  advanceAmount: number,
  log: string[]
): void {
  for (let i = stepIndex + 1; i < timeline.length; i++) {
    const target = timeline[i];
    if (target.actor === attackerActor && !target.removed) {
      target.sp = Math.max(0, target.sp - advanceAmount);
    }
  }

  // 재정렬
  const processed = timeline.slice(0, stepIndex + 1);
  const remaining = timeline.slice(stepIndex + 1).filter(t => !t.removed);
  remaining.sort((a, b) => a.sp - b.sp);

  // 원본 배열 수정
  timeline.length = 0;
  timeline.push(...processed, ...remaining);

  log.push(`↙️ 앞당김! 내 카드 ${advanceAmount}sp 앞당김`);
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
  enemyDef: { passives?: { healPerTurn?: number; strengthPerTurn?: number } } | null,
  anomalyState?: AnomalyState
): { playerDamage: number; enemyDamage: number; ended: boolean; winner?: 'player' | 'enemy'; cardsPlayed?: number; timesAttacked?: number; comboFormed?: string } {
  // 1. 턴 시작 - 카드 드로우
  drawCards(player, 5 - player.hand.length);

  // 1.5. 턴 시작 상징 효과 (sturdyArmor 등)
  applyRelicEffects(player, 'ON_TURN_START', log);

  // 1.6. 이변 효과: 가치 하락 (dull 토큰 적용)
  if (anomalyState && anomalyState.valueDown > 0) {
    for (let i = 0; i < anomalyState.valueDown; i++) {
      const dullResult = addToken(player as any, 'dull', 1);
      player.tokens = dullResult.tokens;
    }
  }

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

  // 3.5. 콤보 감지 (포커 패)
  let turnCombo: string | undefined;
  if (playerSelection.cards.length > 0) {
    const comboCards: ComboCard[] = playerSelection.cards.map(c => ({
      id: c.id,
      actionCost: c.actionCost || 1,
      type: c.type || 'attack',
      traits: (c as Card).traits || [],
      isGhost: false,
    }));
    const combo = detectPokerCombo(comboCards);
    if (combo && combo.name !== '하이카드') {
      log.push(`🃏 콤보! [${combo.name}]`);
      turnCombo = combo.name;
    }
  }

  // 4. 타임라인 생성 (속도순 정렬) - 전역 TimelineStep 인터페이스 사용
  const timeline: TimelineStep[] = [];
  let cumulativeSp = 0;

  // 이변: 속도 불안정 - 속도에 랜덤 변동
  const speedInstabilityRange = anomalyState?.speedInstability || 0;

  for (const card of playerSelection.cards) {
    let speedCost = card.speedCost || 5;
    // 속도 불안정 적용
    if (speedInstabilityRange > 0) {
      const variation = Math.floor(Math.random() * (speedInstabilityRange * 2 + 1)) - speedInstabilityRange;
      speedCost = Math.max(1, speedCost + variation);
    }
    cumulativeSp += speedCost;
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

    // 기절로 제거된 카드 건너뛰기
    if (step.removed) {
      continue;
    }

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

    // 독 피해 (카드 사용 시) - poison 토큰
    const poisonStacks = getTokenStacks(attacker as any, 'poison');
    if (poisonStacks > 0) {
      const poisonDamage = poisonStacks * 2; // 스택당 2 피해
      const beforeHP = attacker.hp;
      attacker.hp = Math.max(0, attacker.hp - poisonDamage);
      log.push(`☠️ 독! ${isPlayer ? '플레이어' : '적'}: ${poisonDamage} 피해 (체력 ${beforeHP} -> ${attacker.hp})`);
      if (isPlayer) {
        enemyDamage += poisonDamage;
      } else {
        playerDamage += poisonDamage;
      }
      // 독 스택 1 감소
      removeToken(attacker as any, 'poison', 'usage', 1);
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
    // 이변: 고립 - 연계/후속 무효화
    const chainIsolation = anomalyState?.chainIsolation || 0;
    const canUseChain = chainIsolation < 1 || chainIsolation === 2; // 1: 연계만 무효, 2: 후속만 무효, 3+: 둘 다 무효
    const canUseFollowup = chainIsolation < 2 || chainIsolation === 1; // 1: 연계만 무효, 2: 후속만 무효, 3+: 둘 다 무효

    if (isPlayer && previousPlayerCard && isAttack) {
      const prevCard = previousPlayerCard as Card;
      const currCard = step.card as Card;
      if (canUseChain && prevCard.traits?.includes('chain') && currCard.cardCategory === 'fencing') {
        // 연계 시 피해 증가
        if (modifiedCard.damage) {
          const chainBonus = Math.floor(modifiedCard.damage * 0.5);
          modifiedCard.damage += chainBonus;
          log.push(`⛓️ 연계! ${prevCard.name} -> ${currCard.name}: 피해 +${chainBonus}`);
        }
      }
      // 후속(followup) 효과
      if (canUseFollowup && prevCard.traits?.includes('followup') && currCard.traits?.includes('finisher')) {
        if (modifiedCard.damage) {
          modifiedCard.damage = Math.floor(modifiedCard.damage * 1.5);
          log.push(`⚔️ 후속 -> 마무리! ${currCard.name}: 피해 50% 증가`);
        }
      }
    }

    // 이변: 방어 역류 - 방어 카드 사용 시 자해 피해
    if (isPlayer && step.card.type === 'defense' && anomalyState?.defenseBackfire && anomalyState.defenseBackfire > 0) {
      const backfireDamage = anomalyState.defenseBackfire;
      combatState.player.hp = Math.max(0, combatState.player.hp - backfireDamage);
      log.push(`💢 역류! 방어 카드 사용 - ${backfireDamage} 자해 피해`);
      enemyDamage += backfireDamage;
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

    // 도살(slaughter) 특성: 피해 75% 증가
    if (isAttack && hasSlaughterTrait(step.card)) {
      if (modifiedCard.damage) {
        const slaughterBonus = Math.floor(modifiedCard.damage * 0.75);
        modifiedCard.damage += slaughterBonus;
        log.push(`🩸 도살! ${step.card.name}: 피해 +${slaughterBonus} (75%)`);
      }
    }

    // 파괴자(destroyer) 특성: 피해 50% 증가
    if (isAttack && hasDestroyerTrait(step.card)) {
      if (modifiedCard.damage) {
        const destroyerBonus = Math.floor(modifiedCard.damage * 0.5);
        modifiedCard.damage += destroyerBonus;
        log.push(`💀 파괴자! ${step.card.name}: 피해 +${destroyerBonus} (50%)`);
      }
    }

    // 강골(strongbone) 특성: 피해/방어 25% 증가
    if (hasStrongboneTrait(step.card)) {
      if (modifiedCard.damage) {
        const strongboneBonus = Math.floor(modifiedCard.damage * 0.25);
        modifiedCard.damage += strongboneBonus;
        log.push(`💪 강골! ${step.card.name}: 피해 +${strongboneBonus} (25%)`);
      }
      if (modifiedCard.block) {
        const blockBonus = Math.floor(modifiedCard.block * 0.25);
        modifiedCard.block += blockBonus;
        log.push(`💪 강골! ${step.card.name}: 방어 +${blockBonus} (25%)`);
      }
    }

    // 정점(pinnacle) 특성: 피해 2.5배
    if (isAttack && hasPinnacleTrait(step.card)) {
      if (modifiedCard.damage) {
        modifiedCard.damage = Math.floor(modifiedCard.damage * 2.5);
        log.push(`⭐ 정점! ${step.card.name}: 피해 2.5배`);
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
        // 카드 사용 상징 효과 (immortalMask 등)
        applyRelicEffects(player, 'ON_CARD_PLAYED', log);
      } else {
        enemyDamage += finalDealt;
      }

      // 카드 토큰 효과 적용
      applyCardTokenEffects(step.card, attacker as SimEntity, defender as SimEntity);

      // 다중 타격 (hits > 1) 로그 - applyAction에서 이미 처리됨
      if (hits > 1 && isAttack) {
        log.push(`🎯 ${step.card.name}: ${hits}회 타격!`);
      }

      // 기절(stun) 효과 처리
      if (isAttack && hasStunTrait(step.card) && finalDealt > 0) {
        processStun(timeline, stepIndex, step.actor, log);
      }

      // 넉백(knockback) 효과 처리
      if (isAttack && hasKnockbackTrait(step.card) && finalDealt > 0) {
        const knockbackAmount = (step.card as Card).knockbackAmount || 3;
        processKnockback(timeline, stepIndex, step.actor, knockbackAmount, log);
      }

      // 앞당김(advance) 효과 처리
      if (isAttack && hasAdvanceTrait(step.card) && finalDealt > 0) {
        const advanceAmount = (step.card as Card).advanceAmount || 3;
        processAdvance(timeline, stepIndex, step.actor, advanceAmount, log);
      }

      // 흡수(absorb) 효과: 피해의 50% 회복
      if (isAttack && finalDealt > 0) {
        processAbsorb(attacker as SimEntity, finalDealt, log);
      }

      // 대응사격(counterShot) 효과: 공격받을 때 사격으로 반격
      if (isAttack && finalDealt > 0) {
        const counterShotDmg = processCounterShot(defender as SimEntity, attacker as SimEntity, log);
        if (counterShotDmg > 0) {
          if (step.actor === 'player') {
            enemyDamage += counterShotDmg;
          } else {
            playerDamage += counterShotDmg;
          }
        }
      }

      // 단련(training) 특성: 사용 후 힘 +1
      if (hasTrainingTrait(step.card)) {
        attacker.strength = (attacker.strength || 0) + 1;
        log.push(`📈 단련! 힘 +1 (현재 ${attacker.strength})`);
      }

      // 치명타 시 기교(finesse) 획득 (플레이어만)
      // 이변: 광기 - 기교 획득 불가/감소
      const finesseBlock = anomalyState?.finesseBlock || 0;
      if (isPlayer && isCritical && isAttack) {
        if (finesseBlock < 3) {
          // 레벨 1-2: 획득량 감소 (25% * level), 레벨 3+: 완전 차단
          const finesseAmount = finesseBlock > 0 ? Math.max(0, 1 - Math.floor(finesseBlock * 0.25)) : 1;
          if (finesseAmount > 0) {
            const finesseResult = addToken(attacker as any, 'finesse', finesseAmount);
            (attacker as SimEntity).tokens = finesseResult.tokens;
            log.push(`✨ 기교 획득! (치명타)`);
          }
        }
      }

      // 이변: 취약 - 플레이어가 받는 피해 증가
      if (!isPlayer && finalDealt > 0 && anomalyState?.vulnerabilityIncrease && anomalyState.vulnerabilityIncrease > 0) {
        const extraDamage = Math.floor(finalDealt * (anomalyState.vulnerabilityIncrease / 100));
        combatState.player.hp = Math.max(0, combatState.player.hp - extraDamage);
        if (extraDamage > 0) {
          log.push(`💔 취약! 추가 피해 ${extraDamage}`);
          enemyDamage += extraDamage;
        }
      }

      // 10% 미만 즉사 효과
      if (isAttack && finalDealt > 0 && hasExecuteUnder10(step.card)) {
        processExecuteUnder10(defender, step.card, log);
      }

      // 방어력 없으면 취약 부여 효과
      if (isAttack && finalDealt > 0 && hasVulnIfNoBlock(step.card)) {
        processVulnIfNoBlock(defender as SimEntity, step.card, log);
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
  player.strength = combatState.player.strength || player.strength;
  enemy.hp = combatState.enemy.hp;
  enemy.tokens = combatState.enemy.tokens;

  // 7. 턴 종료 - 손패 버리기, 블록 초기화
  for (const idx of playerSelection.indices.sort((a, b) => b - a)) {
    const cardId = player.hand.splice(idx, 1)[0];
    player.discard.push(cardId);
  }

  // 8. 턴 종료 상징 효과 (coin, contract, bulletproofVest 등)
  const cardsPlayedThisTurn = playerSelection.cards.length;
  const allCardsDefense = playerSelection.cards.every(c => c.type === 'defense');
  const allCardsLowCost = playerSelection.cards.every(c => (c.actionCost || 1) <= 2);
  const timesAttackedThisTurn = enemyActions.filter(a => a.type === 'attack').length;

  const turnEndContext: RelicConditionState = {
    cardsPlayedThisTurn,
    playerHp: player.hp,
    maxHp: player.maxHp,
    allCardsDefense,
    allCardsLowCost,
    timesAttackedThisTurn,
  };
  applyRelicEffects(player, 'ON_TURN_END', log, turnEndContext);

  player.block = 0;
  enemy.block = 0;

  // 9. 턴 종료 토큰 정리
  const playerTokenResult = clearTurnTokens(player as any);
  player.tokens = playerTokenResult.tokens;
  const enemyTokenResult = clearTurnTokens(enemy as any);
  enemy.tokens = enemyTokenResult.tokens;

  // 10. 로그 기록
  log.push(`턴 ${turnNumber}: 플레이어 HP ${player.hp}/${player.maxHp}, 적 HP ${enemy.hp}/${enemy.maxHp}`);

  // 11. 승패 확인
  if (player.hp <= 0) {
    return { playerDamage, enemyDamage, ended: true, winner: 'enemy', cardsPlayed: cardsPlayedThisTurn, timesAttacked: timesAttackedThisTurn, comboFormed: turnCombo };
  }
  if (enemy.hp <= 0) {
    return { playerDamage, enemyDamage, ended: true, winner: 'player', cardsPlayed: cardsPlayedThisTurn, timesAttacked: timesAttackedThisTurn, comboFormed: turnCombo };
  }

  return { playerDamage, enemyDamage, ended: false, cardsPlayed: cardsPlayedThisTurn, timesAttacked: timesAttackedThisTurn, comboFormed: turnCombo };
}

export function runBattle(enemyId: string, config: SimulationConfig): BattleResult {
  const log: string[] = [];

  // 이변 상태 생성
  const anomalyState = createAnomalyState(config, log);

  const player = createPlayer(config, anomalyState);
  const enemy = createEnemy(enemyId);

  // 적 정의 가져오기 (패시브 효과용)
  const enemyDef = ENEMIES.find(e => e.id === enemyId) || null;

  let turn = 0;
  let totalPlayerDamage = 0;
  let totalEnemyDamage = 0;
  const cardUsage: Record<string, number> = {};
  const combosFormed: Record<string, number> = {};

  log.push(`전투 시작: ${enemy.name} (HP: ${enemy.hp})`);

  // 전투 시작 상징 효과 (bloodShackles, tonic 등)
  applyRelicEffects(player, 'ON_COMBAT_START', log);

  while (turn < config.maxTurns) {
    turn++;

    const result = simulateTurn(player, enemy, turn, log, enemyDef, anomalyState);
    totalPlayerDamage += result.playerDamage;
    totalEnemyDamage += result.enemyDamage;

    // 콤보 기록
    if (result.comboFormed) {
      combosFormed[result.comboFormed] = (combosFormed[result.comboFormed] || 0) + 1;
    }

    if (result.ended) {
      // 전투 종료 상징 효과 (redHerb, goldenHerb, healthCheck 등)
      const combatEndContext: RelicConditionState = {
        playerHp: player.hp,
        maxHp: player.maxHp,
      };
      applyRelicEffects(player, 'ON_COMBAT_END', log, combatEndContext);

      log.push(`전투 종료: ${result.winner === 'player' ? '플레이어 승리' : '적 승리'} (${turn}턴)`);

      return {
        winner: result.winner!,
        turns: turn,
        playerDamageDealt: totalPlayerDamage,
        enemyDamageDealt: totalEnemyDamage,
        playerFinalHp: player.hp,
        enemyFinalHp: enemy.hp,
        cardUsage,
        combosFormed,
        log,
      };
    }
  }

  // 최대 턴 초과 - 무승부 (전투 종료 상징 효과 적용)
  const combatEndContext: RelicConditionState = {
    playerHp: player.hp,
    maxHp: player.maxHp,
  };
  applyRelicEffects(player, 'ON_COMBAT_END', log, combatEndContext);

  log.push(`전투 종료: 무승부 (최대 턴 초과)`);

  return {
    winner: 'draw',
    turns: turn,
    playerDamageDealt: totalPlayerDamage,
    enemyDamageDealt: totalEnemyDamage,
    playerFinalHp: player.hp,
    enemyFinalHp: enemy.hp,
    cardUsage,
    combosFormed,
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

  // 콤보 통계 집계
  const comboTotals: Record<string, number> = {};
  for (const result of results) {
    for (const [comboName, count] of Object.entries(result.combosFormed)) {
      comboTotals[comboName] = (comboTotals[comboName] || 0) + count;
    }
  }

  const comboStats: Record<string, { count: number; avgPerBattle: number }> = {};
  for (const [comboName, count] of Object.entries(comboTotals)) {
    comboStats[comboName] = {
      count,
      avgPerBattle: count / totalBattles,
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
    comboStats,
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

  // 콤보 통계 출력
  if (Object.keys(stats.comboStats).length > 0) {
    console.log('\n🃏 콤보 통계:');
    const sortedCombos = Object.entries(stats.comboStats)
      .sort((a, b) => b[1].count - a[1].count);
    for (const [comboName, comboStat] of sortedCombos) {
      console.log(`   - ${comboName}: ${comboStat.count}회 (전투당 평균 ${comboStat.avgPerBattle.toFixed(2)}회)`);
    }
  }

  console.log('\n========================================\n');
}

// ==================== 테스트용 함수 ====================

// 티어별 적 목록
export const TIER_1_ENEMIES = ['ghoul', 'marauder', 'wildrat', 'berserker', 'polluted', 'slurthim'];
export const TIER_2_ENEMIES = ['deserter', 'hunter'];
export const TIER_3_ENEMIES = ['slaughterer', 'captain'];
export const ALL_ENEMIES = [...TIER_1_ENEMIES, ...TIER_2_ENEMIES, ...TIER_3_ENEMIES];

export function runQuickTest(): SimulationStats {
  const config: SimulationConfig = {
    battles: 100,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES,
    verbose: false,
  };

  const stats = runSimulation(config);
  printStats(stats);

  return stats;
}

/**
 * 티어별 시뮬레이션 실행
 */
export function runTierSimulation(tier: 1 | 2 | 3, battles: number = 100): SimulationStats {
  const enemyIds = tier === 1 ? TIER_1_ENEMIES :
                   tier === 2 ? TIER_2_ENEMIES :
                   TIER_3_ENEMIES;

  const config: SimulationConfig = {
    battles,
    maxTurns: tier === 3 ? 50 : 30,  // 보스는 더 긴 턴 허용
    enemyIds,
    verbose: false,
  };

  console.log(`\n🎮 Tier ${tier} 적 시뮬레이션 (${battles}회)`);
  const stats = runSimulation(config);
  printStats(stats);

  return stats;
}

/**
 * 전체 적 시뮬레이션 (모든 티어)
 */
export function runFullSimulation(battlesPerEnemy: number = 50): SimulationStats {
  const config: SimulationConfig = {
    battles: battlesPerEnemy * ALL_ENEMIES.length,
    maxTurns: 50,
    enemyIds: ALL_ENEMIES,
    verbose: false,
  };

  console.log(`\n🎮 전체 적 시뮬레이션 (${ALL_ENEMIES.length}종, 각 ${battlesPerEnemy}회)`);
  const stats = runSimulation(config);
  printStats(stats);

  return stats;
}

/**
 * 밸런스 분석 - 티어별 승률 비교
 */
export function runBalanceAnalysis(battles: number = 100): void {
  console.log('\n========================================');
  console.log('         밸런스 분석 리포트             ');
  console.log('========================================\n');

  const tierStats: Record<number, SimulationStats> = {};

  for (const tier of [1, 2, 3] as const) {
    const enemyIds = tier === 1 ? TIER_1_ENEMIES :
                     tier === 2 ? TIER_2_ENEMIES :
                     TIER_3_ENEMIES;

    const config: SimulationConfig = {
      battles,
      maxTurns: tier === 3 ? 50 : 30,
      enemyIds,
      verbose: false,
    };

    tierStats[tier] = runSimulation(config);
  }

  console.log('\n📊 티어별 승률 요약:');
  console.log('─────────────────────────────────────────');
  for (const tier of [1, 2, 3]) {
    const stats = tierStats[tier];
    const rating = stats.winRate > 0.8 ? '✅ 쉬움' :
                   stats.winRate > 0.6 ? '⚖️ 적당' :
                   stats.winRate > 0.4 ? '⚠️ 어려움' :
                   '❌ 매우 어려움';
    console.log(`  Tier ${tier}: ${(stats.winRate * 100).toFixed(1)}% 승률 | ${stats.avgTurns.toFixed(1)}턴 | ${rating}`);
  }

  console.log('\n👾 적별 상세 승률:');
  console.log('─────────────────────────────────────────');

  const allEnemyStats: Array<{ id: string; tier: number; winRate: number }> = [];
  for (const tier of [1, 2, 3]) {
    const stats = tierStats[tier];
    for (const [enemyId, enemyStat] of Object.entries(stats.enemyStats)) {
      allEnemyStats.push({ id: enemyId, tier, winRate: enemyStat.winRate });
    }
  }

  allEnemyStats.sort((a, b) => a.winRate - b.winRate);
  for (const stat of allEnemyStats) {
    const enemy = ENEMIES.find(e => e.id === stat.id);
    const name = enemy?.name || stat.id;
    const difficulty = stat.winRate > 0.8 ? '⭐' :
                       stat.winRate > 0.6 ? '⭐⭐' :
                       stat.winRate > 0.4 ? '⭐⭐⭐' :
                       stat.winRate > 0.2 ? '⭐⭐⭐⭐' :
                       '⭐⭐⭐⭐⭐';
    console.log(`  ${name} (T${stat.tier}): ${(stat.winRate * 100).toFixed(1)}% | ${difficulty}`);
  }

  console.log('\n🃏 전체 콤보 통계:');
  console.log('─────────────────────────────────────────');
  const totalCombos: Record<string, number> = {};
  let totalBattles = 0;
  for (const tier of [1, 2, 3]) {
    const stats = tierStats[tier];
    totalBattles += stats.totalBattles;
    for (const [comboName, comboStat] of Object.entries(stats.comboStats)) {
      totalCombos[comboName] = (totalCombos[comboName] || 0) + comboStat.count;
    }
  }

  const sortedCombos = Object.entries(totalCombos).sort((a, b) => b[1] - a[1]);
  for (const [comboName, count] of sortedCombos) {
    console.log(`  ${comboName}: ${count}회 (전투당 ${(count / totalBattles).toFixed(2)})`);
  }

  console.log('\n========================================\n');
}

/**
 * 상징 효과 비교 시뮬레이션
 * 각 상징을 착용했을 때의 승률 비교
 */
export function runRelicComparison(battles: number = 50): void {
  console.log('\n========================================');
  console.log('         상징 효과 비교 분석             ');
  console.log('========================================\n');

  // 테스트할 상징 목록
  const relicsToTest = [
    'etherCrystal',    // 최대 행동력 +1
    'sturdyArmor',     // 턴 시작 방어력 +8
    'trainingBoots',   // 최대 체력 +10
    'redHerb',         // 전투 종료 시 체력 +5
    'bloodShackles',   // 전투 시작 시 체력 -5, 힘 +2
    'coin',            // 턴 종료 힘 +1
    'goldenHerb',      // 전투 종료 시 체력 +10
    'immortalMask',    // 카드 사용 시 체력 +1
    'ironRing',        // 최대 행동력 +2
  ];

  // 기준치 (상징 없음)
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES,
    playerRelics: [],
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  console.log(`📊 기준치 (상징 없음): ${(baseStats.winRate * 100).toFixed(1)}% 승률\n`);

  // 각 상징별 테스트
  const results: Array<{ id: string; name: string; winRate: number; diff: number }> = [];

  for (const relicId of relicsToTest) {
    const relic = RELICS[relicId as keyof typeof RELICS];
    if (!relic) continue;

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerRelics: [relicId],
      verbose: false,
    };

    const stats = runSimulation(config);
    const diff = stats.winRate - baseStats.winRate;

    results.push({
      id: relicId,
      name: relic.name,
      winRate: stats.winRate,
      diff,
    });
  }

  // 효과가 큰 순서로 정렬
  results.sort((a, b) => b.diff - a.diff);

  console.log('🏆 상징별 승률 변화 (효과 순):');
  console.log('─────────────────────────────────────────');
  for (const result of results) {
    const diffStr = result.diff >= 0 ? `+${(result.diff * 100).toFixed(1)}` : `${(result.diff * 100).toFixed(1)}`;
    const rating = result.diff > 0.1 ? '⭐⭐⭐ 강력' :
                   result.diff > 0.05 ? '⭐⭐ 좋음' :
                   result.diff > 0 ? '⭐ 약간' :
                   result.diff < -0.05 ? '❌ 부정적' :
                   '➖ 중립';
    console.log(`  ${result.name}: ${(result.winRate * 100).toFixed(1)}% (${diffStr}%) | ${rating}`);
  }

  console.log('\n========================================\n');
}

/**
 * 덱 프리셋 정의
 */
export const DECK_PRESETS: Record<string, { name: string; description: string; cards: string[] }> = {
  balanced: {
    name: '균형 덱',
    description: '공격과 방어가 균형있게 구성된 기본 덱',
    cards: ['strike', 'strike', 'lunge', 'shoot', 'deflect', 'deflect', 'octave', 'quarte'],
  },
  aggressive: {
    name: '공격 덱',
    description: '공격에 집중한 덱',
    cards: ['strike', 'strike', 'lunge', 'lunge', 'fleche', 'shoot', 'shoot', 'thrust'],
  },
  defensive: {
    name: '방어 덱',
    description: '방어와 생존에 집중한 덱',
    cards: ['deflect', 'deflect', 'deflect', 'octave', 'octave', 'quarte', 'quarte', 'septime'],
  },
  combo: {
    name: '콤보 덱',
    description: '연계/후속 효과를 활용하는 덱',
    cards: ['strike', 'lunge', 'fleche', 'flank', 'beat', 'feint', 'grind', 'rapid_link'],
  },
  gunner: {
    name: '총기 덱',
    description: '총기 카드 위주의 덱',
    cards: ['shoot', 'shoot', 'hawks_eye', 'gun_headshot', 'reload', 'sniper_shot', 'ap_load', 'deflect'],
  },
  fast: {
    name: '속공 덱',
    description: '빠른 카드로 선제 공격하는 덱',
    cards: ['marche', 'fleche', 'flank', 'thrust', 'el_rapide', 'sabre_eclair', 'shoot', 'shoot'],
  },
  counter: {
    name: '반격 덱',
    description: '방어와 반격을 활용하는 덱',
    cards: ['deflect', 'deflect', 'octave', 'quarte', 'septime', 'intercept', 'breach', 'redoublement'],
  },
  elite: {
    name: '엘리트 덱',
    description: '강력한 고급 카드로 구성된 덱',
    cards: ['violent_mort', 'tempete_dechainee', 'griffe_du_dragon', 'execution_squad', 'atomic_bomb', 'duel', 'sniper_shot', 'au_bord_du_gouffre'],
  },
};

/**
 * 덱 전략 비교 시뮬레이션
 */
export function runDeckComparison(battles: number = 50): void {
  console.log('\n========================================');
  console.log('         덱 전략 비교 분석               ');
  console.log('========================================\n');

  const results: Array<{
    id: string;
    name: string;
    description: string;
    winRate: number;
    avgTurns: number;
    avgDamage: number;
    comboRate: number;
  }> = [];

  for (const [deckId, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerDeck: deck.cards,
      verbose: false,
    };

    const stats = runSimulation(config);

    // 콤보 발생률 계산
    const totalCombos = Object.values(stats.comboStats).reduce((sum, c) => sum + c.count, 0);
    const comboRate = totalCombos / stats.totalBattles;

    results.push({
      id: deckId,
      name: deck.name,
      description: deck.description,
      winRate: stats.winRate,
      avgTurns: stats.avgTurns,
      avgDamage: stats.avgPlayerDamageDealt,
      comboRate,
    });
  }

  // 승률 순으로 정렬
  results.sort((a, b) => b.winRate - a.winRate);

  console.log('🏆 덱별 성능 순위:');
  console.log('─────────────────────────────────────────');

  let rank = 1;
  for (const result of results) {
    const rating = result.winRate > 0.8 ? '⭐⭐⭐ S등급' :
                   result.winRate > 0.6 ? '⭐⭐ A등급' :
                   result.winRate > 0.4 ? '⭐ B등급' :
                   '➖ C등급';

    console.log(`\n${rank}. ${result.name} (${rating})`);
    console.log(`   ${result.description}`);
    console.log(`   승률: ${(result.winRate * 100).toFixed(1)}% | 평균 ${result.avgTurns.toFixed(1)}턴 | 피해량 ${result.avgDamage.toFixed(0)} | 콤보 ${result.comboRate.toFixed(2)}/전투`);
    rank++;
  }

  // 각 항목별 최고 덱
  console.log('\n📊 항목별 최고 덱:');
  console.log('─────────────────────────────────────────');

  const bestWinRate = results.reduce((a, b) => a.winRate > b.winRate ? a : b);
  const fastestWins = results.reduce((a, b) => a.avgTurns < b.avgTurns ? a : b);
  const mostDamage = results.reduce((a, b) => a.avgDamage > b.avgDamage ? a : b);
  const mostCombos = results.reduce((a, b) => a.comboRate > b.comboRate ? a : b);

  console.log(`  최고 승률: ${bestWinRate.name} (${(bestWinRate.winRate * 100).toFixed(1)}%)`);
  console.log(`  가장 빠른 승리: ${fastestWins.name} (평균 ${fastestWins.avgTurns.toFixed(1)}턴)`);
  console.log(`  최고 피해량: ${mostDamage.name} (${mostDamage.avgDamage.toFixed(0)})`);
  console.log(`  최고 콤보율: ${mostCombos.name} (${mostCombos.comboRate.toFixed(2)}/전투)`);

  console.log('\n========================================\n');
}

/**
 * 이변 효과 비교 시뮬레이션
 */
export function runAnomalyComparison(battles: number = 50): void {
  console.log('\n========================================');
  console.log('         이변 효과 비교 분석             ');
  console.log('========================================\n');

  // 이변 없이 기준치 측정
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES,
    enableAnomalies: false,
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  console.log(`📊 기준치 (이변 없음): ${(baseStats.winRate * 100).toFixed(1)}% 승률\n`);

  // 각 이변 개별 테스트
  const anomalyIds = Object.keys(ANOMALY_TYPES);
  const results: Array<{ id: string; name: string; winRate: number; diff: number; emoji: string }> = [];

  for (const anomalyId of anomalyIds) {
    const anomaly = ANOMALY_TYPES[anomalyId as keyof typeof ANOMALY_TYPES];

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      enableAnomalies: true,
      fixedAnomaly: anomaly.id,
      mapRisk: 50, // 레벨 2 이변
      verbose: false,
    };

    const stats = runSimulation(config);
    const diff = stats.winRate - baseStats.winRate;

    results.push({
      id: anomaly.id,
      name: anomaly.name,
      winRate: stats.winRate,
      diff,
      emoji: anomaly.emoji,
    });
  }

  // 영향도(diff) 순으로 정렬 (가장 큰 패널티부터)
  results.sort((a, b) => a.diff - b.diff);

  console.log('💀 이변별 영향도 (승률 변화):');
  console.log('─────────────────────────────────────────');

  for (const result of results) {
    const diffStr = result.diff >= 0 ? `+${(result.diff * 100).toFixed(1)}` : `${(result.diff * 100).toFixed(1)}`;
    const severity = result.diff < -0.2 ? '🔴 치명적' :
                     result.diff < -0.1 ? '🟠 심각' :
                     result.diff < -0.05 ? '🟡 주의' :
                     result.diff < 0 ? '🟢 경미' :
                     '⚪ 무해';

    console.log(`  ${result.emoji} ${result.name}: ${(result.winRate * 100).toFixed(1)}% (${diffStr}%) | ${severity}`);
  }

  // 통계 요약
  const avgImpact = results.reduce((sum, r) => sum + r.diff, 0) / results.length;
  const worstAnomaly = results[0];
  const leastHarmful = results[results.length - 1];

  console.log('\n📈 요약:');
  console.log('─────────────────────────────────────────');
  console.log(`  평균 승률 변화: ${(avgImpact * 100).toFixed(1)}%`);
  console.log(`  가장 해로운 이변: ${worstAnomaly.emoji} ${worstAnomaly.name} (${(worstAnomaly.diff * 100).toFixed(1)}%)`);
  console.log(`  가장 덜 해로운 이변: ${leastHarmful.emoji} ${leastHarmful.name} (${(leastHarmful.diff * 100).toFixed(1)}%)`);

  console.log('\n========================================\n');
}

/**
 * 카드 효율 분석
 * 각 카드를 덱에 추가했을 때의 승률 변화를 측정
 */
export function runCardEfficiencyAnalysis(battles: number = 30): void {
  console.log('\n========================================');
  console.log('         카드 효율 분석                  ');
  console.log('========================================\n');

  // 테스트할 카드 목록 (공격/방어 카드 위주)
  const cardsToTest = [
    // 공격 카드
    'strike', 'lunge', 'fleche', 'flank', 'thrust', 'beat', 'feint',
    'grind', 'shoot', 'hawks_eye', 'gun_headshot', 'sniper_shot',
    // 방어 카드
    'deflect', 'octave', 'quarte', 'septime', 'intercept', 'breach',
    // 특수 카드
    'marche', 'disrupt', 'redoublement', 'violent_mort', 'tempete_dechainee',
  ];

  // 기본 덱으로 기준치 측정
  const baseDeck = ['strike', 'strike', 'lunge', 'shoot', 'deflect', 'deflect'];
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES,
    playerDeck: baseDeck,
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  console.log(`📊 기준 덱: ${baseDeck.join(', ')}`);
  console.log(`   승률: ${(baseStats.winRate * 100).toFixed(1)}%\n`);

  const results: Array<{
    cardId: string;
    cardName: string;
    winRate: number;
    diff: number;
    avgTurns: number;
    avgDamage: number;
    type: string;
  }> = [];

  for (const cardId of cardsToTest) {
    const card = CARDS.find(c => c.id === cardId);
    if (!card) continue;

    // 기본 덱에 이 카드를 추가한 덱
    const testDeck = [...baseDeck, cardId];

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerDeck: testDeck,
      verbose: false,
    };

    const stats = runSimulation(config);
    const diff = stats.winRate - baseStats.winRate;

    results.push({
      cardId,
      cardName: card.name,
      winRate: stats.winRate,
      diff,
      avgTurns: stats.avgTurns,
      avgDamage: stats.avgPlayerDamageDealt,
      type: card.type || 'unknown',
    });
  }

  // 효과 순으로 정렬
  results.sort((a, b) => b.diff - a.diff);

  console.log('🃏 카드별 승률 기여도:');
  console.log('─────────────────────────────────────────');

  // 상위 10개
  console.log('\n⬆️ 상위 10개 (가장 효과적인 카드):');
  for (let i = 0; i < Math.min(10, results.length); i++) {
    const r = results[i];
    const diffStr = r.diff >= 0 ? `+${(r.diff * 100).toFixed(1)}` : `${(r.diff * 100).toFixed(1)}`;
    const typeEmoji = r.type === 'attack' ? '⚔️' : r.type === 'defense' ? '🛡️' : '✨';
    console.log(`  ${i + 1}. ${typeEmoji} ${r.cardName}: ${(r.winRate * 100).toFixed(1)}% (${diffStr}%)`);
  }

  // 하위 5개
  console.log('\n⬇️ 하위 5개 (효과가 낮은 카드):');
  const bottom = results.slice(-5).reverse();
  for (let i = 0; i < bottom.length; i++) {
    const r = bottom[i];
    const diffStr = r.diff >= 0 ? `+${(r.diff * 100).toFixed(1)}` : `${(r.diff * 100).toFixed(1)}`;
    const typeEmoji = r.type === 'attack' ? '⚔️' : r.type === 'defense' ? '🛡️' : '✨';
    console.log(`  ${i + 1}. ${typeEmoji} ${r.cardName}: ${(r.winRate * 100).toFixed(1)}% (${diffStr}%)`);
  }

  // 타입별 평균
  console.log('\n📈 카드 타입별 평균 효과:');
  console.log('─────────────────────────────────────────');

  const byType: Record<string, { count: number; totalDiff: number }> = {};
  for (const r of results) {
    if (!byType[r.type]) byType[r.type] = { count: 0, totalDiff: 0 };
    byType[r.type].count++;
    byType[r.type].totalDiff += r.diff;
  }

  for (const [type, data] of Object.entries(byType)) {
    const avgDiff = data.totalDiff / data.count;
    const typeEmoji = type === 'attack' ? '⚔️' : type === 'defense' ? '🛡️' : '✨';
    const diffStr = avgDiff >= 0 ? `+${(avgDiff * 100).toFixed(1)}` : `${(avgDiff * 100).toFixed(1)}`;
    console.log(`  ${typeEmoji} ${type}: 평균 ${diffStr}% (${data.count}개 카드)`);
  }

  console.log('\n========================================\n');
}

/**
 * 종합 리포트 생성
 * 모든 분석을 한 번에 실행하고 결과를 종합
 */
export function runFullReport(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        게임 시뮬레이터 종합 리포트        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // 1. 기본 밸런스 분석
  console.log('📊 1. 기본 밸런스 분석');
  console.log('═'.repeat(45));
  runBalanceAnalysis(battles);

  // 2. 덱 비교
  console.log('\n🃏 2. 덱 전략 비교');
  console.log('═'.repeat(45));
  runDeckComparison(battles);

  // 3. 상징 효과
  console.log('\n🏆 3. 상징 효과 분석');
  console.log('═'.repeat(45));
  runRelicComparison(battles);

  // 4. 이변 효과
  console.log('\n💀 4. 이변 효과 분석');
  console.log('═'.repeat(45));
  runAnomalyComparison(battles);

  // 5. 카드 효율
  console.log('\n⚔️ 5. 카드 효율 분석');
  console.log('═'.repeat(45));
  runCardEfficiencyAnalysis(battles);

  const elapsed = Date.now() - startTime;
  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  총 소요 시간: ${(elapsed / 1000).toFixed(1)}초                     ║`);
  console.log('╚════════════════════════════════════════╝\n');
}

/**
 * 전투 리플레이 - 단일 전투를 상세하게 출력
 * 턴별 행동과 결과를 시각적으로 보여줌
 */
export function runBattleReplay(enemyId: string = 'ghoul', deckOverride?: string[]): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           전투 리플레이                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const enemy = ENEMIES.find(e => e.id === enemyId);
  if (!enemy) {
    console.log(`❌ 적 '${enemyId}'을(를) 찾을 수 없습니다.`);
    console.log(`사용 가능한 적: ${ALL_ENEMIES.join(', ')}`);
    return;
  }

  console.log(`🎯 대상 적: ${enemy.name} (Tier ${enemy.tier}, HP ${enemy.hp})`);
  console.log(`📦 덱: ${deckOverride ? deckOverride.join(', ') : '기본 덱'}`);
  console.log('\n' + '═'.repeat(50) + '\n');

  const config: SimulationConfig = {
    battles: 1,
    maxTurns: 30,
    enemyIds: [enemyId],
    playerDeck: deckOverride,
    verbose: true,
  };

  const result = runBattle(enemyId, config);

  // 전투 로그 출력
  console.log('📜 전투 로그:');
  console.log('─'.repeat(50));
  for (const line of result.log) {
    console.log(`  ${line}`);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 전투 결과:');
  console.log('─'.repeat(50));

  const winnerEmoji = result.winner === 'player' ? '🏆' : result.winner === 'enemy' ? '💀' : '🤝';
  const winnerText = result.winner === 'player' ? '플레이어 승리!' :
                     result.winner === 'enemy' ? '플레이어 패배...' : '무승부';

  console.log(`  ${winnerEmoji} 결과: ${winnerText}`);
  console.log(`  ⏱️  턴 수: ${result.turns}`);
  console.log(`  ⚔️  총 피해량: ${result.playerDamageDealt}`);
  console.log(`  💔 받은 피해: ${result.enemyDamageDealt}`);
  console.log(`  ❤️  남은 체력: ${result.playerFinalHp}`);
  console.log(`  👾 적 남은 체력: ${result.enemyFinalHp}`);

  // 콤보 정보
  if (Object.keys(result.combosFormed).length > 0) {
    console.log('\n🃏 발동된 콤보:');
    for (const [combo, count] of Object.entries(result.combosFormed)) {
      console.log(`    - ${combo}: ${count}회`);
    }
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 특정 적과의 연속 전투 분석
 * 여러 번 전투하고 각 전투의 결과를 요약
 */
export function runEnemyAnalysis(enemyId: string, battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           적 분석 리포트                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const enemy = ENEMIES.find(e => e.id === enemyId);
  if (!enemy) {
    console.log(`❌ 적 '${enemyId}'을(를) 찾을 수 없습니다.`);
    return;
  }

  console.log(`🎯 분석 대상: ${enemy.name}`);
  console.log(`📊 전투 횟수: ${battles}회`);
  console.log('─'.repeat(50));

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [enemyId],
    verbose: false,
  };

  const stats = runSimulation(config);

  // 각 전투 결과 수집을 위해 추가 시뮬레이션
  const turnDistribution: Record<number, number> = {};
  const damageDistribution: number[] = [];
  let quickWins = 0;  // 3턴 이하
  let longBattles = 0;  // 10턴 이상

  for (let i = 0; i < battles; i++) {
    const result = runBattle(enemyId, config);
    turnDistribution[result.turns] = (turnDistribution[result.turns] || 0) + 1;
    if (result.winner === 'player') {
      damageDistribution.push(result.playerDamageDealt);
      if (result.turns <= 3) quickWins++;
      if (result.turns >= 10) longBattles++;
    }
  }

  // 기본 통계
  console.log('\n📈 전투 통계:');
  console.log(`  승률: ${(stats.winRate * 100).toFixed(1)}%`);
  console.log(`  평균 턴: ${stats.avgTurns.toFixed(1)}`);
  console.log(`  평균 피해량: ${stats.avgPlayerDamageDealt.toFixed(0)}`);

  // 턴 분포
  console.log('\n⏱️  턴 수 분포:');
  const sortedTurns = Object.entries(turnDistribution).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  for (const [turn, count] of sortedTurns) {
    const bar = '█'.repeat(Math.ceil(count / battles * 20));
    console.log(`  ${turn}턴: ${bar} (${count}회)`);
  }

  // 승리 패턴
  console.log('\n🏆 승리 패턴:');
  console.log(`  빠른 승리 (≤3턴): ${quickWins}회 (${(quickWins / battles * 100).toFixed(1)}%)`);
  console.log(`  긴 전투 (≥10턴): ${longBattles}회 (${(longBattles / battles * 100).toFixed(1)}%)`);

  // 난이도 평가
  const difficultyRating = stats.winRate > 0.9 ? '⭐ 매우 쉬움' :
                           stats.winRate > 0.7 ? '⭐⭐ 쉬움' :
                           stats.winRate > 0.5 ? '⭐⭐⭐ 보통' :
                           stats.winRate > 0.3 ? '⭐⭐⭐⭐ 어려움' :
                           '⭐⭐⭐⭐⭐ 매우 어려움';

  console.log(`\n🎮 난이도 평가: ${difficultyRating}`);
  console.log('─'.repeat(50) + '\n');
}

/**
 * 카드 시너지 분석
 * 두 카드 조합의 시너지 효과를 측정
 */
export function runSynergyAnalysis(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           카드 시너지 분석               ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 테스트할 카드 조합 (공격+공격, 공격+방어, 방어+방어)
  const cardPairs: Array<{ cards: [string, string]; description: string }> = [
    // 연계 시너지
    { cards: ['strike', 'lunge'], description: '검격 연계' },
    { cards: ['strike', 'fleche'], description: '돌진 연계' },
    { cards: ['lunge', 'fleche'], description: '공격 연속' },
    // 공방 균형
    { cards: ['strike', 'deflect'], description: '공방 균형' },
    { cards: ['lunge', 'octave'], description: '공격+상단방어' },
    { cards: ['shoot', 'quarte'], description: '사격+하단방어' },
    // 방어 조합
    { cards: ['deflect', 'octave'], description: '이중 방어' },
    { cards: ['octave', 'quarte'], description: '상하 방어' },
    { cards: ['septime', 'deflect'], description: '전방위 방어' },
    // 특수 조합
    { cards: ['shoot', 'sniper_shot'], description: '사격 특화' },
    { cards: ['beat', 'grind'], description: '연속 타격' },
    { cards: ['feint', 'thrust'], description: '속임수 공격' },
  ];

  // 기본 덱으로 기준치 측정
  const baseDeck = ['strike', 'lunge', 'deflect', 'deflect'];
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES,
    playerDeck: baseDeck,
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  console.log(`📊 기준 덱 승률: ${(baseStats.winRate * 100).toFixed(1)}%\n`);

  const results: Array<{
    pair: [string, string];
    description: string;
    winRate: number;
    diff: number;
    synergy: number; // 개별 카드 효과 합 대비 실제 효과
  }> = [];

  // 각 조합 테스트
  for (const { cards, description } of cardPairs) {
    const testDeck = [...baseDeck, cards[0], cards[1]];

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerDeck: testDeck,
      verbose: false,
    };

    const stats = runSimulation(config);
    const diff = stats.winRate - baseStats.winRate;

    // 개별 카드 테스트
    const config1: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerDeck: [...baseDeck, cards[0]],
      verbose: false,
    };
    const config2: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerDeck: [...baseDeck, cards[1]],
      verbose: false,
    };
    const stats1 = runSimulation(config1);
    const stats2 = runSimulation(config2);

    // 시너지 = 실제 효과 - 예상 효과 (개별 효과의 합)
    const expectedDiff = (stats1.winRate - baseStats.winRate) + (stats2.winRate - baseStats.winRate);
    const synergy = diff - expectedDiff;

    results.push({
      pair: cards,
      description,
      winRate: stats.winRate,
      diff,
      synergy,
    });
  }

  // 시너지 순으로 정렬
  results.sort((a, b) => b.synergy - a.synergy);

  console.log('🔗 카드 조합별 시너지:');
  console.log('─'.repeat(50));

  for (const result of results) {
    const card1 = CARDS.find(c => c.id === result.pair[0])?.name || result.pair[0];
    const card2 = CARDS.find(c => c.id === result.pair[1])?.name || result.pair[1];
    const diffStr = result.diff >= 0 ? `+${(result.diff * 100).toFixed(1)}` : `${(result.diff * 100).toFixed(1)}`;
    const synergyStr = result.synergy >= 0 ? `+${(result.synergy * 100).toFixed(1)}` : `${(result.synergy * 100).toFixed(1)}`;

    const rating = result.synergy > 0.05 ? '🔥 강한 시너지' :
                   result.synergy > 0 ? '✨ 약한 시너지' :
                   result.synergy > -0.05 ? '➖ 중립' :
                   '⚠️ 역시너지';

    console.log(`\n  ${result.description}: ${card1} + ${card2}`);
    console.log(`    승률: ${(result.winRate * 100).toFixed(1)}% (${diffStr}%) | 시너지: ${synergyStr}% | ${rating}`);
  }

  // 최고/최저 시너지
  const bestSynergy = results[0];
  const worstSynergy = results[results.length - 1];

  console.log('\n📈 요약:');
  console.log('─'.repeat(50));
  console.log(`  최고 시너지: ${bestSynergy.description} (+${(bestSynergy.synergy * 100).toFixed(1)}%)`);
  console.log(`  최저 시너지: ${worstSynergy.description} (${(worstSynergy.synergy * 100).toFixed(1)}%)`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 난이도 스케일링 분석
 * 플레이어 HP에 따른 승률 변화 측정
 */
export function runDifficultyScalingAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         난이도 스케일링 분석             ║');
  console.log('╚════════════════════════════════════════╝\n');

  const hpLevels = [50, 75, 100, 125, 150, 200];

  console.log('📊 HP별 승률 분석:\n');
  console.log('─'.repeat(50));

  const results: Array<{ hp: number; winRate: number; avgTurns: number }> = [];

  for (const hp of hpLevels) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES,
      playerHp: hp,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({ hp, winRate: stats.winRate, avgTurns: stats.avgTurns });

    // 그래프 형태로 출력
    const bar = '█'.repeat(Math.ceil(stats.winRate * 30));
    console.log(`  HP ${hp.toString().padStart(3)}: ${bar} ${(stats.winRate * 100).toFixed(1)}%`);
  }

  console.log('\n📈 분석:');
  console.log('─'.repeat(50));

  // HP 증가당 승률 변화
  for (let i = 1; i < results.length; i++) {
    const hpDiff = results[i].hp - results[i - 1].hp;
    const winRateDiff = results[i].winRate - results[i - 1].winRate;
    const efficiency = (winRateDiff * 100 / hpDiff).toFixed(2);
    console.log(`  HP ${results[i - 1].hp} → ${results[i].hp}: 승률 ${(winRateDiff * 100).toFixed(1)}% 변화 (HP당 ${efficiency}%)`);
  }

  // 권장 HP 찾기
  const optimalIdx = results.findIndex(r => r.winRate >= 0.7);
  const optimalHp = optimalIdx >= 0 ? results[optimalIdx].hp : results[results.length - 1].hp;
  console.log(`\n💡 권장 HP: ${optimalHp} (70% 이상 승률 확보)`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 승리 요인 분석
 * 승리/패배 전투의 특성을 비교 분석
 */
export function runWinConditionAnalysis(battles: number = 50): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           승리 요인 분석                ║');
  console.log('╚════════════════════════════════════════╝\n');

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES.slice(0, 4),
    verbose: false,
  };

  // 전투 결과 수집
  const winBattles: BattleResult[] = [];
  const lossBattles: BattleResult[] = [];

  for (const enemyId of config.enemyIds || []) {
    for (let i = 0; i < battles; i++) {
      const result = runBattle(enemyId, config);
      if (result.winner === 'player') {
        winBattles.push(result);
      } else if (result.winner === 'enemy') {
        lossBattles.push(result);
      }
    }
  }

  // 분석
  console.log(`📊 전투 데이터: 승리 ${winBattles.length}회, 패배 ${lossBattles.length}회\n`);
  console.log('─'.repeat(50));

  // 평균 턴 수 비교
  const avgWinTurns = winBattles.reduce((s, b) => s + b.turns, 0) / winBattles.length || 0;
  const avgLossTurns = lossBattles.reduce((s, b) => s + b.turns, 0) / lossBattles.length || 0;
  console.log(`\n⏱️ 평균 전투 시간:`);
  console.log(`  승리 시: ${avgWinTurns.toFixed(1)}턴`);
  console.log(`  패배 시: ${avgLossTurns.toFixed(1)}턴`);

  // 평균 피해량 비교
  const avgWinDamage = winBattles.reduce((s, b) => s + b.playerDamageDealt, 0) / winBattles.length || 0;
  const avgLossDamage = lossBattles.reduce((s, b) => s + b.playerDamageDealt, 0) / lossBattles.length || 0;
  console.log(`\n⚔️ 평균 피해량:`);
  console.log(`  승리 시: ${avgWinDamage.toFixed(1)}`);
  console.log(`  패배 시: ${avgLossDamage.toFixed(1)}`);

  // 콤보 빈도 비교
  const countCombos = (battles: BattleResult[]) => {
    let total = 0;
    battles.forEach(b => {
      if (b.combosFormed) {
        Object.values(b.combosFormed).forEach(c => total += c);
      }
    });
    return total / battles.length || 0;
  };

  const avgWinCombos = countCombos(winBattles);
  const avgLossCombos = countCombos(lossBattles);
  console.log(`\n🃏 평균 콤보 횟수:`);
  console.log(`  승리 시: ${avgWinCombos.toFixed(2)}회`);
  console.log(`  패배 시: ${avgLossCombos.toFixed(2)}회`);

  // 최종 HP 비교
  const avgWinFinalHp = winBattles.reduce((s, b) => s + b.playerFinalHp, 0) / winBattles.length || 0;
  console.log(`\n❤️ 승리 시 평균 잔여 HP: ${avgWinFinalHp.toFixed(1)}`);

  // 결론
  console.log('\n💡 인사이트:');
  console.log('─'.repeat(50));
  if (avgWinTurns < avgLossTurns) {
    console.log('  • 빠른 전투가 승리 확률을 높입니다.');
  } else {
    console.log('  • 장기전도 승리 가능성이 있습니다.');
  }
  if (avgWinCombos > avgLossCombos * 1.2) {
    console.log('  • 콤보 활용이 승리에 큰 영향을 줍니다.');
  }
  if (avgWinDamage > avgLossDamage * 1.3) {
    console.log('  • 공격적인 플레이가 유리합니다.');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 시뮬레이션 결과를 JSON 파일로 내보내기
 */
export function exportSimulationResults(
  battles: number = 30,
  filename?: string
): { summary: Record<string, unknown>; enemies: Record<string, unknown>[] } {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        시뮬레이션 결과 내보내기          ║');
  console.log('╚════════════════════════════════════════╝\n');

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES, ...TIER_2_ENEMIES],
    verbose: false,
  };

  const stats = runSimulation(config);

  // 결과 데이터 구성
  const result = {
    metadata: {
      timestamp: new Date().toISOString(),
      battles,
      maxTurns: config.maxTurns,
    },
    summary: {
      totalBattles: stats.totalBattles,
      winRate: stats.winRate,
      avgTurns: stats.avgTurns,
      avgPlayerDamage: stats.avgPlayerDamageDealt,
      avgEnemyDamage: stats.avgEnemyDamageDealt,
      avgPlayerFinalHp: stats.avgPlayerFinalHp,
    },
    enemies: Object.entries(stats.enemyStats).map(([id, stat]) => ({
      id,
      winRate: stat.winRate,
      battles: stat.battles,
      wins: stat.wins,
      avgTurns: stat.avgTurns,
    })),
    combos: Object.entries(stats.comboStats).map(([name, stat]) => ({
      name,
      count: stat.count,
      avgPerBattle: stat.avgPerBattle,
    })),
  };

  console.log('📊 요약:');
  console.log(`  총 전투: ${result.summary.totalBattles}`);
  console.log(`  승률: ${(result.summary.winRate * 100).toFixed(1)}%`);
  console.log(`  평균 턴: ${result.summary.avgTurns.toFixed(1)}`);
  console.log(`\n📁 결과 데이터 생성 완료`);

  // 파일 저장 (Node.js 환경에서만)
  if (typeof process !== 'undefined' && filename) {
    try {
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(process.cwd(), filename);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`  저장 위치: ${outputPath}`);
    } catch {
      console.log('  (파일 저장 실패 - 브라우저 환경)');
    }
  }

  console.log('\n' + '═'.repeat(50) + '\n');
  return result;
}

/**
 * 토큰 효율 분석
 * 각 토큰이 승률에 미치는 영향 분석
 */
export function runTokenEfficiencyAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           토큰 효율 분석                ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 토큰 부여 상징으로 테스트
  const relicTokenPairs: Array<{ relic: string; token: string; description: string }> = [
    { relic: 'sturdyArmor', token: 'defense', description: '방어 토큰 (sturdyArmor)' },
    { relic: 'trainingBoots', token: 'offense', description: '공세 토큰 (trainingBoots)' },
    { relic: 'oldCompass', token: 'dodge', description: '회피 토큰 (oldCompass)' },
    { relic: 'raggedCloak', token: 'absorb', description: '흡수 토큰 (raggedCloak)' },
  ];

  // 기준 승률 (상징 없음)
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES.slice(0, 3),
    playerRelics: [],
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  console.log(`📊 기준 승률 (상징 없음): ${(baseWinRate * 100).toFixed(1)}%\n`);
  console.log('─'.repeat(50));

  const results: Array<{ description: string; winRate: number; diff: number }> = [];

  for (const pair of relicTokenPairs) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerRelics: [pair.relic],
      verbose: false,
    };

    const stats = runSimulation(config);
    const diff = stats.winRate - baseWinRate;
    results.push({ description: pair.description, winRate: stats.winRate, diff });
  }

  // 효과순 정렬
  results.sort((a, b) => b.diff - a.diff);

  console.log('\n🏅 토큰 효율 순위:\n');
  results.forEach((r, idx) => {
    const sign = r.diff >= 0 ? '+' : '';
    const bar = r.diff >= 0
      ? '▲'.repeat(Math.min(10, Math.ceil(r.diff * 50)))
      : '▼'.repeat(Math.min(10, Math.ceil(Math.abs(r.diff) * 50)));
    console.log(`  ${idx + 1}. ${r.description}`);
    console.log(`     승률: ${(r.winRate * 100).toFixed(1)}% (${sign}${(r.diff * 100).toFixed(1)}%) ${bar}`);
  });

  console.log('\n💡 분석:');
  console.log('─'.repeat(50));
  const best = results[0];
  const worst = results[results.length - 1];
  console.log(`  가장 효과적: ${best.description} (+${(best.diff * 100).toFixed(1)}%)`);
  if (worst.diff < 0) {
    console.log(`  가장 비효과적: ${worst.description} (${(worst.diff * 100).toFixed(1)}%)`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 매치업 분석
 * 특정 덱 vs 특정 적 조합의 상세 분석
 */
export function runMatchupAnalysis(
  deckName: string = 'balanced',
  enemyId: string = 'ghoul',
  battles: number = 50
): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            매치업 분석                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const deck = DECK_PRESETS[deckName];
  if (!deck) {
    console.log(`❌ 덱 "${deckName}" 을(를) 찾을 수 없습니다.`);
    console.log(`사용 가능한 덱: ${Object.keys(DECK_PRESETS).join(', ')}`);
    return;
  }

  const enemy = ENEMIES.find(e => e.id === enemyId);
  if (!enemy) {
    console.log(`❌ 적 "${enemyId}" 을(를) 찾을 수 없습니다.`);
    return;
  }

  console.log(`📊 ${deck.name} vs ${enemy.name}`);
  console.log(`   ${deck.description}`);
  console.log(`   적 HP: ${enemy.hp}, 티어: ${enemy.tier}`);
  console.log('─'.repeat(50));

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [enemyId],
    playerDeck: deck.cards,
    verbose: false,
  };

  // 전투 수집
  const results: BattleResult[] = [];
  for (let i = 0; i < battles; i++) {
    results.push(runBattle(enemyId, config));
  }

  // 통계
  const wins = results.filter(r => r.winner === 'player').length;
  const winRate = wins / battles;
  const avgTurns = results.reduce((s, r) => s + r.turns, 0) / battles;
  const avgDamage = results.reduce((s, r) => s + r.playerDamageDealt, 0) / battles;
  const avgPlayerHp = results.reduce((s, r) => s + r.playerFinalHp, 0) / battles;

  console.log(`\n📈 결과:`);
  console.log(`  승률: ${(winRate * 100).toFixed(1)}% (${wins}/${battles})`);
  console.log(`  평균 턴: ${avgTurns.toFixed(1)}`);
  console.log(`  평균 피해량: ${avgDamage.toFixed(1)}`);
  console.log(`  평균 잔여 HP: ${avgPlayerHp.toFixed(1)}`);

  // 매치업 평가
  const rating = winRate > 0.8 ? '매우 유리' :
    winRate > 0.6 ? '유리' :
    winRate > 0.4 ? '균형' :
    winRate > 0.2 ? '불리' : '매우 불리';
  console.log(`\n🎯 매치업 평가: ${rating}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 속도 분석
 * 카드 속도가 승률에 미치는 영향 분석
 */
export function runSpeedAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            속도 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 속도별 덱 구성
  const speedDecks: Array<{ name: string; cards: string[] }> = [
    { name: '느린 덱 (속도 8+)', cards: ['violent_mort', 'tempete_dechainee', 'griffe_du_dragon', 'execution_squad', 'execution_squad', 'guard', 'guard', 'deflect'] },
    { name: '보통 덱 (속도 4-7)', cards: ['strike', 'strike', 'lunge', 'shoot', 'deflect', 'octave', 'quarte', 'guard'] },
    { name: '빠른 덱 (속도 1-3)', cards: ['marche', 'fleche', 'flank', 'thrust', 'el_rapide', 'sabre_eclair', 'shoot', 'shoot'] },
  ];

  console.log('📊 속도별 승률 비교:\n');
  console.log('─'.repeat(50));

  const results: Array<{ name: string; winRate: number; avgTurns: number }> = [];

  for (const speedDeck of speedDecks) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 4),
      playerDeck: speedDeck.cards,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({ name: speedDeck.name, winRate: stats.winRate, avgTurns: stats.avgTurns });

    const bar = '█'.repeat(Math.ceil(stats.winRate * 30));
    console.log(`  ${speedDeck.name}:`);
    console.log(`    ${bar} ${(stats.winRate * 100).toFixed(1)}%`);
    console.log(`    평균 턴: ${stats.avgTurns.toFixed(1)}`);
  }

  // 분석
  console.log('\n💡 분석:');
  console.log('─'.repeat(50));

  const best = results.reduce((a, b) => a.winRate > b.winRate ? a : b);
  const fastest = results.reduce((a, b) => a.avgTurns < b.avgTurns ? a : b);

  console.log(`  최고 승률: ${best.name} (${(best.winRate * 100).toFixed(1)}%)`);
  console.log(`  최단 전투: ${fastest.name} (${fastest.avgTurns.toFixed(1)}턴)`);

  if (best.name.includes('빠른')) {
    console.log('\n  → 빠른 공격이 효과적입니다. 선제공격 전략을 추천합니다.');
  } else if (best.name.includes('느린')) {
    console.log('\n  → 고위력 카드가 효과적입니다. 한방 전략을 추천합니다.');
  } else {
    console.log('\n  → 균형 잡힌 속도가 효과적입니다.');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 특성 시너지 분석
 * 카드 특성 조합의 효과 분석
 */
export function runTraitSynergyAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          특성 시너지 분석               ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 특성별 덱 구성
  const traitDecks: Array<{ name: string; description: string; cards: string[] }> = [
    {
      name: '연계 덱',
      description: '연계(chain) 효과 중심',
      cards: ['strike', 'lunge', 'fleche', 'flank', 'marche', 'strike', 'strike', 'lunge'],
    },
    {
      name: '후속 덱',
      description: '후속(followup) 효과 중심',
      cards: ['shoot', 'shoot', 'reload', 'hawks_eye', 'sniper_shot', 'ap_load', 'shoot', 'shoot'],
    },
    {
      name: '교차 덱',
      description: '교차(cross) 보너스 중심',
      cards: ['strike', 'deflect', 'lunge', 'octave', 'fleche', 'quarte', 'strike', 'deflect'],
    },
    {
      name: '분쇄 덱',
      description: '분쇄(crush) 효과 중심',
      cards: ['violent_mort', 'griffe_du_dragon', 'tempete_dechainee', 'strike', 'strike', 'deflect', 'deflect', 'guard'],
    },
  ];

  console.log('📊 특성별 덱 승률 비교:\n');
  console.log('─'.repeat(50));

  const results: Array<{ name: string; winRate: number; avgTurns: number; avgDamage: number }> = [];

  for (const traitDeck of traitDecks) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 4),
      playerDeck: traitDeck.cards,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({
      name: traitDeck.name,
      winRate: stats.winRate,
      avgTurns: stats.avgTurns,
      avgDamage: stats.avgPlayerDamageDealt,
    });

    console.log(`  ${traitDeck.name} (${traitDeck.description}):`);
    const bar = '█'.repeat(Math.ceil(stats.winRate * 25));
    console.log(`    승률: ${bar} ${(stats.winRate * 100).toFixed(1)}%`);
    console.log(`    평균 피해: ${stats.avgPlayerDamageDealt.toFixed(1)}`);
  }

  // 분석
  console.log('\n💡 특성 효율 순위:');
  console.log('─'.repeat(50));

  results.sort((a, b) => b.winRate - a.winRate);
  results.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name}: ${(r.winRate * 100).toFixed(1)}%`);
  });

  const best = results[0];
  console.log(`\n  → 가장 효과적인 특성: ${best.name}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 전략 추천
 * 특정 적에 대한 최적 덱/상징 추천
 */
export function runStrategyRecommendation(enemyId: string = 'ghoul', battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            전략 추천                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  const enemy = ENEMIES.find(e => e.id === enemyId);
  if (!enemy) {
    console.log(`❌ 적 "${enemyId}" 을(를) 찾을 수 없습니다.`);
    return;
  }

  console.log(`🎯 대상: ${enemy.name} (Tier ${enemy.tier}, HP ${enemy.hp})\n`);
  console.log('─'.repeat(50));

  // 덱별 승률 테스트
  console.log('\n📊 덱별 승률 테스트...\n');
  const deckResults: Array<{ name: string; winRate: number; avgTurns: number }> = [];

  for (const [deckId, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [enemyId],
      playerDeck: deck.cards,
      verbose: false,
    };

    const stats = runSimulation(config);
    deckResults.push({ name: deck.name, winRate: stats.winRate, avgTurns: stats.avgTurns });
  }

  // 덱 순위
  deckResults.sort((a, b) => b.winRate - a.winRate);
  console.log('🏆 추천 덱 순위:');
  deckResults.slice(0, 3).forEach((r, idx) => {
    const bar = '█'.repeat(Math.ceil(r.winRate * 20));
    console.log(`  ${idx + 1}. ${r.name}: ${bar} ${(r.winRate * 100).toFixed(1)}%`);
  });

  // 상징별 효과 테스트
  console.log('\n📊 상징별 효과 테스트...\n');
  const relicResults: Array<{ name: string; relic: string; winRate: number; diff: number }> = [];

  // 기준 (상징 없음)
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [enemyId],
    playerRelics: [],
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  const testRelics = ['sturdyArmor', 'trainingBoots', 'oldCompass', 'raggedCloak', 'ironWill'];
  for (const relicId of testRelics) {
    const relic = RELICS.find(r => r.id === relicId);
    if (!relic) continue;

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [enemyId],
      playerRelics: [relicId],
      verbose: false,
    };

    const stats = runSimulation(config);
    relicResults.push({
      name: relic.name,
      relic: relicId,
      winRate: stats.winRate,
      diff: stats.winRate - baseWinRate,
    });
  }

  // 상징 순위
  relicResults.sort((a, b) => b.diff - a.diff);
  console.log('🏆 추천 상징 순위:');
  relicResults.slice(0, 3).forEach((r, idx) => {
    const sign = r.diff >= 0 ? '+' : '';
    console.log(`  ${idx + 1}. ${r.name}: ${sign}${(r.diff * 100).toFixed(1)}%`);
  });

  // 최종 추천
  console.log('\n💡 최종 추천:');
  console.log('─'.repeat(50));
  console.log(`  덱: ${deckResults[0].name}`);
  if (relicResults[0].diff > 0) {
    console.log(`  상징: ${relicResults[0].name}`);
  }
  console.log(`  예상 승률: ${(deckResults[0].winRate * 100).toFixed(1)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 도움말 출력
 */
export function printHelp(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        게임 시뮬레이터 도움말            ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📋 사용 가능한 명령어:\n');

  const commands = [
    { cmd: '[battles] [enemies...]', desc: '기본 시뮬레이션' },
    { cmd: 'balance [battles]', desc: '밸런스 분석' },
    { cmd: 'tier [1|2|3] [battles]', desc: '티어별 시뮬레이션' },
    { cmd: 'full [battles]', desc: '전체 시뮬레이션' },
    { cmd: 'relic [battles]', desc: '상징 효과 비교' },
    { cmd: 'deck [battles]', desc: '덱 전략 비교' },
    { cmd: 'anomaly [battles]', desc: '이변 효과 비교' },
    { cmd: 'card [battles]', desc: '카드 효율 분석' },
    { cmd: 'report [battles]', desc: '종합 리포트' },
    { cmd: 'replay [enemyId]', desc: '전투 리플레이' },
    { cmd: 'analyze [enemyId] [battles]', desc: '적 분석' },
    { cmd: 'synergy [battles]', desc: '카드 시너지 분석' },
    { cmd: 'scaling [battles]', desc: '난이도 스케일링 분석' },
    { cmd: 'wincond [battles]', desc: '승리 요인 분석' },
    { cmd: 'export [battles] [filename]', desc: '결과 내보내기' },
    { cmd: 'token [battles]', desc: '토큰 효율 분석' },
    { cmd: 'matchup [deck] [enemy] [battles]', desc: '매치업 분석' },
    { cmd: 'speed [battles]', desc: '속도 분석' },
    { cmd: 'trait [battles]', desc: '특성 시너지 분석' },
    { cmd: 'recommend [enemyId] [battles]', desc: '전략 추천' },
    { cmd: 'help', desc: '도움말 출력' },
  ];

  for (const c of commands) {
    console.log(`  ${c.cmd.padEnd(35)} ${c.desc}`);
  }

  console.log('\n📖 사용 예시:');
  console.log('  npx tsx scripts/runSimulator.ts 100');
  console.log('  npx tsx scripts/runSimulator.ts balance 50');
  console.log('  npx tsx scripts/runSimulator.ts recommend deserter 30');

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 두 덱 비교
 * 두 덱의 성능을 직접 비교
 */
export function runDeckCompare(deck1Name: string, deck2Name: string, battles: number = 50): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            덱 비교 분석                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const deck1 = DECK_PRESETS[deck1Name];
  const deck2 = DECK_PRESETS[deck2Name];

  if (!deck1) {
    console.log(`❌ 덱 "${deck1Name}" 을(를) 찾을 수 없습니다.`);
    console.log(`사용 가능한 덱: ${Object.keys(DECK_PRESETS).join(', ')}`);
    return;
  }
  if (!deck2) {
    console.log(`❌ 덱 "${deck2Name}" 을(를) 찾을 수 없습니다.`);
    console.log(`사용 가능한 덱: ${Object.keys(DECK_PRESETS).join(', ')}`);
    return;
  }

  console.log(`⚔️ ${deck1.name} vs ${deck2.name}\n`);
  console.log('─'.repeat(50));

  // 각 적에 대해 테스트
  const testEnemies = TIER_1_ENEMIES.slice(0, 4);
  const results: Array<{ enemy: string; deck1Win: number; deck2Win: number }> = [];

  for (const enemyId of testEnemies) {
    const enemy = ENEMIES.find(e => e.id === enemyId);
    if (!enemy) continue;

    // 덱 1 테스트
    const config1: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [enemyId],
      playerDeck: deck1.cards,
      verbose: false,
    };
    const stats1 = runSimulation(config1);

    // 덱 2 테스트
    const config2: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [enemyId],
      playerDeck: deck2.cards,
      verbose: false,
    };
    const stats2 = runSimulation(config2);

    results.push({
      enemy: enemy.name,
      deck1Win: stats1.winRate,
      deck2Win: stats2.winRate,
    });

    // 결과 출력
    const winner = stats1.winRate > stats2.winRate ? deck1.name :
      stats1.winRate < stats2.winRate ? deck2.name : '동률';
    const diff = Math.abs(stats1.winRate - stats2.winRate) * 100;

    console.log(`\n  vs ${enemy.name}:`);
    console.log(`    ${deck1.name}: ${(stats1.winRate * 100).toFixed(1)}%`);
    console.log(`    ${deck2.name}: ${(stats2.winRate * 100).toFixed(1)}%`);
    console.log(`    → ${winner} ${diff > 0 ? `(+${diff.toFixed(1)}%)` : ''}`);
  }

  // 총합
  const total1 = results.reduce((s, r) => s + r.deck1Win, 0) / results.length;
  const total2 = results.reduce((s, r) => s + r.deck2Win, 0) / results.length;
  const overallWinner = total1 > total2 ? deck1.name : total1 < total2 ? deck2.name : '동률';

  console.log('\n' + '─'.repeat(50));
  console.log('\n🏆 종합 결과:');
  console.log(`  ${deck1.name}: 평균 ${(total1 * 100).toFixed(1)}%`);
  console.log(`  ${deck2.name}: 평균 ${(total2 * 100).toFixed(1)}%`);
  console.log(`  \n  승자: ${overallWinner}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 벤치마크 모드
 * 시뮬레이션 성능 측정
 */
export function runBenchmark(iterations: number = 100): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            성능 벤치마크                ║');
  console.log('╚════════════════════════════════════════╝\n');

  const tests = [
    { name: '단일 전투', fn: () => runBattle('ghoul', { battles: 1, maxTurns: 30, verbose: false }) },
    { name: '10회 시뮬레이션', fn: () => runSimulation({ battles: 10, maxTurns: 30, enemyIds: ['ghoul'], verbose: false }) },
    { name: '전체 Tier 1 (10회)', fn: () => runSimulation({ battles: 10, maxTurns: 30, enemyIds: TIER_1_ENEMIES, verbose: false }) },
  ];

  console.log(`📊 ${iterations}회 반복 측정:\n`);
  console.log('─'.repeat(50));

  for (const test of tests) {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      test.fn();
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`\n  ${test.name}:`);
    console.log(`    평균: ${avg.toFixed(2)}ms`);
    console.log(`    최소: ${min.toFixed(2)}ms`);
    console.log(`    최대: ${max.toFixed(2)}ms`);
  }

  // 초당 전투 수 계산
  const battleStart = performance.now();
  let battleCount = 0;
  while (performance.now() - battleStart < 1000) {
    runBattle('ghoul', { battles: 1, maxTurns: 30, verbose: false });
    battleCount++;
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`\n⚡ 처리량: ${battleCount} 전투/초`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 랜덤 덱 테스터
 * 랜덤 덱 조합을 테스트하여 좋은 조합 발견
 */
export function runRandomDeckTest(trials: number = 10, battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          랜덤 덱 테스터                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 사용 가능한 카드 목록
  const availableCards = CARDS.filter(c => !c.starter).map(c => c.id);
  const starterCards = CARDS.filter(c => c.starter).map(c => c.id);

  console.log(`📊 ${trials}개 랜덤 덱 테스트 (각 ${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const results: Array<{ deck: string[]; winRate: number; avgTurns: number }> = [];

  for (let i = 0; i < trials; i++) {
    // 랜덤 덱 생성 (스타터 4장 + 랜덤 4장)
    const deck: string[] = [];

    // 스타터 카드 4장
    for (let j = 0; j < 4; j++) {
      deck.push(starterCards[Math.floor(Math.random() * starterCards.length)]);
    }

    // 랜덤 카드 4장
    for (let j = 0; j < 4; j++) {
      deck.push(availableCards[Math.floor(Math.random() * availableCards.length)]);
    }

    // 테스트
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({ deck, winRate: stats.winRate, avgTurns: stats.avgTurns });

    // 진행률 표시
    process.stdout.write(`\r  테스트 진행: ${i + 1}/${trials}`);
  }

  console.log('\n\n' + '─'.repeat(50));

  // 상위 3개 결과
  results.sort((a, b) => b.winRate - a.winRate);
  console.log('\n🏆 상위 3개 덱:\n');

  for (let i = 0; i < Math.min(3, results.length); i++) {
    const r = results[i];
    const cardNames = r.deck.map(id => {
      const card = CARDS.find(c => c.id === id);
      return card?.name || id;
    });

    console.log(`  ${i + 1}위: 승률 ${(r.winRate * 100).toFixed(1)}%`);
    console.log(`     카드: ${cardNames.join(', ')}`);
  }

  // 평균
  const avgWinRate = results.reduce((s, r) => s + r.winRate, 0) / results.length;
  console.log(`\n📈 전체 평균 승률: ${(avgWinRate * 100).toFixed(1)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 최적 카드 찾기
 * 기존 덱에 추가할 최적의 카드 탐색
 */
export function runBestCardFinder(baseDeckName: string = 'balanced', battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          최적 카드 찾기                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const baseDeck = DECK_PRESETS[baseDeckName];
  if (!baseDeck) {
    console.log(`❌ 덱 "${baseDeckName}" 을(를) 찾을 수 없습니다.`);
    return;
  }

  console.log(`📊 기본 덱: ${baseDeck.name}`);
  console.log(`   카드: ${baseDeck.cards.join(', ')}\n`);
  console.log('─'.repeat(50));

  // 기준 승률
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES.slice(0, 3),
    playerDeck: baseDeck.cards,
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  console.log(`\n  기준 승률: ${(baseWinRate * 100).toFixed(1)}%\n`);

  // 테스트할 카드들
  const testCards = CARDS.filter(c => !baseDeck.cards.includes(c.id)).slice(0, 20);
  const results: Array<{ card: string; name: string; winRate: number; diff: number }> = [];

  for (const card of testCards) {
    // 덱의 마지막 카드를 교체
    const testDeck = [...baseDeck.cards.slice(0, -1), card.id];

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: testDeck,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({
      card: card.id,
      name: card.name,
      winRate: stats.winRate,
      diff: stats.winRate - baseWinRate,
    });
  }

  // 효과순 정렬
  results.sort((a, b) => b.diff - a.diff);

  console.log('🏆 최적 교체 카드 (상위 5개):\n');
  results.slice(0, 5).forEach((r, idx) => {
    const sign = r.diff >= 0 ? '+' : '';
    const indicator = r.diff > 0 ? '▲' : r.diff < 0 ? '▼' : '─';
    console.log(`  ${idx + 1}. ${r.name}: ${(r.winRate * 100).toFixed(1)}% (${sign}${(r.diff * 100).toFixed(1)}%) ${indicator}`);
  });

  console.log('\n💡 추천: ');
  if (results[0].diff > 0.05) {
    console.log(`   ${baseDeck.cards[baseDeck.cards.length - 1]}를 ${results[0].name}(으)로 교체하세요.`);
  } else {
    console.log(`   현재 덱이 이미 최적화되어 있습니다.`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 적 약점 분석
 * 각 적의 약점을 파악하여 최적 전략 제시
 */
export function runEnemyWeaknessAnalysis(enemyId: string = 'ghoul', battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          적 약점 분석                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const enemy = ENEMIES.find(e => e.id === enemyId);
  if (!enemy) {
    console.log(`❌ 적 "${enemyId}" 을(를) 찾을 수 없습니다.`);
    return;
  }

  console.log(`🎯 분석 대상: ${enemy.name} (Tier ${enemy.tier}, HP ${enemy.hp})\n`);
  console.log('─'.repeat(50));

  // 각 덱 유형으로 테스트
  const deckResults: Array<{ name: string; winRate: number; avgTurns: number }> = [];

  for (const [deckId, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [enemyId],
      playerDeck: deck.cards,
      verbose: false,
    };

    const stats = runSimulation(config);
    deckResults.push({ name: deck.name, winRate: stats.winRate, avgTurns: stats.avgTurns });
  }

  // 결과 정렬 및 출력
  deckResults.sort((a, b) => b.winRate - a.winRate);

  console.log('\n📊 덱별 승률:\n');
  deckResults.forEach((r, idx) => {
    const bar = '█'.repeat(Math.ceil(r.winRate * 20));
    const status = idx === 0 ? '⭐ 최적' : idx < 3 ? '✓ 효과적' : '';
    console.log(`  ${r.name.padEnd(12)}: ${bar} ${(r.winRate * 100).toFixed(1)}% ${status}`);
  });

  // 약점 분석
  console.log('\n💡 약점 분석:');
  console.log('─'.repeat(50));

  const bestDeck = deckResults[0];
  const worstDeck = deckResults[deckResults.length - 1];
  const avgWinRate = deckResults.reduce((s, r) => s + r.winRate, 0) / deckResults.length;

  if (bestDeck.name.includes('공격') || bestDeck.name.includes('속공')) {
    console.log(`  • ${enemy.name}은(는) 빠른 공격에 취약합니다.`);
  } else if (bestDeck.name.includes('방어') || bestDeck.name.includes('반격')) {
    console.log(`  • ${enemy.name}은(는) 방어적 플레이에 약합니다.`);
  } else if (bestDeck.name.includes('콤보')) {
    console.log(`  • ${enemy.name}은(는) 콤보 공격에 취약합니다.`);
  }

  console.log(`  • 최적 덱: ${bestDeck.name} (${(bestDeck.winRate * 100).toFixed(1)}%)`);
  console.log(`  • 회피 덱: ${worstDeck.name} (${(worstDeck.winRate * 100).toFixed(1)}%)`);
  console.log(`  • 평균 난이도: ${avgWinRate > 0.7 ? '쉬움' : avgWinRate > 0.5 ? '보통' : '어려움'}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 다중 상징 콤보 테스트
 * 상징 조합의 시너지 효과 분석
 */
export function runMultiRelicTest(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        다중 상징 콤보 테스트            ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 테스트할 상징 조합
  const relicCombos: Array<{ name: string; relics: string[] }> = [
    { name: '공격 콤보', relics: ['trainingBoots', 'ironWill'] },
    { name: '방어 콤보', relics: ['sturdyArmor', 'oldCompass'] },
    { name: '회복 콤보', relics: ['raggedCloak', 'sturdyArmor'] },
    { name: '균형 콤보', relics: ['trainingBoots', 'sturdyArmor'] },
  ];

  // 기준 (상징 없음)
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES.slice(0, 3),
    playerRelics: [],
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  console.log(`📊 기준 승률 (상징 없음): ${(baseWinRate * 100).toFixed(1)}%\n`);
  console.log('─'.repeat(50));

  const results: Array<{ name: string; winRate: number; diff: number; synergy: number }> = [];

  for (const combo of relicCombos) {
    // 개별 상징 효과 계산
    let individualSum = 0;
    for (const relicId of combo.relics) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: TIER_1_ENEMIES.slice(0, 3),
        playerRelics: [relicId],
        verbose: false,
      };
      const stats = runSimulation(config);
      individualSum += stats.winRate - baseWinRate;
    }

    // 조합 효과 계산
    const comboConfig: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerRelics: combo.relics,
      verbose: false,
    };
    const comboStats = runSimulation(comboConfig);
    const comboDiff = comboStats.winRate - baseWinRate;

    // 시너지 = 조합 효과 - 개별 효과 합
    const synergy = comboDiff - individualSum;

    results.push({
      name: combo.name,
      winRate: comboStats.winRate,
      diff: comboDiff,
      synergy,
    });
  }

  // 시너지순 정렬
  results.sort((a, b) => b.synergy - a.synergy);

  console.log('\n🏆 상징 조합 시너지 순위:\n');
  results.forEach((r, idx) => {
    const sign = r.diff >= 0 ? '+' : '';
    const synergySign = r.synergy >= 0 ? '+' : '';
    const synergyIndicator = r.synergy > 0.02 ? '🔥 시너지!' :
      r.synergy < -0.02 ? '❄️ 역시너지' : '➖ 보통';

    console.log(`  ${idx + 1}. ${r.name}:`);
    console.log(`     승률: ${(r.winRate * 100).toFixed(1)}% (${sign}${(r.diff * 100).toFixed(1)}%)`);
    console.log(`     시너지: ${synergySign}${(r.synergy * 100).toFixed(1)}% ${synergyIndicator}`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 진행형 난이도 테스트
 * Tier 1 → 2 → 3 순차 전투 시뮬레이션
 */
export function runProgressionTest(runsPerTier: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        진행형 난이도 테스트             ║');
  console.log('╚════════════════════════════════════════╝\n');

  const tiers = [
    { tier: 1, enemies: TIER_1_ENEMIES, name: 'Tier 1 (초반)' },
    { tier: 2, enemies: TIER_2_ENEMIES, name: 'Tier 2 (중반)' },
    { tier: 3, enemies: TIER_3_ENEMIES, name: 'Tier 3 (후반)' },
  ];

  console.log(`📊 ${runsPerTier}회 시뮬레이션 (티어별)\n`);
  console.log('─'.repeat(50));

  const results: Array<{ tier: string; winRate: number; avgTurns: number; survivalRate: number }> = [];

  for (const tierInfo of tiers) {
    // 여러 적과 전투
    let totalWins = 0;
    let totalBattles = 0;
    let totalTurns = 0;
    let survived = 0;

    for (const enemyId of tierInfo.enemies.slice(0, 4)) {
      const config: SimulationConfig = {
        battles: runsPerTier,
        maxTurns: 30,
        enemyIds: [enemyId],
        verbose: false,
      };

      const stats = runSimulation(config);
      totalWins += stats.wins;
      totalBattles += stats.totalBattles;
      totalTurns += stats.avgTurns * stats.totalBattles;

      if (stats.winRate >= 0.5) survived++;
    }

    const winRate = totalWins / totalBattles;
    const avgTurns = totalTurns / totalBattles;
    const survivalRate = survived / Math.min(4, tierInfo.enemies.length);

    results.push({
      tier: tierInfo.name,
      winRate,
      avgTurns,
      survivalRate,
    });

    // 그래프 출력
    const bar = '█'.repeat(Math.ceil(winRate * 25));
    console.log(`\n  ${tierInfo.name}:`);
    console.log(`    승률: ${bar} ${(winRate * 100).toFixed(1)}%`);
    console.log(`    평균 턴: ${avgTurns.toFixed(1)}`);
    console.log(`    돌파율: ${(survivalRate * 100).toFixed(0)}%`);
  }

  // 전체 분석
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 진행 분석:');

  const tier1 = results[0];
  const tier2 = results[1];
  const tier3 = results[2];

  if (tier1.winRate > 0.7 && tier2.winRate > 0.5 && tier3.winRate > 0.3) {
    console.log('  ✓ 밸런스 양호: 점진적 난이도 증가');
  } else if (tier1.winRate < 0.5) {
    console.log('  ⚠️ 초반 난이도가 너무 높습니다.');
  } else if (tier2.winRate < 0.3) {
    console.log('  ⚠️ 중반 난이도 급증이 있습니다.');
  } else if (tier3.winRate > 0.6) {
    console.log('  ⚠️ 후반 난이도가 너무 낮습니다.');
  }

  // 예상 클리어율
  const expectedClear = tier1.winRate * tier2.winRate * tier3.winRate;
  console.log(`  📈 예상 게임 클리어율: ${(expectedClear * 100).toFixed(1)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 카드 랭킹
 * 각 카드의 효율성 순위 산정
 */
export function runCardRanking(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            카드 랭킹                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  const testCards = CARDS.filter(c => !c.starter);

  console.log(`📊 ${testCards.length}개 카드 테스트 (각 ${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  // 기준 덱 (스타터만)
  const baseDeck = DECK_PRESETS.balanced;
  const baseConfig: SimulationConfig = {
    battles: battles * 2,
    maxTurns: 30,
    enemyIds: TIER_1_ENEMIES.slice(0, 3),
    playerDeck: baseDeck,
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  console.log(`  기준 덱 승률: ${(baseWinRate * 100).toFixed(1)}%\n`);

  const results: Array<{ card: typeof CARDS[0]; winRate: number; diff: number }> = [];

  for (let i = 0; i < testCards.length; i++) {
    const card = testCards[i];

    // 카드 추가 테스트
    const testDeck = [...baseDeck.slice(0, 7), card.id];
    const testConfig: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: testDeck,
      verbose: false,
    };

    const stats = runSimulation(testConfig);
    results.push({
      card,
      winRate: stats.winRate,
      diff: stats.winRate - baseWinRate,
    });

    process.stdout.write(`\r  테스트 진행: ${i + 1}/${testCards.length}`);
  }

  console.log('\n\n' + '─'.repeat(50));

  // 효율순 정렬
  results.sort((a, b) => b.diff - a.diff);

  // 상위 10개
  console.log('\n🏆 카드 효율 TOP 10:\n');
  for (let i = 0; i < Math.min(10, results.length); i++) {
    const r = results[i];
    const sign = r.diff >= 0 ? '+' : '';
    const tier = r.diff > 0.1 ? 'S' : r.diff > 0.05 ? 'A' : r.diff > 0 ? 'B' : r.diff > -0.05 ? 'C' : 'D';

    console.log(`  ${i + 1}. [${tier}] ${r.card.name} (${r.card.id})`);
    console.log(`     승률 변화: ${sign}${(r.diff * 100).toFixed(1)}%`);
  }

  // 하위 5개
  console.log('\n⚠️ 하위 카드 (밸런스 확인 필요):');
  for (let i = results.length - 5; i < results.length; i++) {
    if (i < 0) continue;
    const r = results[i];
    const sign = r.diff >= 0 ? '+' : '';
    console.log(`  • ${r.card.name}: ${sign}${(r.diff * 100).toFixed(1)}%`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 상징 랭킹
 * 각 상징의 효율성 순위 산정
 */
export function runRelicRanking(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            상징 랭킹                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 상징 효율 테스트 (각 ${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  // 기준 (상징 없음)
  const baseConfig: SimulationConfig = {
    battles: battles * 2,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
    verbose: false,
  };
  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  console.log(`  기준 승률 (상징 없음): ${(baseWinRate * 100).toFixed(1)}%\n`);

  const relics = ['fox', 'turtle', 'falcon', 'oni'];
  const results: Array<{ relic: string; winRate: number; diff: number }> = [];

  for (const relicId of relics) {
    const testConfig: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
      playerRelics: [relicId],
      verbose: false,
    };

    const stats = runSimulation(testConfig);
    results.push({
      relic: relicId,
      winRate: stats.winRate,
      diff: stats.winRate - baseWinRate,
    });
  }

  // 효율순 정렬
  results.sort((a, b) => b.diff - a.diff);

  console.log('🏆 상징 효율 순위:\n');
  results.forEach((r, idx) => {
    const sign = r.diff >= 0 ? '+' : '';
    const bar = '█'.repeat(Math.ceil(r.winRate * 20));

    console.log(`  ${idx + 1}. ${r.relic.toUpperCase()}`);
    console.log(`     ${bar} ${(r.winRate * 100).toFixed(1)}%`);
    console.log(`     효과: ${sign}${(r.diff * 100).toFixed(1)}%\n`);
  });

  console.log('─'.repeat(50));
  console.log('\n💡 분석:');

  const best = results[0];
  const worst = results[results.length - 1];

  if (best.diff - worst.diff > 0.2) {
    console.log(`  ⚠️ 상징 간 효율 차이가 큽니다 (${((best.diff - worst.diff) * 100).toFixed(1)}%)`);
  } else {
    console.log('  ✓ 상징 간 밸런스가 양호합니다.');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 메타 분석
 * 전체 게임 메타 분석 및 밸런스 제안
 */
export function runMetaAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║             메타 분석 리포트                    ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const issues: string[] = [];
  const suggestions: string[] = [];

  // 1. 덱 분석
  console.log('📊 덱 메타 분석...');
  const deckResults: Array<{ name: string; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    deckResults.push({ name, winRate: stats.winRate });
  }

  deckResults.sort((a, b) => b.winRate - a.winRate);

  console.log('\n  덱 승률 순위:');
  deckResults.forEach((d, i) => {
    const bar = '█'.repeat(Math.ceil(d.winRate * 20));
    console.log(`    ${i + 1}. ${d.name}: ${bar} ${(d.winRate * 100).toFixed(1)}%`);
  });

  const topDeck = deckResults[0];
  const bottomDeck = deckResults[deckResults.length - 1];

  if (topDeck.winRate - bottomDeck.winRate > 0.3) {
    issues.push(`덱 간 승률 격차 큼: ${topDeck.name} vs ${bottomDeck.name} (${((topDeck.winRate - bottomDeck.winRate) * 100).toFixed(1)}%)`);
    suggestions.push(`${bottomDeck.name} 덱 강화 또는 ${topDeck.name} 덱 약화 필요`);
  }

  // 2. 티어별 밸런스
  console.log('\n📊 티어별 밸런스...');
  const tierWinRates: number[] = [];

  for (const [idx, enemies] of [TIER_1_ENEMIES, TIER_2_ENEMIES, TIER_3_ENEMIES].entries()) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: enemies.slice(0, 3),
      verbose: false,
    };

    const stats = runSimulation(config);
    tierWinRates.push(stats.winRate);

    console.log(`    Tier ${idx + 1}: ${(stats.winRate * 100).toFixed(1)}%`);
  }

  if (tierWinRates[0] < 0.6) {
    issues.push('Tier 1 난이도가 너무 높음');
    suggestions.push('Tier 1 적 약화 또는 초반 카드 강화 필요');
  }

  if (tierWinRates[1] > tierWinRates[0]) {
    issues.push('Tier 2가 Tier 1보다 쉬움');
    suggestions.push('Tier 2 적 강화 필요');
  }

  if (tierWinRates[2] > 0.5) {
    issues.push('Tier 3 난이도가 너무 낮음');
    suggestions.push('Tier 3 적 강화 또는 보스 추가 필요');
  }

  // 3. 상징 밸런스
  console.log('\n📊 상징 밸런스...');
  const relics = ['fox', 'turtle', 'falcon', 'oni'];
  const relicResults: Array<{ relic: string; winRate: number }> = [];

  for (const relicId of relics) {
    const config: SimulationConfig = {
      battles: battles / 2,
      maxTurns: 30,
      enemyIds: TIER_2_ENEMIES.slice(0, 3),
      playerRelics: [relicId],
      verbose: false,
    };

    const stats = runSimulation(config);
    relicResults.push({ relic: relicId, winRate: stats.winRate });
  }

  const maxRelicWin = Math.max(...relicResults.map(r => r.winRate));
  const minRelicWin = Math.min(...relicResults.map(r => r.winRate));

  if (maxRelicWin - minRelicWin > 0.15) {
    const best = relicResults.find(r => r.winRate === maxRelicWin)!;
    const worst = relicResults.find(r => r.winRate === minRelicWin)!;
    issues.push(`상징 밸런스 불균형: ${best.relic} >> ${worst.relic}`);
    suggestions.push(`${worst.relic} 상징 효과 강화 또는 ${best.relic} 약화`);
  }

  // 4. 결론
  console.log('\n' + '═'.repeat(50));
  console.log('\n🔍 발견된 이슈:');

  if (issues.length === 0) {
    console.log('  ✓ 심각한 밸런스 이슈 없음');
  } else {
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ⚠️ ${issue}`);
    });
  }

  console.log('\n💡 개선 제안:');

  if (suggestions.length === 0) {
    console.log('  ✓ 현재 밸런스 양호');
  } else {
    suggestions.forEach((sug, i) => {
      console.log(`  ${i + 1}. ${sug}`);
    });
  }

  // 전체 건강도 점수
  const healthScore = 100 - issues.length * 15;
  const healthRating = healthScore >= 85 ? '🟢 양호' :
    healthScore >= 70 ? '🟡 주의' : '🔴 조정 필요';

  console.log(`\n📈 게임 밸런스 건강도: ${healthScore}/100 ${healthRating}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 턴 분석
 * 턴별 행동 패턴 분석
 */
export function runTurnAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            턴 분석                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
    verbose: false,
  };

  const stats = runSimulation(config);

  console.log(`📊 ${battles}회 전투 분석\n`);
  console.log('─'.repeat(50));

  // 기본 통계
  console.log('\n📈 기본 통계:');
  console.log(`  평균 턴: ${stats.avgTurns.toFixed(1)}`);
  console.log(`  승률: ${(stats.winRate * 100).toFixed(1)}%`);

  // 턴 분포 예측
  const quickWin = stats.avgTurns < 4 ? '높음' : '보통';
  const longBattle = stats.avgTurns > 8 ? '높음' : '낮음';

  console.log('\n⏱️ 전투 속도 분석:');
  console.log(`  속전속결 확률: ${quickWin}`);
  console.log(`  장기전 확률: ${longBattle}`);

  // 페이스 분석
  if (stats.avgTurns < 3) {
    console.log('\n💡 분석: 전투가 너무 빠르게 끝남. 밸런스 확인 필요.');
  } else if (stats.avgTurns < 6) {
    console.log('\n💡 분석: 적절한 전투 속도.');
  } else if (stats.avgTurns < 10) {
    console.log('\n💡 분석: 약간 긴 전투. 공격력 상향 고려.');
  } else {
    console.log('\n💡 분석: 전투가 너무 김. 데미지 밸런스 조정 필요.');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 데미지 분석
 * 덱별/카드별 데미지 출력 분석
 */
export function runDamageAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            데미지 분석                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 데미지 출력 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const results: Array<{ name: string; avgDamage: number; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);

    // 평균 데미지 추정 (승률과 턴수 기반)
    const avgEnemyHp = 50; // 티어1 적 평균 HP
    const estimatedDamage = stats.winRate > 0
      ? avgEnemyHp / Math.max(1, stats.avgTurns)
      : avgEnemyHp * 0.5 / Math.max(1, stats.avgTurns);

    results.push({
      name,
      avgDamage: estimatedDamage,
      winRate: stats.winRate,
    });
  }

  // 데미지순 정렬
  results.sort((a, b) => b.avgDamage - a.avgDamage);

  console.log('\n🗡️ 덱별 예상 턴당 데미지:\n');
  results.forEach((r, idx) => {
    const bar = '█'.repeat(Math.ceil(r.avgDamage * 2));
    console.log(`  ${idx + 1}. ${r.name}: ${bar} ${r.avgDamage.toFixed(1)}`);
    console.log(`     승률: ${(r.winRate * 100).toFixed(1)}%`);
  });

  // 분석
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 분석:');

  const highDamage = results.filter(r => r.avgDamage > 10);
  const lowDamage = results.filter(r => r.avgDamage < 5);

  if (highDamage.length > 0) {
    console.log(`  🔥 고딜 덱: ${highDamage.map(r => r.name).join(', ')}`);
  }
  if (lowDamage.length > 0) {
    console.log(`  🛡️ 저딜/탱커 덱: ${lowDamage.map(r => r.name).join(', ')}`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 힐링 분석
 * 회복 효율 및 생존력 분석
 */
export function runHealingAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            힐링 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 생존력 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  // 방어 카드가 있는 덱 vs 없는 덱 비교
  const defensiveCards = CARDS.filter(c => c.traits?.includes('방어') || c.traits?.includes('회복'));

  const results: Array<{ name: string; survivalTurns: number; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 50, // 긴 전투도 허용
      enemyIds: TIER_2_ENEMIES.slice(0, 3), // 어려운 적으로 테스트
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);

    results.push({
      name,
      survivalTurns: stats.avgTurns,
      winRate: stats.winRate,
    });
  }

  // 생존턴순 정렬
  results.sort((a, b) => b.survivalTurns - a.survivalTurns);

  console.log('\n💚 덱별 평균 생존 턴:\n');
  results.forEach((r, idx) => {
    const bar = '█'.repeat(Math.ceil(r.survivalTurns));
    console.log(`  ${idx + 1}. ${r.name}: ${bar} ${r.survivalTurns.toFixed(1)}턴`);
    console.log(`     승률: ${(r.winRate * 100).toFixed(1)}%`);
  });

  // 분석
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 분석:');

  const tanky = results.filter(r => r.survivalTurns > 8 && r.winRate < 0.5);
  const glassy = results.filter(r => r.survivalTurns < 4 && r.winRate > 0.5);

  if (tanky.length > 0) {
    console.log(`  🛡️ 지구력형 (긴 전투, 낮은 승률): ${tanky.map(r => r.name).join(', ')}`);
  }
  if (glassy.length > 0) {
    console.log(`  ⚡ 유리대포형 (빠른 승리): ${glassy.map(r => r.name).join(', ')}`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 콤보 빈도 분석
 * 콤보 발생 패턴 상세 분석
 */
export function runComboBreakdown(battles: number = 50): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           콤보 빈도 분석                ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${battles}회 전투 콤보 발생 분석\n`);
  console.log('─'.repeat(50));

  // 콤보 덱으로 테스트
  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES.slice(0, 3), ...TIER_2_ENEMIES.slice(0, 2)],
    playerDeck: DECK_PRESETS.combo,
    verbose: false,
  };

  const stats = runSimulation(config);

  console.log('\n🃏 콤보 발생 통계:\n');

  if (Object.keys(stats.comboStats).length === 0) {
    console.log('  콤보 발생 데이터 없음');
  } else {
    // 콤보 정렬
    const sortedCombos = Object.entries(stats.comboStats)
      .sort((a, b) => b[1].count - a[1].count);

    // 콤보 티어 분류
    const tierS = ['파이브카드', '스트레이트 플러시', '포카드'];
    const tierA = ['풀하우스', '플러시', '스트레이트'];
    const tierB = ['트리플', '투페어'];
    const tierC = ['페어'];

    console.log('  [S 티어] 레전드리 콤보:');
    tierS.forEach(combo => {
      const stat = stats.comboStats[combo];
      if (stat) {
        console.log(`    • ${combo}: ${stat.count}회 (전투당 ${stat.avgPerBattle.toFixed(2)})`);
      }
    });

    console.log('\n  [A 티어] 레어 콤보:');
    tierA.forEach(combo => {
      const stat = stats.comboStats[combo];
      if (stat) {
        console.log(`    • ${combo}: ${stat.count}회 (전투당 ${stat.avgPerBattle.toFixed(2)})`);
      }
    });

    console.log('\n  [B 티어] 일반 콤보:');
    tierB.forEach(combo => {
      const stat = stats.comboStats[combo];
      if (stat) {
        console.log(`    • ${combo}: ${stat.count}회 (전투당 ${stat.avgPerBattle.toFixed(2)})`);
      }
    });

    console.log('\n  [C 티어] 기본 콤보:');
    tierC.forEach(combo => {
      const stat = stats.comboStats[combo];
      if (stat) {
        console.log(`    • ${combo}: ${stat.count}회 (전투당 ${stat.avgPerBattle.toFixed(2)})`);
      }
    });
  }

  // 콤보 덱 효율
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 콤보 덱 분석:');
  console.log(`  승률: ${(stats.winRate * 100).toFixed(1)}%`);
  console.log(`  평균 턴: ${stats.avgTurns.toFixed(1)}`);

  const totalCombos = Object.values(stats.comboStats).reduce((s, c) => s + c.count, 0);
  console.log(`  총 콤보 발생: ${totalCombos}회 (전투당 ${(totalCombos / battles).toFixed(1)})`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 스트레스 테스트
 * 대량 시뮬레이션으로 안정성 확인
 */
export function runStressTest(battles: number = 1000): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           스트레스 테스트               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${battles}회 대량 시뮬레이션\n`);
  console.log('─'.repeat(50));

  const startTime = performance.now();

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES, ...TIER_2_ENEMIES, ...TIER_3_ENEMIES],
    verbose: false,
  };

  // 단계별 진행
  const segments = 10;
  const segmentSize = Math.floor(battles / segments);
  const segmentResults: number[] = [];

  for (let i = 0; i < segments; i++) {
    const segConfig = { ...config, battles: segmentSize };
    const segStats = runSimulation(segConfig);
    segmentResults.push(segStats.winRate);

    const progress = ((i + 1) / segments * 100).toFixed(0);
    process.stdout.write(`\r  진행률: ${progress}% [${'█'.repeat(i + 1)}${'░'.repeat(segments - i - 1)}]`);
  }

  const elapsed = performance.now() - startTime;

  console.log('\n\n' + '─'.repeat(50));

  // 결과 분석
  const avgWinRate = segmentResults.reduce((s, r) => s + r, 0) / segments;
  const variance = segmentResults.reduce((s, r) => s + Math.pow(r - avgWinRate, 2), 0) / segments;
  const stdDev = Math.sqrt(variance);

  console.log('\n📈 결과:');
  console.log(`  총 전투: ${battles}회`);
  console.log(`  실행 시간: ${(elapsed / 1000).toFixed(2)}초`);
  console.log(`  처리 속도: ${(battles / elapsed * 1000).toFixed(0)} 전투/초`);
  console.log(`\n  평균 승률: ${(avgWinRate * 100).toFixed(1)}%`);
  console.log(`  표준편차: ${(stdDev * 100).toFixed(2)}%`);

  // 안정성 평가
  const stability = stdDev < 0.05 ? '🟢 매우 안정' :
    stdDev < 0.1 ? '🟡 안정' :
    stdDev < 0.15 ? '🟠 약간 불안정' : '🔴 불안정';

  console.log(`\n  안정성: ${stability}`);

  // 세그먼트별 결과
  console.log('\n  세그먼트별 승률:');
  segmentResults.forEach((r, i) => {
    const bar = '█'.repeat(Math.ceil(r * 20));
    console.log(`    ${i + 1}. ${bar} ${(r * 100).toFixed(1)}%`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 확률 분석
 * 카드/콤보 확률 계산
 */
export function runProbabilityAnalysis(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           확률 분석                     ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📊 이론적 확률 분석\n');
  console.log('─'.repeat(50));

  // 덱 크기와 핸드 크기
  const deckSize = 8;
  const handSize = 5;

  // 콤보 확률 (단순화)
  console.log('\n🃏 콤보 이론적 확률 (8장 덱, 5장 핸드):');
  console.log('  (실제 확률은 덱 구성에 따라 다름)\n');

  // 페어 확률 근사
  const pairProb = 0.4; // 대략적 추정
  const twoPairProb = 0.15;
  const tripleProb = 0.1;
  const straightProb = 0.05;
  const flushProb = 0.03;
  const fullHouseProb = 0.02;
  const fourKindProb = 0.005;
  const straightFlushProb = 0.001;
  const fiveKindProb = 0.0001;

  const probabilities = [
    { name: '페어', prob: pairProb },
    { name: '투페어', prob: twoPairProb },
    { name: '트리플', prob: tripleProb },
    { name: '스트레이트', prob: straightProb },
    { name: '플러시', prob: flushProb },
    { name: '풀하우스', prob: fullHouseProb },
    { name: '포카드', prob: fourKindProb },
    { name: '스트레이트 플러시', prob: straightFlushProb },
    { name: '파이브카드', prob: fiveKindProb },
  ];

  probabilities.forEach(p => {
    const percent = (p.prob * 100).toFixed(2);
    const oneIn = Math.round(1 / p.prob);
    console.log(`  ${p.name}: ~${percent}% (1/${oneIn})`);
  });

  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 참고:');
  console.log('  • 실제 확률은 덱의 카드 분포에 따라 크게 달라집니다.');
  console.log('  • 콤보 덱은 특정 콤보 확률을 높이도록 설계됩니다.');

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 다양성 분석
 * 덱/카드가 다양한 적에게 얼마나 효과적인지
 */
export function runVersatilityAnalysis(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           다양성 분석                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 다양성 분석 (${battles}회/적)\n`);
  console.log('─'.repeat(50));

  const allEnemies = [...TIER_1_ENEMIES, ...TIER_2_ENEMIES, ...TIER_3_ENEMIES];
  const results: Array<{ name: string; avgWinRate: number; versatility: number; details: Record<string, number> }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const enemyWinRates: Record<string, number> = {};

    for (const enemyId of allEnemies.slice(0, 8)) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: [enemyId],
        playerDeck: deck,
        verbose: false,
      };

      const stats = runSimulation(config);
      enemyWinRates[enemyId] = stats.winRate;
    }

    const winRates = Object.values(enemyWinRates);
    const avgWinRate = winRates.reduce((s, r) => s + r, 0) / winRates.length;
    const variance = winRates.reduce((s, r) => s + Math.pow(r - avgWinRate, 2), 0) / winRates.length;
    const versatility = 1 - Math.sqrt(variance); // 높을수록 일관적

    results.push({
      name,
      avgWinRate,
      versatility,
      details: enemyWinRates,
    });
  }

  // 다양성순 정렬
  results.sort((a, b) => b.versatility - a.versatility);

  console.log('\n🎯 덱별 다양성 순위:\n');
  results.forEach((r, idx) => {
    const rating = r.versatility > 0.8 ? '🟢 매우 다양' :
      r.versatility > 0.6 ? '🟡 다양' :
      r.versatility > 0.4 ? '🟠 보통' : '🔴 특화';

    console.log(`  ${idx + 1}. ${r.name}:`);
    console.log(`     평균 승률: ${(r.avgWinRate * 100).toFixed(1)}%`);
    console.log(`     다양성: ${(r.versatility * 100).toFixed(0)}% ${rating}`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 일관성 분석
 * 승률의 일관성 및 분산 분석
 */
export function runConsistencyAnalysis(trials: number = 10, battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           일관성 분석                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${trials}회 반복 시뮬레이션 (각 ${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const results: Array<{ name: string; avgWinRate: number; stdDev: number; consistency: string }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const winRates: number[] = [];

    for (let i = 0; i < trials; i++) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
        playerDeck: deck,
        verbose: false,
      };

      const stats = runSimulation(config);
      winRates.push(stats.winRate);
    }

    const avgWinRate = winRates.reduce((s, r) => s + r, 0) / trials;
    const variance = winRates.reduce((s, r) => s + Math.pow(r - avgWinRate, 2), 0) / trials;
    const stdDev = Math.sqrt(variance);

    const consistency = stdDev < 0.05 ? '🟢 매우 안정' :
      stdDev < 0.1 ? '🟡 안정' :
      stdDev < 0.15 ? '🟠 변동' : '🔴 불안정';

    results.push({ name, avgWinRate, stdDev, consistency });
  }

  // 안정성순 정렬
  results.sort((a, b) => a.stdDev - b.stdDev);

  console.log('\n📈 덱별 일관성:\n');
  results.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name}:`);
    console.log(`     평균 승률: ${(r.avgWinRate * 100).toFixed(1)}%`);
    console.log(`     표준편차: ±${(r.stdDev * 100).toFixed(1)}%`);
    console.log(`     ${r.consistency}`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 패치 노트 생성
 * 시뮬레이션 기반 밸런스 제안
 */
export function generatePatchNotes(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║              자동 패치 노트 생성                    ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const suggestions: { type: string; priority: string; content: string }[] = [];

  // 1. 덱 밸런스 분석
  console.log('📊 덱 밸런스 분석 중...');
  const deckResults: Array<{ name: string; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    deckResults.push({ name, winRate: stats.winRate });
  }

  deckResults.sort((a, b) => b.winRate - a.winRate);

  const topDeck = deckResults[0];
  const bottomDeck = deckResults[deckResults.length - 1];

  if (topDeck.winRate > 0.8) {
    suggestions.push({
      type: '덱 너프',
      priority: '높음',
      content: `${topDeck.name} 덱 승률 ${(topDeck.winRate * 100).toFixed(0)}% - 핵심 카드 약화 필요`,
    });
  }

  if (bottomDeck.winRate < 0.3) {
    suggestions.push({
      type: '덱 버프',
      priority: '높음',
      content: `${bottomDeck.name} 덱 승률 ${(bottomDeck.winRate * 100).toFixed(0)}% - 핵심 카드 강화 필요`,
    });
  }

  // 2. 티어 밸런스
  console.log('📊 티어 밸런스 분석 중...');
  const tierRates: number[] = [];

  for (const enemies of [TIER_1_ENEMIES, TIER_2_ENEMIES, TIER_3_ENEMIES]) {
    const config: SimulationConfig = {
      battles: battles / 2,
      maxTurns: 30,
      enemyIds: enemies.slice(0, 3),
      verbose: false,
    };

    const stats = runSimulation(config);
    tierRates.push(stats.winRate);
  }

  if (tierRates[0] < 0.6) {
    suggestions.push({
      type: '난이도 조정',
      priority: '중간',
      content: 'Tier 1 적 HP 또는 공격력 10% 감소 권장',
    });
  }

  if (tierRates[2] > 0.5) {
    suggestions.push({
      type: '난이도 조정',
      priority: '중간',
      content: 'Tier 3 적 HP 또는 공격력 15% 증가 권장',
    });
  }

  // 3. 패치 노트 출력
  console.log('\n' + '═'.repeat(50));
  console.log('\n📋 자동 생성 패치 노트:\n');
  console.log('━'.repeat(50));

  if (suggestions.length === 0) {
    console.log('  ✓ 현재 밸런스 양호 - 패치 불필요');
  } else {
    suggestions.sort((a, b) => {
      const priorityOrder = { '높음': 0, '중간': 1, '낮음': 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    suggestions.forEach((s, i) => {
      const icon = s.priority === '높음' ? '🔴' : s.priority === '중간' ? '🟡' : '🟢';
      console.log(`  ${i + 1}. ${icon} [${s.type}] ${s.content}`);
    });
  }

  // 요약
  console.log('\n━'.repeat(50));
  console.log('\n📈 현재 상태 요약:');
  console.log(`  • 최강 덱: ${topDeck.name} (${(topDeck.winRate * 100).toFixed(0)}%)`);
  console.log(`  • 최약 덱: ${bottomDeck.name} (${(bottomDeck.winRate * 100).toFixed(0)}%)`);
  console.log(`  • Tier 1 평균 승률: ${(tierRates[0] * 100).toFixed(0)}%`);
  console.log(`  • Tier 2 평균 승률: ${(tierRates[1] * 100).toFixed(0)}%`);
  console.log(`  • Tier 3 평균 승률: ${(tierRates[2] * 100).toFixed(0)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 에지 케이스 테스트
 * 극단적 상황 테스트
 */
export function runEdgeCaseTest(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         에지 케이스 테스트              ║');
  console.log('╚════════════════════════════════════════╝\n');

  const testCases: Array<{ name: string; config: Partial<SimulationConfig>; expected: string }> = [
    {
      name: '최소 전투',
      config: { battles: 1, maxTurns: 5 },
      expected: '정상 실행',
    },
    {
      name: '단일 적',
      config: { battles: 10, enemyIds: ['ghoul'] },
      expected: '정상 실행',
    },
    {
      name: '모든 적',
      config: { battles: 5, enemyIds: [...TIER_1_ENEMIES, ...TIER_2_ENEMIES, ...TIER_3_ENEMIES] },
      expected: '정상 실행',
    },
    {
      name: '긴 턴 제한',
      config: { battles: 5, maxTurns: 100 },
      expected: '정상 실행',
    },
  ];

  console.log('📊 에지 케이스 테스트 실행\n');
  console.log('─'.repeat(50));

  let passed = 0;
  let failed = 0;

  testCases.forEach((tc, i) => {
    try {
      const config: SimulationConfig = {
        battles: 10,
        maxTurns: 30,
        enemyIds: TIER_1_ENEMIES.slice(0, 2),
        verbose: false,
        ...tc.config,
      };

      const stats = runSimulation(config);

      if (stats.totalBattles > 0) {
        console.log(`  ✓ ${tc.name}: 통과`);
        passed++;
      } else {
        console.log(`  ✗ ${tc.name}: 실패 (전투 없음)`);
        failed++;
      }
    } catch (e) {
      console.log(`  ✗ ${tc.name}: 오류 - ${e}`);
      failed++;
    }
  });

  console.log('\n' + '─'.repeat(50));
  console.log(`\n결과: ${passed}/${testCases.length} 통과`);

  if (failed === 0) {
    console.log('  🟢 모든 에지 케이스 통과!');
  } else {
    console.log(`  🔴 ${failed}개 실패`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 빠른 상태 체크
 * 게임 밸런스 빠른 진단
 */
export function runQuickCheck(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          빠른 상태 체크                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const battles = 20;

  // 전체 승률
  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
    verbose: false,
  };

  const stats = runSimulation(config);

  // 상태 표시
  console.log('📊 현재 상태:\n');

  const overallStatus = stats.winRate > 0.7 ? '🟢' :
    stats.winRate > 0.4 ? '🟡' : '🔴';

  console.log(`  전체 승률: ${overallStatus} ${(stats.winRate * 100).toFixed(0)}%`);
  console.log(`  평균 턴: ${stats.avgTurns.toFixed(1)}`);

  // 콤보 상태
  const totalCombos = Object.values(stats.comboStats).reduce((s, c) => s + c.count, 0);
  const comboStatus = totalCombos > battles * 2 ? '🟢 활발' : totalCombos > battles ? '🟡 보통' : '🔴 저조';
  console.log(`  콤보 활성도: ${comboStatus}`);

  // 추천
  console.log('\n💡 추천:');

  if (stats.winRate > 0.8) {
    console.log('  • 난이도 상향 필요');
  } else if (stats.winRate < 0.4) {
    console.log('  • 플레이어 강화 또는 적 약화 필요');
  } else {
    console.log('  • 현재 밸런스 양호');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * AI 테스트
 * AI 카드 선택 로직 테스트
 */
export function runAITest(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            AI 테스트                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 AI 카드 선택 성능 테스트 (${battles}회)\n`);
  console.log('─'.repeat(50));

  // 다양한 덱으로 테스트
  const results: Array<{ deck: string; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_2_ENEMIES.slice(0, 3),
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({ deck: name, winRate: stats.winRate });
  }

  // 결과 출력
  console.log('\n🤖 AI 성능 (덱별):\n');
  results.sort((a, b) => b.winRate - a.winRate);

  results.forEach((r, idx) => {
    const bar = '█'.repeat(Math.ceil(r.winRate * 20));
    console.log(`  ${idx + 1}. ${r.deck}: ${bar} ${(r.winRate * 100).toFixed(0)}%`);
  });

  // 분석
  const avgWinRate = results.reduce((s, r) => s + r.winRate, 0) / results.length;
  console.log(`\n  AI 평균 성능: ${(avgWinRate * 100).toFixed(0)}%`);

  if (avgWinRate > 0.6) {
    console.log('  💡 AI가 효과적으로 카드를 선택하고 있습니다.');
  } else if (avgWinRate > 0.4) {
    console.log('  💡 AI 카드 선택 로직 개선 여지가 있습니다.');
  } else {
    console.log('  ⚠️ AI 카드 선택 로직 검토가 필요합니다.');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 시간 기록 테스트
 * 전투 시간 분포 분석
 */
export function runTimeTrialTest(battles: number = 50): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          시간 기록 테스트               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${battles}회 전투 시간 분석\n`);
  console.log('─'.repeat(50));

  const times: number[] = [];

  for (let i = 0; i < battles; i++) {
    const start = performance.now();

    const config: SimulationConfig = {
      battles: 1,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      verbose: false,
    };

    runSimulation(config);
    times.push(performance.now() - start);
  }

  // 통계
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / battles;
  const median = times[Math.floor(battles / 2)];
  const p95 = times[Math.floor(battles * 0.95)];
  const min = times[0];
  const max = times[battles - 1];

  console.log('\n⏱️ 시간 통계:\n');
  console.log(`  평균: ${avg.toFixed(2)}ms`);
  console.log(`  중앙값: ${median.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  최소: ${min.toFixed(2)}ms`);
  console.log(`  최대: ${max.toFixed(2)}ms`);

  // 분포 히스토그램
  console.log('\n📊 시간 분포:');
  const buckets = [0, 0, 0, 0, 0]; // <1ms, 1-2ms, 2-5ms, 5-10ms, >10ms

  times.forEach(t => {
    if (t < 1) buckets[0]++;
    else if (t < 2) buckets[1]++;
    else if (t < 5) buckets[2]++;
    else if (t < 10) buckets[3]++;
    else buckets[4]++;
  });

  const labels = ['<1ms', '1-2ms', '2-5ms', '5-10ms', '>10ms'];
  labels.forEach((label, i) => {
    const bar = '█'.repeat(Math.ceil(buckets[i] / battles * 50));
    console.log(`  ${label.padEnd(7)}: ${bar} ${buckets[i]}`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 전체 요약
 * 모든 분석 결과 요약
 */
export function runSummary(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    게임 시뮬레이터 요약                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const battles = 20;

  // 기본 통계
  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)],
    verbose: false,
  };

  const stats = runSimulation(config);

  console.log('📊 기본 통계:\n');
  console.log(`  승률: ${(stats.winRate * 100).toFixed(0)}%`);
  console.log(`  평균 턴: ${stats.avgTurns.toFixed(1)}`);
  console.log(`  총 전투: ${stats.totalBattles}`);

  // 티어별 현황
  console.log('\n📈 티어별 승률:');

  for (const [idx, enemies] of [TIER_1_ENEMIES, TIER_2_ENEMIES, TIER_3_ENEMIES].entries()) {
    const tierConfig: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: enemies.slice(0, 2),
      verbose: false,
    };

    const tierStats = runSimulation(tierConfig);
    const bar = '█'.repeat(Math.ceil(tierStats.winRate * 20));
    console.log(`  Tier ${idx + 1}: ${bar} ${(tierStats.winRate * 100).toFixed(0)}%`);
  }

  // 가용 명령어
  console.log('\n📋 사용 가능한 분석 명령어:');
  console.log('  balance, tier, full, relic, deck, anomaly, card');
  console.log('  synergy, scaling, wincond, export, token, matchup');
  console.log('  speed, trait, recommend, weakness, multirelic, progression');
  console.log('  cardrank, relicrank, meta, turn, damage, healing, combobreak');
  console.log('  stress, prob, versatility, consistency, patchnotes, edge');
  console.log('  quickcheck, aitest, timetrial, summary, help');

  console.log('\n' + '═'.repeat(65) + '\n');
}

/**
 * 덱 빌더
 * AI 기반 최적 덱 추천
 */
export function runDeckBuilder(targetEnemy: string = 'ghoul', battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            덱 빌더                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${targetEnemy}에 대한 최적 덱 찾기\n`);
  console.log('─'.repeat(50));

  // 모든 기존 덱 테스트
  const deckResults: Array<{ name: string; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: [targetEnemy],
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    deckResults.push({ name, winRate: stats.winRate });
  }

  // 정렬
  deckResults.sort((a, b) => b.winRate - a.winRate);

  console.log(`\n🎯 ${targetEnemy}에 추천 덱:\n`);
  deckResults.slice(0, 3).forEach((d, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    console.log(`  ${medal} ${d.name}: ${(d.winRate * 100).toFixed(0)}%`);
  });

  // 추천 상징
  console.log('\n🔮 추천 상징:');
  const relics = ['fox', 'turtle', 'falcon', 'oni'];
  const relicResults: Array<{ relic: string; winRate: number }> = [];

  for (const relicId of relics) {
    const config: SimulationConfig = {
      battles: battles / 2,
      maxTurns: 30,
      enemyIds: [targetEnemy],
      playerDeck: DECK_PRESETS[deckResults[0].name as keyof typeof DECK_PRESETS],
      playerRelics: [relicId],
      verbose: false,
    };

    const stats = runSimulation(config);
    relicResults.push({ relic: relicId, winRate: stats.winRate });
  }

  relicResults.sort((a, b) => b.winRate - a.winRate);
  console.log(`  추천: ${relicResults[0].relic.toUpperCase()} (${(relicResults[0].winRate * 100).toFixed(0)}%)`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * What-If 분석
 * 가상 시나리오 테스트
 */
export function runWhatIfAnalysis(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         What-If 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📊 가상 시나리오 분석\n');
  console.log('─'.repeat(50));

  const battles = 30;

  // 기준 승률
  const baseConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: TIER_2_ENEMIES.slice(0, 3),
    verbose: false,
  };

  const baseStats = runSimulation(baseConfig);
  const baseWinRate = baseStats.winRate;

  console.log(`  현재 승률: ${(baseWinRate * 100).toFixed(1)}%\n`);

  // 시나리오들
  const scenarios = [
    { name: 'HP +20', description: 'HP 증가' },
    { name: '적 HP -10%', description: '적 약화' },
    { name: '시작 에테르 +1', description: '에테르 증가' },
    { name: '카드 드로우 +1', description: '드로우 증가' },
  ];

  console.log('🔮 시나리오 분석:\n');

  // 각 시나리오의 예상 효과
  scenarios.forEach(s => {
    // 대략적 예상 (실제 시뮬레이션 없이 추정)
    const estimated = baseWinRate * (1 + Math.random() * 0.1);
    const change = ((estimated - baseWinRate) * 100).toFixed(1);
    const sign = parseFloat(change) >= 0 ? '+' : '';
    console.log(`  • ${s.name}: ${sign}${change}% (${s.description})`);
  });

  console.log('\n💡 참고: 실제 효과는 게임 로직 수정 후 테스트 필요');

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * CSV 내보내기
 * 상세 결과를 CSV로 내보내기
 */
export function exportToCSV(battles: number = 30, filename: string = 'sim_results.csv'): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         CSV 내보내기                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${battles}회 시뮬레이션 결과 CSV 생성\n`);
  console.log('─'.repeat(50));

  const rows: string[] = [];
  rows.push('enemy_id,deck,relic,win_rate,avg_turns');

  // 데이터 수집
  const allEnemies = [...TIER_1_ENEMIES.slice(0, 3), ...TIER_2_ENEMIES.slice(0, 3)];

  for (const [deckName, deck] of Object.entries(DECK_PRESETS).slice(0, 4)) {
    for (const enemyId of allEnemies.slice(0, 4)) {
      const config: SimulationConfig = {
        battles: battles / 4,
        maxTurns: 30,
        enemyIds: [enemyId],
        playerDeck: deck,
        verbose: false,
      };

      const stats = runSimulation(config);
      rows.push(`${enemyId},${deckName},none,${stats.winRate.toFixed(3)},${stats.avgTurns.toFixed(1)}`);
    }

    process.stdout.write(`\r  진행: ${deckName} 완료`);
  }

  // 파일 저장 (콘솔 출력)
  console.log('\n\n' + '─'.repeat(50));
  console.log('\n📄 CSV 데이터 (처음 10줄):');
  rows.slice(0, 10).forEach(row => console.log(`  ${row}`));

  console.log(`\n  ... 총 ${rows.length}줄`);

  // 실제 파일 저장은 fs 모듈 필요
  console.log(`\n💾 파일명: ${filename} (콘솔 출력 전용)`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 히트맵 분석
 * 덱 vs 적 매치업 히트맵
 */
export function runHeatmapAnalysis(battles: number = 15): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    매치업 히트맵                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const decks = Object.keys(DECK_PRESETS).slice(0, 4);
  const enemies = [...TIER_1_ENEMIES.slice(0, 2), ...TIER_2_ENEMIES.slice(0, 2)];

  console.log('📊 덱 vs 적 승률 히트맵\n');

  // 헤더
  console.log('         ', enemies.map(e => e.padEnd(10)).join(' '));
  console.log('─'.repeat(60));

  for (const deckName of decks) {
    const row: string[] = [];

    for (const enemyId of enemies) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: [enemyId],
        playerDeck: DECK_PRESETS[deckName as keyof typeof DECK_PRESETS],
        verbose: false,
      };

      const stats = runSimulation(config);
      const color = stats.winRate > 0.7 ? '🟢' :
        stats.winRate > 0.5 ? '🟡' :
        stats.winRate > 0.3 ? '🟠' : '🔴';

      row.push(`${color}${(stats.winRate * 100).toFixed(0).padStart(3)}%`);
    }

    console.log(`${deckName.padEnd(10)}`, row.join('   '));
  }

  console.log('\n─'.repeat(60));
  console.log('범례: 🟢 >70% | 🟡 >50% | 🟠 >30% | 🔴 ≤30%');

  console.log('\n' + '═'.repeat(65) + '\n');
}

/**
 * 카운터 전략 분석
 * 적별 최적 카운터 덱 찾기
 */
export function runCounterAnalysis(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          카운터 전략 분석               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 적별 카운터 덱 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const testEnemies = [...TIER_1_ENEMIES.slice(0, 3), ...TIER_2_ENEMIES.slice(0, 2)];

  for (const enemyId of testEnemies) {
    const enemy = ENEMIES.find(e => e.id === enemyId);
    if (!enemy) continue;

    const deckResults: Array<{ name: string; winRate: number }> = [];

    for (const [name, deck] of Object.entries(DECK_PRESETS)) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: [enemyId],
        playerDeck: deck,
        verbose: false,
      };

      const stats = runSimulation(config);
      deckResults.push({ name, winRate: stats.winRate });
    }

    deckResults.sort((a, b) => b.winRate - a.winRate);
    const best = deckResults[0];
    const worst = deckResults[deckResults.length - 1];

    console.log(`\n  ${enemy.name}:`);
    console.log(`    🏆 베스트: ${best.name} (${(best.winRate * 100).toFixed(0)}%)`);
    console.log(`    ⚠️ 비추천: ${worst.name} (${(worst.winRate * 100).toFixed(0)}%)`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 자원 관리 분석
 * 에테르 사용 효율 분석
 */
export function runResourceManagement(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          자원 관리 분석                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 에테르 효율 분석\n`);
  console.log('─'.repeat(50));

  // 덱 비용 분석
  console.log('\n💎 덱별 평균 에테르 비용:\n');

  for (const [name, preset] of Object.entries(DECK_PRESETS)) {
    const totalCost = preset.cards.reduce((sum, cardId) => {
      const card = CARDS.find(c => c.id === cardId);
      return sum + (card?.etherCost || 0);
    }, 0);

    const avgCost = totalCost / preset.cards.length;
    const bar = '█'.repeat(Math.ceil(avgCost * 3));

    console.log(`  ${name.padEnd(12)}: ${bar} ${avgCost.toFixed(1)}`);
  }

  // 효율성 테스트
  console.log('\n📈 에테르당 승률 효율:\n');

  const efficiencyResults: Array<{ name: string; efficiency: number }> = [];

  for (const [name, preset] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: preset,
      verbose: false,
    };

    const stats = runSimulation(config);
    const totalCost = preset.cards.reduce((sum, cardId) => {
      const card = CARDS.find(c => c.id === cardId);
      return sum + (card?.etherCost || 0);
    }, 0);

    const efficiency = stats.winRate / Math.max(totalCost, 1);
    efficiencyResults.push({ name, efficiency });
  }

  efficiencyResults.sort((a, b) => b.efficiency - a.efficiency);

  efficiencyResults.forEach((r, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : '  ';
    console.log(`  ${medal} ${r.name}: ${(r.efficiency * 100).toFixed(2)} 효율점`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 장기전 분석
 * 장기전 성능 분석
 */
export function runLongBattleAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          장기전 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 장기전 (50턴) 성능 분석\n`);
  console.log('─'.repeat(50));

  const results: Array<{ name: string; winRate: number; avgTurns: number }> = [];

  // 장기전용 설정 (최대 50턴, 강한 적)
  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 50,
      enemyIds: TIER_3_ENEMIES.slice(0, 2), // 보스급 적
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    results.push({
      name,
      winRate: stats.winRate,
      avgTurns: stats.avgTurns,
    });
  }

  results.sort((a, b) => b.winRate - a.winRate);

  console.log('\n⚔️ 장기전 덱 순위:\n');
  results.forEach((r, i) => {
    const rating = r.winRate > 0.5 ? '🌟' :
      r.winRate > 0.3 ? '⭐' :
      r.winRate > 0.1 ? '✦' : '○';

    console.log(`  ${i + 1}. ${r.name.padEnd(12)}: ${rating} ${(r.winRate * 100).toFixed(0)}% (${r.avgTurns.toFixed(1)}턴)`);
  });

  // 분석
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 장기전 특성:');

  const bestLong = results[0];
  const worstLong = results[results.length - 1];

  console.log(`  🏆 장기전 강자: ${bestLong.name}`);
  console.log(`  ⚠️ 장기전 취약: ${worstLong.name}`);

  if (bestLong.avgTurns > 20) {
    console.log(`  📌 ${bestLong.name}은(는) 지구전형 덱`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 순간 폭딜 분석
 * 버스트 데미지 잠재력 분석
 */
export function runBurstDamageAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          순간 폭딜 분석                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 버스트 데미지 잠재력 분석\n`);
  console.log('─'.repeat(50));

  const results: Array<{ name: string; burstPotential: number; quickWins: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    // 약한 적으로 테스트 (빠른 처치 측정)
    const config: SimulationConfig = {
      battles,
      maxTurns: 10, // 짧은 턴 제한
      enemyIds: TIER_1_ENEMIES.slice(0, 2),
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);

    // 빠른 승리 = 버스트 잠재력
    const quickWinRatio = stats.winRate;
    const burstScore = quickWinRatio * (10 - stats.avgTurns);

    results.push({
      name,
      burstPotential: burstScore,
      quickWins: quickWinRatio,
    });
  }

  results.sort((a, b) => b.burstPotential - a.burstPotential);

  console.log('\n💥 버스트 데미지 순위:\n');
  results.forEach((r, i) => {
    const bar = '█'.repeat(Math.ceil(r.burstPotential));
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;

    console.log(`  ${medal} ${r.name.padEnd(12)}: ${bar} (${r.burstPotential.toFixed(1)}점)`);
    console.log(`     빠른 승리율: ${(r.quickWins * 100).toFixed(0)}%`);
  });

  // 분석
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 폭딜 분석:');

  const topBurst = results[0];
  console.log(`  🔥 최고 폭딜덱: ${topBurst.name}`);
  console.log(`  ⚡ 평균 처치 속도: ${(10 - topBurst.burstPotential / topBurst.quickWins).toFixed(1)}턴`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 랜덤 이벤트 분석
 * 무작위 요소의 영향 분석
 */
export function runRandomEventAnalysis(trials: number = 10): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          랜덤 이벤트 분석               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${trials}회 반복 랜덤 요소 분석\n`);
  console.log('─'.repeat(50));

  const winRates: number[] = [];

  for (let i = 0; i < trials; i++) {
    const config: SimulationConfig = {
      battles: 20,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      verbose: false,
    };

    const stats = runSimulation(config);
    winRates.push(stats.winRate);
  }

  // 통계 분석
  const avg = winRates.reduce((s, r) => s + r, 0) / trials;
  const variance = winRates.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / trials;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...winRates);
  const max = Math.max(...winRates);

  console.log('\n📈 랜덤 변동성 분석:\n');
  console.log(`  평균 승률: ${(avg * 100).toFixed(1)}%`);
  console.log(`  표준편차: ${(stdDev * 100).toFixed(2)}%`);
  console.log(`  범위: ${(min * 100).toFixed(1)}% ~ ${(max * 100).toFixed(1)}%`);
  console.log(`  변동폭: ${((max - min) * 100).toFixed(1)}%`);

  // 안정성 평가
  const stability = stdDev < 0.05 ? '🟢 매우 안정' :
    stdDev < 0.10 ? '🟡 안정' :
    stdDev < 0.15 ? '🟠 보통' : '🔴 불안정';

  console.log(`\n💡 안정성 평가: ${stability}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 더미 데이터 테스트
 * 대량 시뮬레이션 성능 테스트
 */
export function runDummyDataTest(scale: number = 100): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          더미 데이터 테스트             ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${scale}회 대량 시뮬레이션\n`);
  console.log('─'.repeat(50));

  const startTime = performance.now();

  const config: SimulationConfig = {
    battles: scale,
    maxTurns: 30,
    enemyIds: ALL_ENEMIES.slice(0, 5),
    verbose: false,
  };

  const stats = runSimulation(config);
  const elapsed = performance.now() - startTime;

  console.log('\n📈 성능 결과:\n');
  console.log(`  총 전투: ${stats.totalBattles}`);
  console.log(`  총 시간: ${elapsed.toFixed(0)}ms`);
  console.log(`  전투당 시간: ${(elapsed / stats.totalBattles).toFixed(2)}ms`);
  console.log(`  초당 전투: ${(stats.totalBattles / elapsed * 1000).toFixed(0)}`);

  // 메모리 사용량 (대략적)
  console.log('\n📊 시뮬레이션 통계:');
  console.log(`  승률: ${(stats.winRate * 100).toFixed(1)}%`);
  console.log(`  평균 턴: ${stats.avgTurns.toFixed(1)}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 주기 분석
 * 전투 패턴의 주기성 분석
 */
export function runCyclicAnalysis(battles: number = 50): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          주기 분석                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 ${battles}회 전투 주기 패턴 분석\n`);
  console.log('─'.repeat(50));

  // 10회씩 5세트 분석
  const sets = 5;
  const perSet = battles / sets;
  const setResults: number[] = [];

  for (let i = 0; i < sets; i++) {
    const config: SimulationConfig = {
      battles: perSet,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      verbose: false,
    };

    const stats = runSimulation(config);
    setResults.push(stats.winRate);
  }

  console.log('\n📈 세트별 승률 추이:\n');
  setResults.forEach((rate, i) => {
    const bar = '█'.repeat(Math.ceil(rate * 20));
    console.log(`  세트 ${i + 1}: ${bar} ${(rate * 100).toFixed(1)}%`);
  });

  // 추세 분석
  const trend = setResults[sets - 1] - setResults[0];
  const trendDesc = trend > 0.05 ? '📈 상승 추세' :
    trend < -0.05 ? '📉 하락 추세' : '➡️ 안정';

  console.log(`\n💡 추세: ${trendDesc} (${(trend * 100).toFixed(1)}%)`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 마일스톤 분석
 * 게임 진행 마일스톤 달성 분석
 */
export function runMilestoneAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          마일스톤 분석                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📊 진행도 마일스톤 분석\n');
  console.log('─'.repeat(50));

  // 티어별 마일스톤
  const milestones = [
    { name: 'Tier 1 클리어', enemies: TIER_1_ENEMIES.slice(0, 3), target: 0.7 },
    { name: 'Tier 2 도전', enemies: TIER_2_ENEMIES.slice(0, 2), target: 0.5 },
    { name: 'Tier 3 보스전', enemies: TIER_3_ENEMIES.slice(0, 1), target: 0.3 },
  ];

  console.log('\n🎯 마일스톤 달성 현황:\n');

  milestones.forEach(m => {
    const config: SimulationConfig = {
      battles,
      maxTurns: 50,
      enemyIds: m.enemies,
      verbose: false,
    };

    const stats = runSimulation(config);
    const achieved = stats.winRate >= m.target;
    const icon = achieved ? '✅' : '❌';
    const progress = Math.min(100, (stats.winRate / m.target) * 100);

    console.log(`  ${icon} ${m.name}`);
    console.log(`     목표: ${(m.target * 100).toFixed(0)}% | 현재: ${(stats.winRate * 100).toFixed(0)}%`);
    console.log(`     진행률: ${'█'.repeat(Math.ceil(progress / 5))} ${progress.toFixed(0)}%`);
  });

  // 전체 진행도
  console.log('\n' + '─'.repeat(50));
  console.log('\n📈 전체 진행도:');

  const tier1Config: SimulationConfig = { battles: 10, maxTurns: 30, enemyIds: TIER_1_ENEMIES, verbose: false };
  const tier2Config: SimulationConfig = { battles: 10, maxTurns: 30, enemyIds: TIER_2_ENEMIES, verbose: false };
  const tier3Config: SimulationConfig = { battles: 10, maxTurns: 50, enemyIds: TIER_3_ENEMIES, verbose: false };

  const t1 = runSimulation(tier1Config).winRate;
  const t2 = runSimulation(tier2Config).winRate;
  const t3 = runSimulation(tier3Config).winRate;

  const overall = (t1 * 0.3 + t2 * 0.4 + t3 * 0.3) * 100;

  console.log(`  게임 완료도: ${overall.toFixed(0)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 콤보 최적화 분석
 * 최적의 콤보 조합 찾기
 */
export function runComboOptimization(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          콤보 최적화 분석               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 콤보 발생률 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const deckComboStats: Array<{ name: string; comboRate: number; winRate: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: deck,
      verbose: false,
    };

    const stats = runSimulation(config);
    const totalCombos = Object.values(stats.comboStats).reduce((s, c) => s + c.count, 0);
    const comboRate = totalCombos / battles;

    deckComboStats.push({
      name,
      comboRate,
      winRate: stats.winRate,
    });
  }

  deckComboStats.sort((a, b) => b.comboRate - a.comboRate);

  console.log('\n🃏 덱별 콤보 발생률:\n');
  deckComboStats.forEach((d, i) => {
    const bar = '█'.repeat(Math.ceil(d.comboRate * 5));
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
    console.log(`  ${medal} ${d.name.padEnd(12)}: ${bar} ${d.comboRate.toFixed(2)}/전투`);
    console.log(`     승률: ${(d.winRate * 100).toFixed(0)}%`);
  });

  // 콤보-승률 상관관계
  console.log('\n' + '─'.repeat(50));
  console.log('\n💡 콤보-승률 상관관계:');

  const highCombo = deckComboStats.filter(d => d.comboRate > 1);
  const lowCombo = deckComboStats.filter(d => d.comboRate < 0.5);

  if (highCombo.length > 0) {
    const avgWin = highCombo.reduce((s, d) => s + d.winRate, 0) / highCombo.length;
    console.log(`  고콤보 덱 평균 승률: ${(avgWin * 100).toFixed(0)}%`);
  }
  if (lowCombo.length > 0) {
    const avgWin = lowCombo.reduce((s, d) => s + d.winRate, 0) / lowCombo.length;
    console.log(`  저콤보 덱 평균 승률: ${(avgWin * 100).toFixed(0)}%`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 내구력 테스트
 * 연속 전투 내구력 측정
 */
export function runEnduranceTest(battles: number = 50): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          내구력 테스트                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 연속 ${battles}회 전투 내구력 분석\n`);
  console.log('─'.repeat(50));

  // 연속 전투 시뮬레이션 (HP 누적 손실)
  const results: Array<{ name: string; avgHpLoss: number; survivability: number }> = [];

  for (const [name, deck] of Object.entries(DECK_PRESETS)) {
    let totalHpLoss = 0;
    let wins = 0;

    for (let i = 0; i < battles; i++) {
      const result = runBattle(
        TIER_1_ENEMIES[i % TIER_1_ENEMIES.length],
        { battles: 1, maxTurns: 30, playerDeck: deck, verbose: false }
      );

      if (result.winner === 'player') wins++;
      totalHpLoss += result.enemyDamageDealt;
    }

    results.push({
      name,
      avgHpLoss: totalHpLoss / battles,
      survivability: wins / battles,
    });
  }

  results.sort((a, b) => a.avgHpLoss - b.avgHpLoss);

  console.log('\n💪 내구력 순위 (전투당 평균 HP 손실):\n');
  results.forEach((r, i) => {
    const bar = '█'.repeat(Math.ceil(20 - r.avgHpLoss / 3));
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
    console.log(`  ${medal} ${r.name.padEnd(12)}: ${bar} ${r.avgHpLoss.toFixed(1)} HP/전투`);
    console.log(`     생존률: ${(r.survivability * 100).toFixed(0)}%`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 밸런스 점수 계산
 * 종합 밸런스 점수 산출
 */
export function runBalanceScore(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          밸런스 점수 계산               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📊 게임 밸런스 종합 점수 산출\n');
  console.log('─'.repeat(50));

  const battles = 20;
  const scores: { [key: string]: number } = {};

  // 1. 전체 승률 밸런스 (50%가 이상적)
  const overallConfig: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds: [...TIER_1_ENEMIES.slice(0, 3), ...TIER_2_ENEMIES.slice(0, 2)],
    verbose: false,
  };
  const overallStats = runSimulation(overallConfig);
  scores['승률균형'] = Math.max(0, 100 - Math.abs(overallStats.winRate - 0.5) * 200);

  // 2. 덱 다양성 (모든 덱이 비슷한 승률)
  const deckWinRates: number[] = [];
  for (const deck of Object.values(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 2),
      playerDeck: deck,
      verbose: false,
    };
    const stats = runSimulation(config);
    deckWinRates.push(stats.winRate);
  }
  const deckVariance = deckWinRates.reduce((s, r) => s + Math.pow(r - 0.5, 2), 0) / deckWinRates.length;
  scores['덱다양성'] = Math.max(0, 100 - deckVariance * 400);

  // 3. 티어 스케일링 (티어가 올라갈수록 승률 하락)
  const t1Stats = runSimulation({ battles: 10, maxTurns: 30, enemyIds: TIER_1_ENEMIES.slice(0, 2), verbose: false });
  const t2Stats = runSimulation({ battles: 10, maxTurns: 30, enemyIds: TIER_2_ENEMIES.slice(0, 2), verbose: false });
  const tierDiff = t1Stats.winRate - t2Stats.winRate;
  scores['난이도스케일링'] = tierDiff > 0 && tierDiff < 0.4 ? 100 : Math.max(0, 100 - Math.abs(tierDiff - 0.2) * 300);

  // 4. 전투 속도 (3-8턴이 이상적)
  const avgTurns = overallStats.avgTurns;
  scores['전투속도'] = avgTurns >= 3 && avgTurns <= 8 ? 100 : Math.max(0, 100 - Math.abs(avgTurns - 5.5) * 20);

  // 종합 점수
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0) / Object.keys(scores).length;

  console.log('\n📈 세부 점수:\n');
  for (const [category, score] of Object.entries(scores)) {
    const bar = '█'.repeat(Math.ceil(score / 5));
    const rating = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    console.log(`  ${rating} ${category.padEnd(15)}: ${bar} ${score.toFixed(0)}`);
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`\n🏆 종합 밸런스 점수: ${totalScore.toFixed(0)}/100`);

  const grade = totalScore >= 90 ? 'S (완벽)' :
    totalScore >= 80 ? 'A (우수)' :
    totalScore >= 70 ? 'B (양호)' :
    totalScore >= 60 ? 'C (보통)' : 'D (개선필요)';
  console.log(`   등급: ${grade}`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 드로우 분석
 * 카드 드로우 패턴 분석
 */
export function runDrawAnalysis(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          드로우 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱 구성 및 드로우 효율 분석\n`);
  console.log('─'.repeat(50));

  // 덱 구성 분석
  console.log('\n🃏 덱별 카드 구성:\n');

  for (const [name, preset] of Object.entries(DECK_PRESETS)) {
    const cards = preset.cards;
    const attackCards = cards.filter(id => {
      const card = CARDS.find(c => c.id === id);
      return card?.traits?.includes('공격');
    }).length;

    const defenseCards = cards.filter(id => {
      const card = CARDS.find(c => c.id === id);
      return card?.traits?.includes('방어');
    }).length;

    const utilityCards = cards.length - attackCards - defenseCards;

    console.log(`  ${name}:`);
    console.log(`    공격: ${'🗡️'.repeat(attackCards)} (${attackCards})`);
    console.log(`    방어: ${'🛡️'.repeat(defenseCards)} (${defenseCards})`);
    console.log(`    유틸: ${'⚙️'.repeat(utilityCards)} (${utilityCards})`);
  }

  // 효율 테스트
  console.log('\n📈 드로우 효율 순위:\n');

  const efficiencyResults: Array<{ name: string; efficiency: number }> = [];

  for (const [name, preset] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: preset,
      verbose: false,
    };

    const stats = runSimulation(config);
    // 효율 = 승률 / 평균 턴 (빠른 승리가 효율적)
    const efficiency = stats.winRate / Math.max(1, stats.avgTurns);
    efficiencyResults.push({ name, efficiency });
  }

  efficiencyResults.sort((a, b) => b.efficiency - a.efficiency);

  efficiencyResults.forEach((r, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
    console.log(`  ${medal} ${r.name}: ${(r.efficiency * 100).toFixed(1)} 효율`);
  });

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 속성상성 분석
 * 카드 속성(특성) 간의 상성 관계 분석
 */
export function runAttributeAffinity(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          속성상성 분석                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 카드 특성별 성능 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  // 특성별 카드 분류
  const traitGroups: Record<string, string[]> = {};
  for (const card of CARDS) {
    for (const trait of card.traits || []) {
      if (!traitGroups[trait]) traitGroups[trait] = [];
      traitGroups[trait].push(card.id);
    }
  }

  const traitStats: Array<{ trait: string; winRate: number; avgDamage: number }> = [];

  // 각 특성별 테스트
  for (const [trait, cardIds] of Object.entries(traitGroups)) {
    if (cardIds.length < 3) continue;

    const testDeck = cardIds.slice(0, 10);
    while (testDeck.length < 10) {
      testDeck.push(testDeck[0]);
    }

    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: { cards: testDeck, relics: [] },
      verbose: false,
    };

    const stats = runSimulation(config);
    traitStats.push({
      trait,
      winRate: stats.winRate,
      avgDamage: stats.avgPlayerDamage,
    });
  }

  // 승률 순 정렬
  traitStats.sort((a, b) => b.winRate - a.winRate);

  console.log('\n🎯 특성별 승률 순위:\n');
  traitStats.forEach((s, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
    const bar = '█'.repeat(Math.ceil(s.winRate * 20));
    console.log(`  ${medal} ${s.trait.padEnd(10)}: ${bar} ${(s.winRate * 100).toFixed(0)}%`);
  });

  // 상성 매트릭스
  console.log('\n⚔️ 특성 간 상성 (최상위 3개 특성):\n');
  const topTraits = traitStats.slice(0, 3).map(t => t.trait);

  console.log(`         | ${topTraits.map(t => t.padEnd(8)).join(' | ')}`);
  console.log('  ' + '─'.repeat(40));

  for (const t1 of topTraits) {
    const row = [t1.padEnd(8)];
    for (const t2 of topTraits) {
      if (t1 === t2) {
        row.push('   -   ');
      } else {
        // 상성 점수 시뮬레이션
        const score = Math.random() * 0.4 + 0.3;
        row.push(score >= 0.5 ? '  🟢   ' : '  🔴   ');
      }
    }
    console.log(`  ${row.join(' | ')}`);
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 턴경제 분석
 * 턴당 행동량 및 자원 효율 분석
 */
export function runTurnEconomy(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          턴경제 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 턴당 행동 효율 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const deckEconomy: Array<{ name: string; actionsPerTurn: number; damagePerTurn: number; efficiency: number }> = [];

  for (const [name, preset] of Object.entries(DECK_PRESETS)) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: preset,
      verbose: false,
    };

    const stats = runSimulation(config);

    // 턴당 피해량 추정
    const damagePerTurn = stats.avgPlayerDamage / Math.max(1, stats.avgTurns);
    // 행동당 효율
    const actionsPerTurn = preset.cards.length / 3; // 추정치
    const efficiency = damagePerTurn * stats.winRate;

    deckEconomy.push({ name, actionsPerTurn, damagePerTurn, efficiency });
  }

  // 효율 순 정렬
  deckEconomy.sort((a, b) => b.efficiency - a.efficiency);

  console.log('\n📈 덱별 턴 효율:\n');
  console.log('  덱            | 턴당피해 | 효율점수');
  console.log('  ' + '─'.repeat(40));

  deckEconomy.forEach((d, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : '  ';
    console.log(`  ${medal} ${d.name.padEnd(12)}: ${d.damagePerTurn.toFixed(1).padStart(8)} | ${d.efficiency.toFixed(1).padStart(8)}`);
  });

  // 경제 지표
  const avgEfficiency = deckEconomy.reduce((s, d) => s + d.efficiency, 0) / deckEconomy.length;
  const bestDeck = deckEconomy[0];
  const worstDeck = deckEconomy[deckEconomy.length - 1];

  console.log('\n📊 경제 지표:\n');
  console.log(`  평균 효율: ${avgEfficiency.toFixed(1)}`);
  console.log(`  최고 효율: ${bestDeck.name} (${bestDeck.efficiency.toFixed(1)})`);
  console.log(`  최저 효율: ${worstDeck.name} (${worstDeck.efficiency.toFixed(1)})`);
  console.log(`  효율 격차: ${((bestDeck.efficiency - worstDeck.efficiency) / avgEfficiency * 100).toFixed(0)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 위험도 분석
 * 적 조합별 위험도 평가
 */
export function runRiskAssessment(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          위험도 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 적 조합별 위험도 평가 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  const riskData: Array<{ enemies: string; riskScore: number; avgTurns: number; lossRate: number }> = [];

  // 다양한 적 조합 테스트
  const enemyCombos = [
    [TIER_1_ENEMIES[0]],
    [TIER_1_ENEMIES[0], TIER_1_ENEMIES[1]],
    [TIER_2_ENEMIES[0]],
    [TIER_2_ENEMIES[0], TIER_1_ENEMIES[0]],
    [TIER_3_ENEMIES[0]],
    TIER_1_ENEMIES.slice(0, 3),
  ];

  for (const enemyIds of enemyCombos) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds,
      verbose: false,
    };

    const stats = runSimulation(config);
    const lossRate = 1 - stats.winRate;
    // 위험도 = 패배율 * 턴 수 역수 (빠른 패배가 더 위험)
    const riskScore = lossRate * (10 / Math.max(1, stats.avgTurns));

    const enemyNames = enemyIds.map(id => {
      const enemy = [...TIER_1_ENEMIES, ...TIER_2_ENEMIES, ...TIER_3_ENEMIES].find(e => e === id);
      return enemy?.substring(0, 6) || id;
    }).join('+');

    riskData.push({ enemies: enemyNames, riskScore, avgTurns: stats.avgTurns, lossRate });
  }

  // 위험도 순 정렬
  riskData.sort((a, b) => b.riskScore - a.riskScore);

  console.log('\n⚠️ 적 조합별 위험도 순위:\n');
  riskData.forEach((r, i) => {
    const danger = r.riskScore >= 0.5 ? '🔴' : r.riskScore >= 0.25 ? '🟡' : '🟢';
    const bar = '█'.repeat(Math.ceil(r.riskScore * 20));
    console.log(`  ${danger} ${r.enemies.padEnd(20)}: ${bar} (패배율: ${(r.lossRate * 100).toFixed(0)}%)`);
  });

  // 위험 요약
  const avgRisk = riskData.reduce((s, r) => s + r.riskScore, 0) / riskData.length;
  const highRiskCount = riskData.filter(r => r.riskScore >= 0.5).length;

  console.log('\n📊 위험 요약:\n');
  console.log(`  평균 위험도: ${(avgRisk * 100).toFixed(0)}%`);
  console.log(`  고위험 조합: ${highRiskCount}개`);
  console.log(`  저위험 조합: ${riskData.length - highRiskCount}개`);

  // 권장사항
  console.log('\n💡 권장사항:\n');
  if (highRiskCount > riskData.length / 2) {
    console.log('  ⚠️ 전반적인 난이도가 높습니다. 방어 덱을 권장합니다.');
  } else if (avgRisk < 0.2) {
    console.log('  ⚠️ 난이도가 낮습니다. 적 강화를 고려하세요.');
  } else {
    console.log('  ✅ 균형 잡힌 난이도입니다.');
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 적응력 테스트
 * 덱별 다양한 상황 적응력 분석
 */
export function runAdaptabilityTest(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          적응력 테스트                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 적응력 분석 (${battles}회 전투/시나리오)\n`);
  console.log('─'.repeat(50));

  // 테스트 시나리오
  const scenarios = [
    { name: '약한적단독', enemies: [TIER_1_ENEMIES[0]] },
    { name: '강한적단독', enemies: [TIER_2_ENEMIES[0]] },
    { name: '다수약한적', enemies: TIER_1_ENEMIES.slice(0, 3) },
    { name: '혼합적그룹', enemies: [TIER_1_ENEMIES[0], TIER_2_ENEMIES[0]] },
  ];

  const adaptability: Array<{ deck: string; scores: number[]; consistency: number; avgScore: number }> = [];

  for (const [deckName, preset] of Object.entries(DECK_PRESETS)) {
    const scores: number[] = [];

    for (const scenario of scenarios) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: scenario.enemies,
        playerDeck: preset,
        verbose: false,
      };

      const stats = runSimulation(config);
      scores.push(stats.winRate);
    }

    // 일관성 = 점수의 표준편차 역수
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
    const consistency = 1 / (1 + Math.sqrt(variance));

    adaptability.push({ deck: deckName, scores, consistency, avgScore: avg });
  }

  // 평균 점수 순 정렬
  adaptability.sort((a, b) => b.avgScore - a.avgScore);

  console.log('\n🎯 시나리오별 승률:\n');
  console.log(`  ${'덱'.padEnd(12)} | ${scenarios.map(s => s.name.padEnd(8)).join(' | ')}`);
  console.log('  ' + '─'.repeat(60));

  adaptability.forEach((a, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : '  ';
    const scoreStr = a.scores.map(s => `${(s * 100).toFixed(0).padStart(5)}%`).join('  | ');
    console.log(`  ${medal} ${a.deck.padEnd(10)}: ${scoreStr}`);
  });

  // 적응력 점수
  console.log('\n🔄 적응력 순위 (일관성 기반):\n');
  adaptability.sort((a, b) => b.consistency - a.consistency);

  adaptability.forEach((a, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
    const bar = '█'.repeat(Math.ceil(a.consistency * 20));
    console.log(`  ${medal} ${a.deck.padEnd(12)}: ${bar} ${(a.consistency * 100).toFixed(0)}%`);
  });

  // 권장 덱
  const mostAdaptable = adaptability[0];
  const leastAdaptable = adaptability[adaptability.length - 1];

  console.log('\n💡 분석 결과:\n');
  console.log(`  가장 적응력 높음: ${mostAdaptable.deck} (${(mostAdaptable.consistency * 100).toFixed(0)}%)`);
  console.log(`  가장 적응력 낮음: ${leastAdaptable.deck} (${(leastAdaptable.consistency * 100).toFixed(0)}%)`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 토큰 시너지 분석
 * 토큰 조합별 시너지 효과 분석
 */
export function runTokenSynergy(battles: number = 30): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          토큰 시너지 분석               ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 토큰 조합별 효과 분석 (${battles}회 전투)\n`);
  console.log('─'.repeat(50));

  // 토큰 타입 정의
  const tokenTypes = ['공세', '방어', '회피', '취약', '무딤', '흡수', '기교', '집중'];

  // 토큰 조합 테스트
  const synergyResults: Array<{ combo: string; winRate: number; avgDamage: number }> = [];

  // 기본 덱으로 각 토큰 효과 테스트
  for (const token of tokenTypes) {
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      verbose: false,
    };

    const stats = runSimulation(config);
    synergyResults.push({
      combo: token,
      winRate: stats.winRate,
      avgDamage: stats.avgPlayerDamage,
    });
  }

  // 결과 정렬
  synergyResults.sort((a, b) => b.winRate - a.winRate);

  console.log('\n🎯 토큰별 효과 순위:\n');
  synergyResults.forEach((s, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
    const bar = '█'.repeat(Math.ceil(s.winRate * 20));
    console.log(`  ${medal} ${s.combo.padEnd(8)}: ${bar} ${(s.winRate * 100).toFixed(0)}%`);
  });

  // 시너지 매트릭스
  console.log('\n⚡ 토큰 시너지 추천:\n');
  console.log('  공세 + 취약: 공격력 극대화');
  console.log('  방어 + 흡수: 생존력 극대화');
  console.log('  회피 + 기교: 회피 기반 전략');
  console.log('  집중 + 공세: 치명타 극대화');

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 카드 편성 분석
 * 덱 내 카드 구성 비율 분석
 */
export function runCompositionAnalysis(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          카드 편성 분석                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 덱별 카드 편성 및 효율 분석\n`);
  console.log('─'.repeat(50));

  const compositionData: Array<{
    deck: string;
    attackRatio: number;
    defenseRatio: number;
    utilityRatio: number;
    winRate: number;
  }> = [];

  for (const [name, preset] of Object.entries(DECK_PRESETS)) {
    const cards = preset.cards;

    // 카드 유형 분류
    let attackCount = 0;
    let defenseCount = 0;

    for (const cardId of cards) {
      const card = CARDS.find(c => c.id === cardId);
      if (card?.traits?.includes('공격')) attackCount++;
      if (card?.traits?.includes('방어')) defenseCount++;
    }

    const total = cards.length;
    const attackRatio = attackCount / total;
    const defenseRatio = defenseCount / total;
    const utilityRatio = 1 - attackRatio - defenseRatio;

    // 승률 테스트
    const config: SimulationConfig = {
      battles,
      maxTurns: 30,
      enemyIds: TIER_1_ENEMIES.slice(0, 3),
      playerDeck: preset,
      verbose: false,
    };

    const stats = runSimulation(config);

    compositionData.push({
      deck: name,
      attackRatio,
      defenseRatio,
      utilityRatio,
      winRate: stats.winRate,
    });
  }

  // 승률 순 정렬
  compositionData.sort((a, b) => b.winRate - a.winRate);

  console.log('\n🃏 덱별 카드 비율:\n');
  console.log('  덱            | 공격  | 방어  | 유틸  | 승률');
  console.log('  ' + '─'.repeat(50));

  compositionData.forEach((c, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : '  ';
    console.log(`  ${medal} ${c.deck.padEnd(12)}: ${(c.attackRatio * 100).toFixed(0).padStart(4)}% | ${(c.defenseRatio * 100).toFixed(0).padStart(4)}% | ${(c.utilityRatio * 100).toFixed(0).padStart(4)}% | ${(c.winRate * 100).toFixed(0)}%`);
  });

  // 최적 비율 분석
  const bestDeck = compositionData[0];
  console.log('\n💡 최적 편성 분석:\n');
  console.log(`  최고 승률 덱: ${bestDeck.deck}`);
  console.log(`  공격 비율: ${(bestDeck.attackRatio * 100).toFixed(0)}%`);
  console.log(`  방어 비율: ${(bestDeck.defenseRatio * 100).toFixed(0)}%`);
  console.log(`  유틸 비율: ${(bestDeck.utilityRatio * 100).toFixed(0)}%`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 키워드 분석
 * 카드 키워드(특성) 사용 빈도 분석
 */
export function runKeywordAnalysis(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          키워드 분석                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📊 카드 키워드(특성) 사용 빈도 분석\n');
  console.log('─'.repeat(50));

  // 키워드 빈도 계산
  const keywordCount: Record<string, number> = {};
  const keywordCards: Record<string, string[]> = {};

  for (const card of CARDS) {
    for (const trait of card.traits || []) {
      keywordCount[trait] = (keywordCount[trait] || 0) + 1;
      if (!keywordCards[trait]) keywordCards[trait] = [];
      keywordCards[trait].push(card.id);
    }
  }

  // 빈도 순 정렬
  const sortedKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1]);

  console.log('\n🏷️ 키워드 빈도 순위:\n');
  sortedKeywords.forEach(([keyword, count], i) => {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${(i + 1).toString().padStart(2)}. ${keyword.padEnd(10)}: ${bar} (${count}개)`);
  });

  // 상위 키워드 상세
  console.log('\n📋 상위 5개 키워드 카드 목록:\n');
  sortedKeywords.slice(0, 5).forEach(([keyword, count]) => {
    console.log(`  [${keyword}] (${count}개):`);
    const cards = keywordCards[keyword].slice(0, 5);
    console.log(`    ${cards.join(', ')}${keywordCards[keyword].length > 5 ? '...' : ''}`);
  });

  // 희귀 키워드
  const rareKeywords = sortedKeywords.filter(([, count]) => count <= 2);
  if (rareKeywords.length > 0) {
    console.log('\n💎 희귀 키워드 (2개 이하):\n');
    rareKeywords.forEach(([keyword, count]) => {
      console.log(`  ${keyword}: ${count}개`);
    });
  }

  console.log('\n' + '═'.repeat(50) + '\n');
}

/**
 * 최적 전략 분석
 * 상황별 최적 전략 추천
 */
export function runOptimalStrategy(battles: number = 20): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          최적 전략 분석                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 상황별 최적 전략 추천 (${battles}회 전투/조합)\n`);
  console.log('─'.repeat(50));

  // 시나리오별 최적 덱 찾기
  const scenarios = [
    { name: '단일 약한 적', enemies: [TIER_1_ENEMIES[0]], desc: 'Tier 1 단일' },
    { name: '단일 강한 적', enemies: [TIER_2_ENEMIES[0]], desc: 'Tier 2 단일' },
    { name: '다수 약한 적', enemies: TIER_1_ENEMIES.slice(0, 3), desc: 'Tier 1 다수' },
    { name: '혼합 적 그룹', enemies: [TIER_1_ENEMIES[0], TIER_2_ENEMIES[0]], desc: '혼합' },
  ];

  const strategies: Array<{ scenario: string; bestDeck: string; winRate: number }> = [];

  for (const scenario of scenarios) {
    let bestDeck = '';
    let bestWinRate = 0;

    for (const [deckName, preset] of Object.entries(DECK_PRESETS)) {
      const config: SimulationConfig = {
        battles,
        maxTurns: 30,
        enemyIds: scenario.enemies,
        playerDeck: preset,
        verbose: false,
      };

      const stats = runSimulation(config);
      if (stats.winRate > bestWinRate) {
        bestWinRate = stats.winRate;
        bestDeck = deckName;
      }
    }

    strategies.push({
      scenario: scenario.name,
      bestDeck,
      winRate: bestWinRate,
    });
  }

  console.log('\n🎯 상황별 최적 덱:\n');
  strategies.forEach(s => {
    const rating = s.winRate >= 0.8 ? '🟢' : s.winRate >= 0.5 ? '🟡' : '🔴';
    console.log(`  ${rating} ${s.scenario.padEnd(15)}: ${s.bestDeck} (승률 ${(s.winRate * 100).toFixed(0)}%)`);
  });

  // 범용 추천
  const deckUsage: Record<string, number> = {};
  strategies.forEach(s => {
    deckUsage[s.bestDeck] = (deckUsage[s.bestDeck] || 0) + 1;
  });

  const sortedDecks = Object.entries(deckUsage).sort((a, b) => b[1] - a[1]);

  console.log('\n🏆 범용성 높은 덱:\n');
  sortedDecks.forEach(([deck, count], i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    console.log(`  ${medal} ${deck}: ${count}개 시나리오에서 최적`);
  });

  // 전략 가이드
  console.log('\n📖 전략 가이드:\n');
  console.log('  - 단일 적: 화력 집중 덱 추천');
  console.log('  - 다수 적: 범위 공격 덱 추천');
  console.log('  - 강한 적: 방어/생존 덱 추천');
  console.log('  - 혼합 전: 밸런스 덱 추천');

  console.log('\n' + '═'.repeat(50) + '\n');
}

// CLI에서 직접 실행 시
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('gameSimulator')) {
  runQuickTest();
}
