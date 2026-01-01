/**
 * @file card-effects.ts
 * @description 카드 특수 효과(special) 및 교차 보너스(crossBonus) 처리
 *
 * 실제 게임의 모든 카드 효과를 구현합니다.
 */

import type {
  GameCard,
  GameBattleState,
  PlayerState,
  EnemyState,
  TimelineCard,
  TokenState,
} from './game-types';
import { addToken, removeToken, hasToken, getTokenStacks, exhaustCard, type ExhaustState } from './token-system';

// ==================== 특수 효과 결과 ====================

export interface SpecialEffectResult {
  /** 성공 여부 */
  success: boolean;
  /** 적용된 효과 설명 */
  effects: string[];
  /** 상태 변경 */
  stateChanges: {
    playerDamage?: number;
    enemyDamage?: number;
    playerBlock?: number;
    enemyBlock?: number;
    playerHeal?: number;
    enemyHeal?: number;
    playerTokens?: { id: string; stacks: number }[];
    enemyTokens?: { id: string; stacks: number }[];
    timelinePush?: number;
    timelineAdvance?: number;
    extraHits?: number;
    guaranteedCrit?: boolean;
    ignoreBlock?: boolean;
    /** 카드 창조 효과 마커 */
    creationEffect?: string;
    /** 소환된 유닛 ID 목록 */
    summoned?: string[];
    /** 카드 소진 (덱에서 영구 제거) */
    exhaustCard?: boolean;
  };
}

// ==================== 특수 효과 처리기 ====================

type SpecialEffectHandler = (
  state: GameBattleState,
  card: GameCard,
  actor: 'player' | 'enemy',
  timelineCard: TimelineCard
) => SpecialEffectResult;

