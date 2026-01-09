/**
 * @file cardImmediateEffects.test.js
 * @description 카드 즉시 발동 효과 테스트
 *
 * ## 테스트 대상
 * - processImmediateCardTraits: 카드 특성에 따른 즉시 효과 처리
 * - processCardPlayedRelicEffects: 카드 사용 시 상징 효과 (힐 등)
 *
 * ## 주요 테스트 케이스
 * - double_edge: 사용 시 자해 1 피해
 * - training: 힘 +1 영구 증가
 * - warmup: 다음 턴 행동력 +2
 * - vanish: 카드 소멸 처리
 * - 상징 힐: maxHp 제한, 유령카드 제외
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processImmediateCardTraits, processCardPlayedRelicEffects } from './cardImmediateEffects';
import {
  createPlayerState,
  createEnemyState,
  createNextTurnEffects,
  createSafeInitialPlayer,
  createCardWithTraits,
  createGhostCard,
  createCard,
  type TestPlayerState,
} from '../../../test/factories';

vi.mock('../../../core/effects', () => ({
  executeCardPlayedEffects: vi.fn(() => ({ heal: 0 })),
  executeCardExhaustEffects: vi.fn(() => ({ etherGain: 0 })),
}));

import { executeCardPlayedEffects, executeCardExhaustEffects } from '../../../core/effects';

describe('cardImmediateEffects', () => {
  describe('processImmediateCardTraits', () => {
    it('double_edge 특성은 플레이어에게 1 피해를 줘야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState({ hp: 50 });
      const card = createCardWithTraits(['double_edge'], { name: 'Double Edge' });

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
      });

      expect(playerState.hp).toBe(49);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('양날의 검'));
    });

    it('double_edge는 HP를 0 미만으로 줄이지 않아야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState({ hp: 0 });
      const card = createCardWithTraits(['double_edge']);

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
      });

      expect(playerState.hp).toBe(0);
    });

    it('training 특성은 힘을 1 증가시켜야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState({ strength: 2 });
      const card = createCardWithTraits(['training'], { name: 'Training' });

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
      });

      expect(playerState.strength).toBe(3);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('단련'));
    });

    it('training은 strength가 없으면 0에서 시작해야 함', () => {
      const addLog = vi.fn();
      const playerState: TestPlayerState = createPlayerState();
      delete playerState.strength;
      const card = createCardWithTraits(['training']);

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
      });

      expect(playerState.strength).toBe(1);
    });

    it('warmup 특성은 다음 턴 보너스 행동력을 추가해야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState();
      const card = createCardWithTraits(['warmup'], { name: 'Warmup' });

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
      });

      expect(result.bonusEnergy).toBe(2);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('몸풀기'));
    });

    it('warmup은 기존 보너스 행동력에 누적되어야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState();
      const card = createCardWithTraits(['warmup']);

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects({ bonusEnergy: 3 }),
        addLog
      });

      expect(result.bonusEnergy).toBe(5);
    });

    it('vanish 특성은 카드를 소멸시켜야 함', () => {
      const addLog = vi.fn();
      const addVanishedCard = vi.fn();
      const playerState = createPlayerState();
      const card = createCardWithTraits(['vanish'], { id: 'card1', name: 'Vanish Card' });

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog,
        addVanishedCard
      });

      expect(addVanishedCard).toHaveBeenCalledWith('card1');
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('소멸'));
    });

    it('vanish는 addVanishedCard 없으면 무시해야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState();
      const card = createCardWithTraits(['vanish'], { id: 'card1', name: 'Vanish' });

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
        // addVanishedCard 없음
      });

      // 에러 없이 처리
      expect(result).toBeDefined();
    });

    it('여러 특성이 동시에 적용되어야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState({ hp: 50, strength: 1 });
      const card = createCardWithTraits(['double_edge', 'training', 'warmup']);

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects(),
        addLog
      });

      expect(playerState.hp).toBe(49); // double_edge
      expect(playerState.strength).toBe(2); // training
      expect(result.bonusEnergy).toBe(2); // warmup
    });

    it('특성이 없으면 변경 없이 반환해야 함', () => {
      const addLog = vi.fn();
      const playerState = createPlayerState({ hp: 100, strength: 5 });
      const card = createCard({ name: 'Normal Card' });

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: createNextTurnEffects({ bonusEnergy: 1 }),
        addLog
      });

      expect(playerState.hp).toBe(100);
      expect(playerState.strength).toBe(5);
      expect(result.bonusEnergy).toBe(1);
    });
  });

  describe('processCardPlayedRelicEffects', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('유령 카드는 상징 효과를 적용하지 않아야 함', () => {
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();
      const card = createGhostCard({ name: 'Ghost Card' });

      const result = processCardPlayedRelicEffects({
        relics: [],
        card,
        playerState: createPlayerState(),
        enemyState: createEnemyState(),
        safeInitialPlayer: createSafeInitialPlayer(),
        addLog,
        setRelicActivated
      });

      expect(result).toBe(false);
      expect(executeCardPlayedEffects).not.toHaveBeenCalled();
    });

    it('힐 효과가 있으면 체력을 회복해야 함', () => {
      (executeCardPlayedEffects as ReturnType<typeof vi.fn>).mockReturnValue({ heal: 10 });
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = createPlayerState({ hp: 80, maxHp: 100 });

      const result = processCardPlayedRelicEffects({
        relics: ['immortalMask'],
        card: createCard({ name: 'Card' }),
        playerState,
        enemyState: createEnemyState(),
        safeInitialPlayer: createSafeInitialPlayer(),
        addLog,
        setRelicActivated
      });

      expect(result).toBe(true);
      expect(playerState.hp).toBe(90);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('상징 효과'));
      expect(setRelicActivated).toHaveBeenCalledWith('immortalMask');
    });

    it('최대 체력을 초과하지 않아야 함', () => {
      (executeCardPlayedEffects as ReturnType<typeof vi.fn>).mockReturnValue({ heal: 50 });
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = createPlayerState({ hp: 90, maxHp: 100 });

      processCardPlayedRelicEffects({
        relics: [],
        card: createCard({ name: 'Card' }),
        playerState,
        enemyState: createEnemyState(),
        safeInitialPlayer: createSafeInitialPlayer(),
        addLog,
        setRelicActivated
      });

      expect(playerState.hp).toBe(100);
    });

    it('이미 최대 체력이면 힐하지 않아야 함', () => {
      (executeCardPlayedEffects as ReturnType<typeof vi.fn>).mockReturnValue({ heal: 10 });
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = createPlayerState({ hp: 100, maxHp: 100 });

      const result = processCardPlayedRelicEffects({
        relics: [],
        card: createCard({ name: 'Card' }),
        playerState,
        enemyState: createEnemyState(),
        safeInitialPlayer: createSafeInitialPlayer(),
        addLog,
        setRelicActivated
      });

      expect(result).toBe(false);
      expect(setRelicActivated).not.toHaveBeenCalled();
    });

    it('힐 효과가 없으면 false를 반환해야 함', () => {
      (executeCardPlayedEffects as ReturnType<typeof vi.fn>).mockReturnValue({ heal: 0 });
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();

      const result = processCardPlayedRelicEffects({
        relics: [],
        card: createCard({ name: 'Card' }),
        playerState: createPlayerState(),
        enemyState: createEnemyState(),
        safeInitialPlayer: createSafeInitialPlayer(),
        addLog,
        setRelicActivated
      });

      expect(result).toBe(false);
    });

    it('safeInitialPlayer에서 maxHp를 가져올 수 있어야 함', () => {
      (executeCardPlayedEffects as ReturnType<typeof vi.fn>).mockReturnValue({ heal: 10 });
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState: TestPlayerState = { hp: 80 }; // maxHp 없음

      processCardPlayedRelicEffects({
        relics: [],
        card: createCard({ name: 'Card' }),
        playerState,
        enemyState: createEnemyState(),
        safeInitialPlayer: createSafeInitialPlayer({ maxHp: 120 }),
        addLog,
        setRelicActivated
      });

      expect(playerState.hp).toBe(90);
    });

    it('maxHp 기본값 100을 사용해야 함', () => {
      (executeCardPlayedEffects as ReturnType<typeof vi.fn>).mockReturnValue({ heal: 30 });
      const addLog = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState: TestPlayerState = { hp: 90 }; // maxHp 없음

      processCardPlayedRelicEffects({
        relics: [],
        card: createCard({ name: 'Card' }),
        playerState,
        enemyState: createEnemyState(),
        safeInitialPlayer: null,
        addLog,
        setRelicActivated
      });

      expect(playerState.hp).toBe(100); // 기본 maxHp 100 적용
    });
  });
});
