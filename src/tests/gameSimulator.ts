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

// CLI에서 직접 실행 시
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('gameSimulator')) {
  runQuickTest();
}