const SPECIAL_EFFECTS: Record<string, SpecialEffectHandler> = {
  // ==================== 타임라인 조작 ====================

  advanceTimeline: (state, card, actor) => {
    const amount = card.advanceAmount || 4;
    // 내 카드들을 앞당김
    for (const tc of state.timeline) {
      if (tc.owner === actor && !tc.executed) {
        tc.position = Math.max(0, tc.position - amount);
      }
    }
    return {
      success: true,
      effects: [`타임라인 ${amount} 앞당김`],
      stateChanges: { timelineAdvance: amount },
    };
  },

  pushEnemyTimeline: (state, card, actor) => {
    const amount = card.pushAmount || 5;
    const targetOwner = actor === 'player' ? 'enemy' : 'player';
    for (const tc of state.timeline) {
      if (tc.owner === targetOwner && !tc.executed) {
        tc.position = Math.min(30, tc.position + amount);
      }
    }
    return {
      success: true,
      effects: [`적 타임라인 ${amount} 밀기`],
      stateChanges: { timelinePush: amount },
    };
  },

  pushLastEnemyCard: (state, card, actor) => {
    const amount = card.pushAmount || 9;
    const targetOwner = actor === 'player' ? 'enemy' : 'player';
    const enemyCards = state.timeline.filter(tc => tc.owner === targetOwner && !tc.executed);
    if (enemyCards.length > 0) {
      const lastCard = enemyCards[enemyCards.length - 1];
      lastCard.position = Math.min(30, lastCard.position + amount);
    }
    return {
      success: true,
      effects: [`적 마지막 카드 ${amount} 밀기`],
      stateChanges: { timelinePush: amount },
    };
  },

  // ==================== 방어력/공격 특수 ====================

  ignoreBlock: () => {
    return {
      success: true,
      effects: ['방어력 무시'],
      stateChanges: { ignoreBlock: true },
    };
  },

  piercing: () => {
    return {
      success: true,
      effects: ['방어력 무시'],
      stateChanges: { ignoreBlock: true },
    };
  },

  growingDefense: (state, card, actor, timelineCard) => {
    const position = timelineCard.position;
    const bonusBlock = Math.floor(position);
    return {
      success: true,
      effects: [`성장형 방어: +${bonusBlock} 방어력`],
      stateChanges: { playerBlock: bonusBlock },
    };
  },

  // ==================== 치명타/공격 강화 ====================

  guaranteedCrit: () => {
    return {
      success: true,
      effects: ['확정 치명타'],
      stateChanges: { guaranteedCrit: true },
    };
  },

  doubleCrit: () => {
    return {
      success: true,
      effects: ['치명타 확률 2배'],
      stateChanges: {},
    };
  },

  // ==================== 총기 효과 ====================

  causeJam: (state, _card, actor) => {
    const tokens = actor === 'player'
      ? (state.player.tokens = addToken(state.player.tokens, 'gun_jam', 1))
      : (state.enemy.tokens = addToken(state.enemy.tokens, 'gun_jam', 1));
    return {
      success: true,
      effects: ['탄걸림 발생'],
      stateChanges: { playerTokens: [{ id: 'gun_jam', stacks: 1 }] },
    };
  },

  emptyAfterUse: (state, _card, actor) => {
    const tokens = actor === 'player'
      ? (state.player.tokens = addToken(state.player.tokens, 'gun_jam', 1))
      : (state.enemy.tokens = addToken(state.enemy.tokens, 'gun_jam', 1));
    return {
      success: true,
      effects: ['사용 후 탄걸림'],
      stateChanges: { playerTokens: [{ id: 'gun_jam', stacks: 1 }] },
    };
  },

  singleRoulette: () => {
    // 룰렛이 1회만 증가 (hits가 여러번이어도)
    return {
      success: true,
      effects: ['룰렛 1회만 증가'],
      stateChanges: {},
    };
  },

  critLoad: (_state, _card, _actor) => {
    // 치명타시 장전 - processAttack에서 처리됨
    return {
      success: true,
      effects: ['치명타시 장전'],
      stateChanges: {},
    };
  },

  reloadSpray: (state, _card, actor) => {
    // 장전 후 난사 - 장전 효과 먼저
    if (actor === 'player') {
      state.player.tokens = removeToken(state.player.tokens, 'gun_jam', 99);
      state.player.tokens = removeToken(state.player.tokens, 'roulette', 99);
    }
    return {
      success: true,
      effects: ['장전 후 난사'],
      stateChanges: {},
    };
  },

  autoReload: (state, _card, actor) => {
    // 손패에 장전카드 있으면 자동 장전
    const hand = actor === 'player' ? state.player.hand : state.enemy.deck;
    const hasReload = hand.some(id => id.includes('reload') || id.includes('load'));
    if (hasReload && actor === 'player') {
      state.player.tokens = removeToken(state.player.tokens, 'gun_jam', 99);
      state.player.tokens = removeToken(state.player.tokens, 'roulette', 99);
    }
    return {
      success: hasReload,
      effects: hasReload ? ['자동 장전 발동'] : [],
      stateChanges: {},
    };
  },

  // ==================== 회복/버프 ====================

  heal5: (state, _card, actor) => {
    if (actor === 'enemy') {
      state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + 5);
    } else {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
    }
    return {
      success: true,
      effects: ['5 회복'],
      stateChanges: actor === 'player' ? { playerHeal: 5 } : { enemyHeal: 5 },
    };
  },

  fullHeal: (state, _card, actor) => {
    if (actor === 'player') {
      state.player.hp = state.player.maxHp;
    }
    return {
      success: true,
      effects: ['체력 최대 회복'],
      stateChanges: { playerHeal: state.player.maxHp },
    };
  },

  mentalFocus: (state, _card, actor) => {
    // 다음 턴 최대속도 증가, 카드 추가 사용
    if (actor === 'player') {
      state.player.tokens = addToken(state.player.tokens, 'mental_focus', 1);
    }
    return {
      success: true,
      effects: ['다음 턴 최대속도 +8, 카드 +2'],
      stateChanges: { playerTokens: [{ id: 'mental_focus', stacks: 1 }] },
    };
  },

  // ==================== 패리/반격 ====================

  parryPush: (state, card, actor, timelineCard) => {
    const range = card.parryRange || 5;
    const pushAmount = card.parryPushAmount || 3;
    const targetOwner = actor === 'player' ? 'enemy' : 'player';

    let pushed = false;
    for (const tc of state.timeline) {
      if (tc.owner === targetOwner && !tc.executed) {
        const distance = Math.abs(tc.position - timelineCard.position);
        if (distance <= range) {
          tc.position = Math.min(30, tc.position + pushAmount);
          pushed = true;
        }
      }
    }

    return {
      success: pushed,
      effects: pushed ? [`패리: 범위 내 적 카드 ${pushAmount} 밀기`] : [],
      stateChanges: { timelinePush: pushed ? pushAmount : 0 },
    };
  },

  // ==================== 토큰 관련 ====================

  interceptTokens: (state, _card, actor) => {
    const target = actor === 'player' ? state.enemy : state.player;
    target.tokens = addToken(target.tokens, 'dullPlus', 1);
    return {
      success: true,
      effects: ['무딤+ 부여'],
      stateChanges: { enemyTokens: [{ id: 'dullPlus', stacks: 1 }] },
    };
  },

  // ==================== 자해/리스크 ====================

  selfDamage3: (state, _card, actor) => {
    if (actor === 'enemy') {
      state.enemy.hp -= 3;
    } else {
      state.player.hp -= 3;
    }
    return {
      success: true,
      effects: ['자해 3'],
      stateChanges: actor === 'player' ? { playerDamage: 3 } : { enemyDamage: 3 },
    };
  },

  // ==================== 특수 공격 ====================

  aoeAttack: () => {
    // 범위 공격 - 다수의 적에게 피해 (현재는 단일 적)
    return {
      success: true,
      effects: ['범위 공격'],
      stateChanges: {},
    };
  },

  spreadShot: (state) => {
    // 적의 수만큼 사격
    const enemyCount = 1; // 현재는 단일 적
    return {
      success: true,
      effects: [`${enemyCount}회 사격`],
      stateChanges: { extraHits: enemyCount - 1 },
    };
  },

  // ==================== 기교 관련 ====================

  violentMort: (state, _card, actor) => {
    // 체력 30 이하 처형
    if (actor === 'player' && state.enemy.hp <= 30) {
      state.enemy.hp = 0;
      return {
        success: true,
        effects: ['처형 발동! 적 즉사'],
        stateChanges: {},
      };
    }
    return {
      success: false,
      effects: [],
      stateChanges: {},
    };
  },

  hologram: (state, _card, actor) => {
    // 최대 체력만큼 방어력
    if (actor === 'player') {
      state.player.block += state.player.maxHp;
      state.player.tokens = addToken(state.player.tokens, 'vigilance', 1);
    }
    return {
      success: true,
      effects: [`최대 체력(${state.player.maxHp})만큼 방어력 획득`],
      stateChanges: { playerBlock: state.player.maxHp },
    };
  },

  tempeteDechainee: (state, _card, actor) => {
    // 기교 스택만큼 추가 타격
    const finesseStacks = actor === 'player'
      ? getTokenStacks(state.player.tokens, 'finesse')
      : getTokenStacks(state.enemy.tokens, 'finesse');
    const extraHits = finesseStacks * 3;

    // 기교 모두 소모
    if (actor === 'player') {
      state.player.tokens = removeToken(state.player.tokens, 'finesse', finesseStacks);
    }

    return {
      success: true,
      effects: [`기교 ${finesseStacks}스택 소모, ${extraHits}회 추가 타격`],
      stateChanges: { extraHits },
    };
  },

  // ==================== 타임라인 반복 ====================

  repeatTimeline: (state, _card, actor) => {
    // 내 타임라인 반복 (르 송쥬 뒤 비에야르)
    if (actor === 'player') {
      state.player.repeatTimelineNext = true;
      state.player.blockPerCardExecution = 5;
    }
    return {
      success: true,
      effects: ['다음 턴 타임라인 반복, 카드당 방어 5'],
      stateChanges: { repeatTimelineNext: true, blockPerCardExecution: 5 },
    };
  },

  blockPerCard5: () => {
    // 카드 실행마다 방어력 5
    return {
      success: true,
      effects: ['카드당 방어력 5'],
      stateChanges: { playerBlock: 5 },
    };
  },

  // ==================== 소진(Exhaust) 효과 ====================

  exhaust: () => {
    // 카드 소진 - 전투에서 영구 제거
    return {
      success: true,
      effects: ['카드 소진'],
      stateChanges: { exhaustCard: true },
    };
  },

  exhaustOnUse: () => {
    // 사용 후 소진
    return {
      success: true,
      effects: ['사용 후 소진'],
      stateChanges: { exhaustCard: true },
    };
  },

  exhaustRandomCard: (state, _card, actor) => {
    // 손패에서 랜덤 카드 1장 소진
    if (actor === 'player' && state.player.hand.length > 0) {
      const randomIndex = Math.floor(Math.random() * state.player.hand.length);
      const exhaustedCardId = state.player.hand[randomIndex];
      return {
        success: true,
        effects: [`랜덤 카드 소진: ${exhaustedCardId}`],
        stateChanges: { exhaustCard: true },
      };
    }
    return { success: false, effects: [], stateChanges: {} };
  },

  exhaustAndDraw: (state, _card, actor) => {
    // 손패 1장 소진하고 2장 드로우 (Grinder 효과)
    return {
      success: true,
      effects: ['카드 소진 후 2장 드로우'],
      stateChanges: { exhaustCard: true },
    };
  },

  // ==================== 기타 ====================

  stance: (state, _card, actor) => {
    // 부정적 토큰 제거
    if (actor === 'player') {
      const negativeTokens = ['burn', 'poison', 'vulnerable', 'shaken', 'dull', 'exposed'];
      for (const tokenId of negativeTokens) {
        state.player.tokens = removeToken(state.player.tokens, tokenId, 99);
      }
    }
    return {
      success: true,
      effects: ['부정적 토큰 제거'],
      stateChanges: {},
    };
  },

  evasiveShot: (state, _card, actor) => {
    if (actor === 'player') {
      state.player.tokens = addToken(state.player.tokens, 'blur', 1);
    }
    return {
      success: true,
      effects: ['흐릿함 1회 획득'],
      stateChanges: { playerTokens: [{ id: 'blur', stacks: 1 }] },
    };
  },

  beatEffect: (state, card, actor, timelineCard) => {
    // 교차시 피해 2배, 넉백 2
    if (timelineCard.crossed) {
      const pushAmount = card.pushAmount || 2;
      const targetOwner = actor === 'player' ? 'enemy' : 'player';
      for (const tc of state.timeline) {
        if (tc.owner === targetOwner && !tc.executed) {
          tc.position = Math.min(30, tc.position + pushAmount);
        }
      }
    }
    return {
      success: true,
      effects: timelineCard.crossed ? ['비트: 피해 2배, 넉백 2'] : [],
      stateChanges: {},
    };
  },

  // ==================== 대응사격/반격 ====================

  counterShot5: (state, _card, actor) => {
    if (actor === 'player') {
      state.player.tokens = addToken(state.player.tokens, 'counterShot', 5);
    }
    return {
      success: true,
      effects: ['대응사격 5회'],
      stateChanges: { playerTokens: [{ id: 'counterShot', stacks: 5 }] },
    };
  },

  jamImmunity2: (state, _card, actor) => {
    if (actor === 'player') {
      state.player.tokens = addToken(state.player.tokens, 'jam_immunity', 2);
    }
    return {
      success: true,
      effects: ['탄걸림 면역 2턴'],
      stateChanges: { playerTokens: [{ id: 'jam_immunity', stacks: 2 }] },
    };
  },

  knockbackOnHit3: () => {
    // 피해 시 넉백 3 - processAttack에서 처리
    return {
      success: true,
      effects: ['피해시 넉백 3'],
      stateChanges: { timelinePush: 3 },
    };
  },

  onHitBlock7Advance3: () => {
    // 공격당할때마다 방어력 7, 앞당김 3
    return {
      success: true,
      effects: ['피격시 방어력 7, 앞당김 3'],
      stateChanges: { playerBlock: 7, timelineAdvance: 3 },
    };
  },

  elRapide: (state, _card, actor) => {
    // 아픔 1회, 민첩 +2
    if (actor === 'player') {
      state.player.tokens = addToken(state.player.tokens, 'pain', 1);
      state.player.agility = (state.player.agility || 0) + 2;
    }
    return {
      success: true,
      effects: ['아픔 1회, 민첩 +2'],
      stateChanges: { playerTokens: [{ id: 'pain', stacks: 1 }] },
    };
  },

  gyrusRoulette: (state, _card, actor) => {
    // 남은 행동력에 비례해 사격
    const energy = actor === 'player' ? state.player.energy : 3;
    const hits = energy;
    const doubleChance = Math.random() < 0.5;
    const totalHits = doubleChance ? hits * 2 : hits;
    return {
      success: true,
      effects: [`행동력 ${energy}에 따라 ${totalHits}회 사격${doubleChance ? ' (2배!)' : ''}`],
      stateChanges: { extraHits: totalHits - 1 },
    };
  },

  manipulation: (state, _card, actor) => {
    // 탄걸림이면 장전, 아니면 사격
    const isJammed = actor === 'player'
      ? hasToken(state.player.tokens, 'gun_jam')
      : hasToken(state.enemy.tokens, 'gun_jam');

    if (isJammed && actor === 'player') {
      state.player.tokens = removeToken(state.player.tokens, 'gun_jam', 99);
      state.player.tokens = removeToken(state.player.tokens, 'roulette', 99);
      return {
        success: true,
        effects: ['장전 발동'],
        stateChanges: {},
      };
    }

    return {
      success: true,
      effects: ['사격 1회'],
      stateChanges: {},
    };
  },

  sharpenBlade: (state) => {
    // 모든 검격 카드 공격력 +3 (전투 중 버프)
    state.player.tokens = addToken(state.player.tokens, 'sharpened', 1);
    return {
      success: true,
      effects: ['모든 검격 카드 공격력 +3'],
      stateChanges: { playerTokens: [{ id: 'sharpened', stacks: 1 }] },
    };
  },

  critKnockback4: () => {
    // 치명타마다 넉백 4
    return {
      success: true,
      effects: ['치명타시 넉백 4'],
      stateChanges: { timelinePush: 4 },
    };
  },

  // ==================== 소환/생성 ====================

  // 카드 창조 효과들 - 실제 처리는 CardCreationSystem에서 담당
  // 여기서는 마커만 반환하고, timeline-battle-engine에서 후처리

  createAttackOnHit: () => {
    return {
      success: true,
      effects: ['피해시 공격 카드 창조'],
      stateChanges: { creationEffect: 'createAttackOnHit' },
    };
  },

  breach: (state, card, actor) => {
    // 방어력 부여는 여기서 처리
    if (card.block && actor === 'player') {
      state.player.block += card.block;
    }
    return {
      success: true,
      effects: ['카드 창조 (브리치)'],
      stateChanges: { creationEffect: 'breach' },
    };
  },

  executionSquad: (state, _card, actor) => {
    if (actor === 'player') {
      state.player.tokens = removeToken(state.player.tokens, 'gun_jam', 99);
      state.player.tokens = addToken(state.player.tokens, 'jam_immunity', 1);
    }
    return {
      success: true,
      effects: ['장전 + 탄걸림 면역 + 총격 창조'],
      stateChanges: { creationEffect: 'executionSquad' },
    };
  },

  recallCard: (state, _card, actor) => {
    // 마지막 사용 카드 회수 - 버린 카드에서 랜덤 1장 회수
    if (actor === 'player' && state.player.discard.length > 0) {
      const idx = Math.floor(Math.random() * state.player.discard.length);
      const recalled = state.player.discard.splice(idx, 1)[0];
      state.player.hand.push(recalled);
      return {
        success: true,
        effects: [`카드 회수: ${recalled}`],
        stateChanges: {},
      };
    }
    return {
      success: false,
      effects: [],
      stateChanges: {},
    };
  },

  emergencyDraw: (state, _card, actor) => {
    // 즉시 카드 2장 드로우
    if (actor === 'player') {
      const drawCount = Math.min(2, state.player.deck.length);
      for (let i = 0; i < drawCount; i++) {
        if (state.player.deck.length > 0) {
          const drawn = state.player.deck.shift();
          if (drawn) state.player.hand.push(drawn);
        }
      }
      return {
        success: true,
        effects: [`${drawCount}장 드로우`],
        stateChanges: {},
      };
    }
    return {
      success: false,
      effects: [],
      stateChanges: {},
    };
  },

  createFencingCards3: () => {
    return {
      success: true,
      effects: ['검격 카드 3장 창조'],
      stateChanges: { creationEffect: 'createFencingCards3' },
    };
  },

  buffAllies: (state, _card, actor) => {
    // 아군 강화: 모든 유닛에게 공격+ 버프
    if (actor === 'enemy' && state.enemy.units) {
      for (const unit of state.enemy.units) {
        if (unit.hp > 0) {
          unit.tokens = addToken(unit.tokens, 'offense', 1);
        }
      }
      return {
        success: true,
        effects: ['모든 아군에게 공격+ 부여'],
        stateChanges: {},
      };
    }
    return {
      success: false,
      effects: [],
      stateChanges: {},
    };
  },

  summonDeserter: (state) => {
    // 탈영병 소환: 적 유닛 추가
    if (!state.enemy.units) {
      state.enemy.units = [{
        unitId: 0,
        id: state.enemy.id,
        name: state.enemy.name,
        hp: state.enemy.hp,
        maxHp: state.enemy.maxHp,
        block: state.enemy.block,
        tokens: { ...state.enemy.tokens },
        deck: [...state.enemy.deck],
        cardsPerTurn: state.enemy.cardsPerTurn,
      }];
    }

    const maxUnitId = Math.max(...state.enemy.units.map(u => u.unitId), 0);

    // 탈영병 2기 추가
    const deserter1: typeof state.enemy.units[0] = {
      unitId: maxUnitId + 1,
      id: 'deserter',
      name: '탈영병',
      hp: 15,
      maxHp: 15,
      block: 0,
      tokens: {},
      deck: ['enemy_slash', 'enemy_guard'],
      cardsPerTurn: 1,
      emoji: '🏃',
    };

    const deserter2: typeof state.enemy.units[0] = {
      unitId: maxUnitId + 2,
      id: 'deserter',
      name: '탈영병',
      hp: 15,
      maxHp: 15,
      block: 0,
      tokens: {},
      deck: ['enemy_slash', 'enemy_guard'],
      cardsPerTurn: 1,
      emoji: '🏃',
    };

    state.enemy.units.push(deserter1, deserter2);

    // 총 체력 갱신
    state.enemy.hp = state.enemy.units.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
    state.enemy.maxHp = state.enemy.units.reduce((sum, u) => sum + u.maxHp, 0);

    return {
      success: true,
      effects: ['탈영병 2기 소환'],
      stateChanges: { summoned: ['deserter', 'deserter'] },
    };
  },

  // 50% HP에서 소환 패시브 (턴 시작시 체크)
  summonOnHalfHp: (state) => {
    if (state.enemy.passives?.summonOnHalfHp && !state.enemy.hasSummoned) {
      const halfHp = state.enemy.maxHp / 2;
      if (state.enemy.hp <= halfHp && state.enemy.hp > 0) {
        // summonDeserter 호출
        const result = SPECIAL_EFFECTS.summonDeserter(state, {} as GameCard, 'enemy', {} as TimelineCard);
        state.enemy.hasSummoned = true;
        return result;
      }
    }
    return {
      success: false,
      effects: [],
      stateChanges: {},
    };
  },
};

