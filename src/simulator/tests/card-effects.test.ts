/**
 * @file card-effects.test.ts
 * @description 카드 특수 효과 및 교차 보너스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeSpecialEffects,
  hasSpecialEffect,
  processCrossBonus,
  checkAndConsumeRequiredTokens,
  getFencingDamageBonus,
  getGunDamageBonus,
  getSupportedSpecials,
  findUnsupportedSpecials,
  type SpecialEffectResult,
} from '../core/card-effects';
import { addToken } from '../core/token-system';
import type { GameCard, GameBattleState, TimelineCard } from '../core/game-types';

// 테스트용 게임 상태 생성
function createMockGameState(): GameBattleState {
  return {
    turn: 1,
    phase: 'player_turn',
    player: {
      hp: 70,
      maxHp: 80,
      energy: 3,
      maxEnergy: 3,
      block: 0,
      tokens: {},
      hand: ['card1', 'card2'],
      deck: ['card3', 'card4', 'card5'],
      discard: ['card6'],
      exhaust: [],
      relics: [],
    },
    enemy: {
      id: 'test_enemy',
      name: '테스트 적',
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
      deck: ['enemy_slash'],
      cardsPerTurn: 2,
    },
    timeline: [],
    comboUsageCount: {},
  } as GameBattleState;
}

// 테스트용 카드 생성
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: 'test_card',
    name: '테스트 카드',
    type: 'attack',
    actionCost: 1,
    damage: 10,
    ...overrides,
  } as GameCard;
}

// 테스트용 타임라인 카드 생성
function createMockTimelineCard(overrides: Partial<TimelineCard> = {}): TimelineCard {
  return {
    cardId: 'test_card',
    cardName: '테스트 카드',
    owner: 'player',
    position: 5,
    executed: false,
    crossed: false,
    ...overrides,
  } as TimelineCard;
}

describe('card-effects', () => {
  describe('executeSpecialEffects', () => {
    let state: GameBattleState;

    beforeEach(() => {
      state = createMockGameState();
    });

    it('special이 없으면 빈 배열을 반환한다', () => {
      const card = createMockCard();
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(results).toEqual([]);
    });

    it('ignoreBlock 효과를 실행한다', () => {
      const card = createMockCard({ special: 'ignoreBlock' });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(results.length).toBe(1);
      expect(results[0].stateChanges.ignoreBlock).toBe(true);
    });

    it('heal5 효과가 플레이어 체력을 회복한다', () => {
      state.player.hp = 50;
      const card = createMockCard({ special: 'heal5' });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(results.length).toBe(1);
      expect(state.player.hp).toBe(55);
      expect(results[0].stateChanges.playerHeal).toBe(5);
    });

    it('heal5 효과가 최대 체력을 초과하지 않는다', () => {
      state.player.hp = 78;
      const card = createMockCard({ special: 'heal5' });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.player.hp).toBe(80); // maxHp 제한
    });

    it('selfDamage3 효과가 자해 피해를 준다', () => {
      const card = createMockCard({ special: 'selfDamage3' });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.player.hp).toBe(67); // 70 - 3
    });

    it('guaranteedCrit 효과를 반환한다', () => {
      const card = createMockCard({ special: 'guaranteedCrit' });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(results[0].stateChanges.guaranteedCrit).toBe(true);
    });

    it('배열 형태의 special을 처리한다', () => {
      const card = createMockCard({ special: ['ignoreBlock', 'guaranteedCrit'] });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(results.length).toBe(2);
    });

    it('advanceTimeline 효과가 타임라인을 앞당긴다', () => {
      state.timeline = [
        createMockTimelineCard({ owner: 'player', position: 10 }),
        createMockTimelineCard({ owner: 'enemy', position: 8 }),
      ];
      const card = createMockCard({ special: 'advanceTimeline', advanceAmount: 3 });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.timeline[0].position).toBe(7); // 10 - 3
      expect(state.timeline[1].position).toBe(8); // 적은 변경 없음
    });

    it('pushEnemyTimeline 효과가 적 타임라인을 민다', () => {
      state.timeline = [
        createMockTimelineCard({ owner: 'player', position: 5 }),
        createMockTimelineCard({ owner: 'enemy', position: 8 }),
      ];
      const card = createMockCard({ special: 'pushEnemyTimeline', pushAmount: 4 });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.timeline[0].position).toBe(5); // 플레이어 변경 없음
      expect(state.timeline[1].position).toBe(12); // 8 + 4
    });

    it('exhaust 효과를 반환한다', () => {
      const card = createMockCard({ special: 'exhaust' });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(results[0].stateChanges.exhaustCard).toBe(true);
    });

    it('stance 효과가 부정적 토큰을 제거한다', () => {
      state.player.tokens = addToken({}, 'burn', 2);
      state.player.tokens = addToken(state.player.tokens, 'poison', 3);
      const card = createMockCard({ special: 'stance' });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.player.tokens['burn']).toBeUndefined();
      expect(state.player.tokens['poison']).toBeUndefined();
    });

    it('reloadSpray 효과가 탄걸림과 룰렛을 제거한다', () => {
      state.player.tokens = addToken({}, 'gun_jam', 1);
      state.player.tokens = addToken(state.player.tokens, 'roulette', 3);
      const card = createMockCard({ special: 'reloadSpray' });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.player.tokens['gun_jam']).toBeUndefined();
      expect(state.player.tokens['roulette']).toBeUndefined();
    });

    it('emergencyDraw 효과가 카드를 드로우한다', () => {
      const initialHandSize = state.player.hand.length;
      const initialDeckSize = state.player.deck.length;
      const card = createMockCard({ special: 'emergencyDraw' });
      const timelineCard = createMockTimelineCard();

      executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.player.hand.length).toBe(initialHandSize + 2);
      expect(state.player.deck.length).toBe(initialDeckSize - 2);
    });

    it('violentMort 효과가 HP 30 이하인 적을 처형한다', () => {
      state.enemy.hp = 25;
      const card = createMockCard({ special: 'violentMort' });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.enemy.hp).toBe(0);
      expect(results[0].success).toBe(true);
    });

    it('violentMort 효과가 HP 30 초과인 적에게는 실패한다', () => {
      state.enemy.hp = 40;
      const card = createMockCard({ special: 'violentMort' });
      const timelineCard = createMockTimelineCard();

      const results = executeSpecialEffects(state, card, 'player', timelineCard);

      expect(state.enemy.hp).toBe(40);
      expect(results[0].success).toBe(false);
    });
  });

  describe('hasSpecialEffect', () => {
    it('special이 없으면 false를 반환한다', () => {
      const card = createMockCard();
      expect(hasSpecialEffect(card, 'ignoreBlock')).toBe(false);
    });

    it('단일 special이 일치하면 true를 반환한다', () => {
      const card = createMockCard({ special: 'ignoreBlock' });
      expect(hasSpecialEffect(card, 'ignoreBlock')).toBe(true);
    });

    it('단일 special이 일치하지 않으면 false를 반환한다', () => {
      const card = createMockCard({ special: 'ignoreBlock' });
      expect(hasSpecialEffect(card, 'heal5')).toBe(false);
    });

    it('배열 special에서 일치하는 효과를 찾는다', () => {
      const card = createMockCard({ special: ['ignoreBlock', 'heal5', 'exhaust'] });
      expect(hasSpecialEffect(card, 'heal5')).toBe(true);
    });

    it('배열 special에서 일치하지 않으면 false를 반환한다', () => {
      const card = createMockCard({ special: ['ignoreBlock', 'exhaust'] });
      expect(hasSpecialEffect(card, 'heal5')).toBe(false);
    });
  });

  describe('processCrossBonus', () => {
    let state: GameBattleState;

    beforeEach(() => {
      state = createMockGameState();
    });

    it('교차하지 않으면 success false를 반환한다', () => {
      const card = createMockCard({ crossBonus: { type: 'damage_mult', value: 2 } });
      const timelineCard = createMockTimelineCard({ crossed: false });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(false);
    });

    it('crossBonus가 없으면 success false를 반환한다', () => {
      const card = createMockCard();
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(false);
    });

    it('damage_mult 교차 보너스를 처리한다', () => {
      const card = createMockCard({ crossBonus: { type: 'damage_mult', value: 2 } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(result.damageMultiplier).toBe(2);
    });

    it('block_mult 교차 보너스를 처리한다', () => {
      const card = createMockCard({ crossBonus: { type: 'block_mult', value: 3 } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(result.blockMultiplier).toBe(3);
    });

    it('guaranteed_crit 교차 보너스를 처리한다', () => {
      const card = createMockCard({ crossBonus: { type: 'guaranteed_crit' } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(result.guaranteedCrit).toBe(true);
    });

    it('push 교차 보너스가 적 타임라인을 민다', () => {
      state.timeline = [
        createMockTimelineCard({ owner: 'enemy', position: 10 }),
      ];
      const card = createMockCard({ crossBonus: { type: 'push', value: 5 } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(result.pushAmount).toBe(5);
      expect(state.timeline[0].position).toBe(15);
    });

    it('gun_attack 교차 보너스를 처리한다', () => {
      const card = createMockCard({ crossBonus: { type: 'gun_attack', count: 2 } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(result.gunAttackHits).toBe(2);
    });

    it('advance 교차 보너스가 내 타임라인을 앞당긴다', () => {
      state.timeline = [
        createMockTimelineCard({ owner: 'player', position: 10 }),
      ];
      const card = createMockCard({ crossBonus: { type: 'advance', value: 4 } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(state.timeline[0].position).toBe(6);
    });

    it('intercept_upgrade 교차 보너스가 적에게 토큰을 부여한다', () => {
      const card = createMockCard({ crossBonus: { type: 'intercept_upgrade' } });
      const timelineCard = createMockTimelineCard({ crossed: true });

      const result = processCrossBonus(state, card, 'player', timelineCard);

      expect(result.success).toBe(true);
      expect(state.enemy.tokens['brokenPlus']).toBe(1);
      expect(state.enemy.tokens['exposedPlus']).toBe(1);
    });
  });

  describe('checkAndConsumeRequiredTokens', () => {
    let state: GameBattleState;

    beforeEach(() => {
      state = createMockGameState();
    });

    it('필요 토큰이 없으면 사용 가능하다', () => {
      const card = createMockCard();

      const result = checkAndConsumeRequiredTokens(state, card, 'player');

      expect(result.canPlay).toBe(true);
      expect(result.consumed).toEqual([]);
    });

    it('필요 토큰이 있으면 사용 가능하다', () => {
      state.player.tokens = addToken({}, 'finesse', 2);
      const card = createMockCard({
        requiredTokens: [{ id: 'finesse', stacks: 2 }],
      });

      const result = checkAndConsumeRequiredTokens(state, card, 'player');

      expect(result.canPlay).toBe(true);
      expect(result.consumed).toContain('finesse -2');
    });

    it('필요 토큰이 부족하면 사용 불가능하다', () => {
      state.player.tokens = addToken({}, 'finesse', 1);
      const card = createMockCard({
        requiredTokens: [{ id: 'finesse', stacks: 3 }],
      });

      const result = checkAndConsumeRequiredTokens(state, card, 'player');

      expect(result.canPlay).toBe(false);
      expect(result.consumed).toEqual([]);
    });

    it('토큰을 소모한다', () => {
      state.player.tokens = addToken({}, 'finesse', 5);
      const card = createMockCard({
        requiredTokens: [{ id: 'finesse', stacks: 3 }],
      });

      checkAndConsumeRequiredTokens(state, card, 'player');

      expect(state.player.tokens['finesse']).toBe(2); // 5 - 3
    });

    it('여러 토큰을 확인하고 소모한다', () => {
      state.player.tokens = addToken({}, 'finesse', 2);
      state.player.tokens = addToken(state.player.tokens, 'focus', 3);
      const card = createMockCard({
        requiredTokens: [
          { id: 'finesse', stacks: 1 },
          { id: 'focus', stacks: 2 },
        ],
      });

      const result = checkAndConsumeRequiredTokens(state, card, 'player');

      expect(result.canPlay).toBe(true);
      expect(state.player.tokens['finesse']).toBe(1);
      expect(state.player.tokens['focus']).toBe(1);
    });
  });

  describe('getFencingDamageBonus', () => {
    it('검격 카드가 아니면 0을 반환한다', () => {
      const tokens = {};
      const card = createMockCard({ cardCategory: 'gun' });

      expect(getFencingDamageBonus(tokens, card)).toBe(0);
    });

    it('sharpened 토큰이 없으면 0을 반환한다', () => {
      const tokens = {};
      const card = createMockCard({ cardCategory: 'fencing' });

      expect(getFencingDamageBonus(tokens, card)).toBe(0);
    });

    it('sharpened 토큰이 있으면 3을 반환한다', () => {
      const tokens = addToken({}, 'sharpened', 1);
      const card = createMockCard({ cardCategory: 'fencing' });

      expect(getFencingDamageBonus(tokens, card)).toBe(3);
    });
  });

  describe('getGunDamageBonus', () => {
    it('총기 카드가 아니면 0을 반환한다', () => {
      const tokens = {};
      const card = createMockCard({ cardCategory: 'fencing' });

      expect(getGunDamageBonus(tokens, card)).toBe(0);
    });

    it('fragmentation 토큰이 있으면 6을 반환한다', () => {
      const tokens = addToken({}, 'fragmentation', 1);
      const card = createMockCard({ cardCategory: 'gun' });

      expect(getGunDamageBonus(tokens, card)).toBe(6);
    });

    it('토큰이 없으면 0을 반환한다', () => {
      const tokens = {};
      const card = createMockCard({ cardCategory: 'gun' });

      expect(getGunDamageBonus(tokens, card)).toBe(0);
    });
  });

  describe('getSupportedSpecials', () => {
    it('지원되는 special 목록을 반환한다', () => {
      const specials = getSupportedSpecials();

      expect(specials.length).toBeGreaterThan(0);
      expect(specials).toContain('ignoreBlock');
      expect(specials).toContain('heal5');
      expect(specials).toContain('advanceTimeline');
      expect(specials).toContain('exhaust');
    });
  });

  describe('findUnsupportedSpecials', () => {
    it('지원되지 않는 special을 찾는다', () => {
      const cards: GameCard[] = [
        createMockCard({ special: 'ignoreBlock' }),
        createMockCard({ special: 'unknownEffect' }),
        createMockCard({ special: ['heal5', 'anotherUnknown'] }),
      ];

      const unsupported = findUnsupportedSpecials(cards);

      expect(unsupported).toContain('unknownEffect');
      expect(unsupported).toContain('anotherUnknown');
      expect(unsupported).not.toContain('ignoreBlock');
      expect(unsupported).not.toContain('heal5');
    });

    it('모든 special이 지원되면 빈 배열을 반환한다', () => {
      const cards: GameCard[] = [
        createMockCard({ special: 'ignoreBlock' }),
        createMockCard({ special: 'heal5' }),
      ];

      const unsupported = findUnsupportedSpecials(cards);

      expect(unsupported).toEqual([]);
    });

    it('special이 없는 카드는 무시한다', () => {
      const cards: GameCard[] = [
        createMockCard(),
        createMockCard({ special: 'unknownEffect' }),
      ];

      const unsupported = findUnsupportedSpecials(cards);

      expect(unsupported.length).toBe(1);
      expect(unsupported).toContain('unknownEffect');
    });
  });
});