// ==================== 특수 효과 실행 ====================

/**
 * 카드의 special 효과 실행
 */
export function executeSpecialEffects(
  state: GameBattleState,
  card: GameCard,
  actor: 'player' | 'enemy',
  timelineCard: TimelineCard
): SpecialEffectResult[] {
  const results: SpecialEffectResult[] = [];

  if (!card.special) return results;

  const specials = Array.isArray(card.special) ? card.special : [card.special];

  for (const special of specials) {
    const handler = SPECIAL_EFFECTS[special];
    if (handler) {
      const result = handler(state, card, actor, timelineCard);
      results.push(result);
    }
  }

  return results;
}

/**
 * 특정 special 효과가 있는지 확인
 */
export function hasSpecialEffect(card: GameCard, effect: string): boolean {
  if (!card.special) return false;
  const specials = Array.isArray(card.special) ? card.special : [card.special];
  return specials.includes(effect);
}

// ==================== 교차 보너스 처리 ====================

export interface CrossBonusResult {
  success: boolean;
  effects: string[];
  damageMultiplier?: number;
  blockMultiplier?: number;
  extraDamage?: number;
  extraBlock?: number;
  guaranteedCrit?: boolean;
  tokens?: { id: string; stacks: number; target: 'player' | 'enemy' }[];
  pushAmount?: number;
  gunAttackHits?: number; // 추가 사격 횟수
}

/**
 * 교차 보너스 처리
 */
export function processCrossBonus(
  state: GameBattleState,
  card: GameCard,
  actor: 'player' | 'enemy',
  timelineCard: TimelineCard
): CrossBonusResult {
  if (!timelineCard.crossed || !card.crossBonus) {
    return { success: false, effects: [] };
  }

  const bonus = card.crossBonus;
  const result: CrossBonusResult = { success: true, effects: [] };

  switch (bonus.type) {
    case 'damage_mult':
      result.damageMultiplier = bonus.value || 2;
      result.effects.push(`피해 ${result.damageMultiplier}배`);
      break;

    case 'block_mult':
      result.blockMultiplier = bonus.value || 2;
      result.effects.push(`방어력 ${result.blockMultiplier}배`);
      break;

    case 'gun_attack':
      // 사격 추가 - 교차 시 기본 사격 피해 추가
      const gunCount = bonus.count || 1;
      result.gunAttackHits = gunCount;
      result.effects.push(`사격 ${gunCount}회 추가`);
      break;

    case 'guaranteed_crit':
      result.guaranteedCrit = true;
      result.effects.push('확정 치명타');
      break;

    case 'push':
      result.pushAmount = bonus.value || 3;
      // 적 타임라인 밀기
      const targetOwner = actor === 'player' ? 'enemy' : 'player';
      for (const tc of state.timeline) {
        if (tc.owner === targetOwner && !tc.executed) {
          tc.position = Math.min(30, tc.position + result.pushAmount);
        }
      }
      result.effects.push(`넉백 ${result.pushAmount}`);
      break;

    case 'push_gain_block':
      // 밀어내고 방어 획득
      const maxPush = bonus.maxPush || 8;
      const nextCard = state.timeline.find(tc =>
        tc.owner !== actor && !tc.executed && tc.position > timelineCard.position
      );
      if (nextCard) {
        const pushDist = Math.min(maxPush, nextCard.position - timelineCard.position);
        nextCard.position += pushDist;
        result.extraBlock = pushDist;
        result.effects.push(`${pushDist} 밀기, ${pushDist} 방어`);
      }
      break;

    case 'add_tokens':
      if (bonus.tokens) {
        result.tokens = bonus.tokens as { id: string; stacks: number; target: 'player' | 'enemy' }[];
        for (const token of result.tokens) {
          if (token.target === 'enemy' || token.target === 'player') {
            const targetState = (actor === 'player' ?
              (token.target === 'player' ? state.player : state.enemy) :
              (token.target === 'enemy' ? state.enemy : state.player));
            targetState.tokens = addToken(targetState.tokens, token.id, token.stacks);
          }
          result.effects.push(`${token.id} +${token.stacks}`);
        }
      }
      break;

    case 'intercept_upgrade':
      // 요격 강화: 부러짐+, 무방비+
      const target = actor === 'player' ? state.enemy : state.player;
      target.tokens = addToken(target.tokens, 'brokenPlus', 1);
      target.tokens = addToken(target.tokens, 'exposedPlus', 1);
      result.effects.push('부러짐+, 무방비+ 부여');
      break;

    case 'destroy_card':
      // 교차된 적 카드 파괴
      const destroyCount = bonus.value || 1;
      let destroyed = 0;
      for (const tc of state.timeline) {
        if (tc.owner !== actor && tc.position === timelineCard.position && !tc.executed) {
          tc.executed = true; // 파괴됨
          destroyed++;
          if (destroyed >= destroyCount) break;
        }
      }
      if (destroyed > 0) {
        result.effects.push(`적 카드 ${destroyed}장 파괴`);
      }
      break;

    case 'advance':
      // 내 타임라인 앞당김
      const advanceAmount = bonus.value || 3;
      for (const tc of state.timeline) {
        if (tc.owner === actor && !tc.executed) {
          tc.position = Math.max(0, tc.position - advanceAmount);
        }
      }
      result.effects.push(`타임라인 ${advanceAmount} 앞당김`);
      break;
  }

  return result;
}

// ==================== 필요 토큰 체크 ====================

/**
 * 카드 사용에 필요한 토큰 확인 및 소모
 */
export function checkAndConsumeRequiredTokens(
  state: GameBattleState,
  card: GameCard,
  actor: 'player' | 'enemy'
): { canPlay: boolean; consumed: string[] } {
  if (!card.requiredTokens || card.requiredTokens.length === 0) {
    return { canPlay: true, consumed: [] };
  }

  const actorState = actor === 'player' ? state.player : state.enemy;
  const consumed: string[] = [];

  // 모든 필요 토큰 확인
  for (const req of card.requiredTokens) {
    const currentStacks = getTokenStacks(actorState.tokens, req.id);
    if (currentStacks < req.stacks) {
      return { canPlay: false, consumed: [] };
    }
  }

  // 토큰 소모
  for (const req of card.requiredTokens) {
    actorState.tokens = removeToken(actorState.tokens, req.id, req.stacks);
    consumed.push(`${req.id} -${req.stacks}`);
  }

  return { canPlay: true, consumed };
}

// ==================== 데미지 보정 계산 ====================

/**
 * 검격 카드 강화 보정
 */
export function getFencingDamageBonus(
  tokens: TokenState,
  card: GameCard
): number {
  if (card.cardCategory !== 'fencing') return 0;
  if (hasToken(tokens, 'sharpened')) {
    return 3; // 날 세우기 효과
  }
  return 0;
}

/**
 * 총기 카드 강화 보정
 */
export function getGunDamageBonus(
  tokens: TokenState,
  card: GameCard
): number {
  if (card.cardCategory !== 'gun') return 0;

  let bonus = 0;

  // 파쇄탄
  if (hasToken(tokens, 'fragmentation')) {
    bonus += 6;
  }

  return bonus;
}

// ==================== 유틸리티 ====================

/**
 * 지원되는 모든 special 효과 목록
 */
export function getSupportedSpecials(): string[] {
  return Object.keys(SPECIAL_EFFECTS);
}

/**
 * 지원되지 않는 special 효과 찾기
 */
export function findUnsupportedSpecials(cards: GameCard[]): string[] {
  const unsupported = new Set<string>();

  for (const card of cards) {
    if (!card.special) continue;
    const specials = Array.isArray(card.special) ? card.special : [card.special];
    for (const special of specials) {
      if (!SPECIAL_EFFECTS[special]) {
        unsupported.add(special);
      }
    }
  }

  return Array.from(unsupported);
}
