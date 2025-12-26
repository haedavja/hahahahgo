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

vi.mock('../../../lib/relicEffects', () => ({
  applyCardPlayedEffects: vi.fn(() => ({}))
}));

import { applyCardPlayedEffects } from '../../../lib/relicEffects';

describe('cardImmediateEffects', () => {
  describe('processImmediateCardTraits', () => {
    const createPlayerState = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      strength: 0,
      ...overrides
    }) as any;

    it('double_edge 특성은 플레이어에게 1 피해를 줘야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState({ hp: 50 });
      const card = { name: 'Double Edge', traits: ['double_edge'] } as any;

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
      } as any);

      expect(playerState.hp).toBe(49);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('양날의 검'));
    });

    it('double_edge는 HP를 0 미만으로 줄이지 않아야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState({ hp: 0 });
      const card = { traits: ['double_edge'] } as any;

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
      } as any);

      expect(playerState.hp).toBe(0);
    });

    it('training 특성은 힘을 1 증가시켜야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState({ strength: 2 });
      const card = { name: 'Training', traits: ['training'] } as any;

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
      } as any);

      expect(playerState.strength).toBe(3);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('단련'));
    });

    it('training은 strength가 없으면 0에서 시작해야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState();
      delete playerState.strength;
      const card = { traits: ['training'] } as any;

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
      } as any);

      expect(playerState.strength).toBe(1);
    });

    it('warmup 특성은 다음 턴 보너스 행동력을 추가해야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState();
      const card = { name: 'Warmup', traits: ['warmup'] } as any;

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
      } as any);

      expect(result.bonusEnergy).toBe(2);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('몸풀기'));
    });

    it('warmup은 기존 보너스 행동력에 누적되어야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState();
      const card = { traits: ['warmup'] } as any;

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: { bonusEnergy: 3 } as any,
        addLog
      } as any);

      expect(result.bonusEnergy).toBe(5);
    });

    it('vanish 특성은 카드를 소멸시켜야 함', () => {
      const addLog: any = vi.fn();
      const addVanishedCard = vi.fn();
      const playerState = createPlayerState();
      const card = { id: 'card1', name: 'Vanish Card', traits: ['vanish'] } as any;

      processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog,
        addVanishedCard
      } as any);

      expect(addVanishedCard).toHaveBeenCalledWith('card1');
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('소멸'));
    });

    it('vanish는 addVanishedCard 없으면 무시해야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState();
      const card = { id: 'card1', name: 'Vanish', traits: ['vanish'] } as any;

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
        // addVanishedCard 없음
      } as any);

      // 에러 없이 처리
      expect(result).toBeDefined();
    });

    it('여러 특성이 동시에 적용되어야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState({ hp: 50, strength: 1 });
      const card = { traits: ['double_edge', 'training', 'warmup'] } as any;

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: {} as any,
        addLog
      } as any);

      expect(playerState.hp).toBe(49); // double_edge
      expect(playerState.strength).toBe(2); // training
      expect(result.bonusEnergy).toBe(2); // warmup
    });

    it('특성이 없으면 변경 없이 반환해야 함', () => {
      const addLog: any = vi.fn();
      const playerState = createPlayerState({ hp: 100, strength: 5 });
      const card = { name: 'Normal Card' } as any;

      const result = processImmediateCardTraits({
        card,
        playerState,
        nextTurnEffects: { bonusEnergy: 1 } as any,
        addLog
      } as any);

      expect(playerState.hp).toBe(100);
      expect(playerState.strength).toBe(5);
      expect(result.bonusEnergy).toBe(1);
    });
  });

  describe('processCardPlayedRelicEffects', () => {
    const createPlayerState = (overrides = {}) => ({
      hp: 80,
      maxHp: 100,
      ...overrides
    }) as any;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('유령 카드는 상징 효과를 적용하지 않아야 함', () => {
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();
      const card = { name: 'Ghost Card', isGhost: true } as any;

      const result = processCardPlayedRelicEffects({
        relics: [] as any,
        card,
        playerState: createPlayerState(),
        enemyState: {} as any,
        safeInitialPlayer: { maxHp: 100 } as any,
        addLog,
        setRelicActivated
      } as any);

      expect(result).toBe(false);
      expect(applyCardPlayedEffects).not.toHaveBeenCalled();
    });

    it('힐 효과가 있으면 체력을 회복해야 함', () => {
      (applyCardPlayedEffects as any).mockReturnValue({ heal: 10 });
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = createPlayerState({ hp: 80, maxHp: 100 });

      const result = processCardPlayedRelicEffects({
        relics: [{ id: 'immortalMask' }] as any,
        card: { name: 'Card' } as any,
        playerState,
        enemyState: {} as any,
        safeInitialPlayer: { maxHp: 100 } as any,
        addLog,
        setRelicActivated
      } as any);

      expect(result).toBe(true);
      expect(playerState.hp).toBe(90);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('상징 효과'));
      expect(setRelicActivated).toHaveBeenCalledWith('immortalMask');
    });

    it('최대 체력을 초과하지 않아야 함', () => {
      (applyCardPlayedEffects as any).mockReturnValue({ heal: 50 });
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = createPlayerState({ hp: 90, maxHp: 100 });

      processCardPlayedRelicEffects({
        relics: [] as any,
        card: { name: 'Card' } as any,
        playerState,
        enemyState: {} as any,
        safeInitialPlayer: { maxHp: 100 } as any,
        addLog,
        setRelicActivated
      } as any);

      expect(playerState.hp).toBe(100);
    });

    it('이미 최대 체력이면 힐하지 않아야 함', () => {
      (applyCardPlayedEffects as any).mockReturnValue({ heal: 10 });
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = createPlayerState({ hp: 100, maxHp: 100 });

      const result = processCardPlayedRelicEffects({
        relics: [] as any,
        card: { name: 'Card' } as any,
        playerState,
        enemyState: {} as any,
        safeInitialPlayer: { maxHp: 100 } as any,
        addLog,
        setRelicActivated
      } as any);

      expect(result).toBe(false);
      expect(setRelicActivated).not.toHaveBeenCalled();
    });

    it('힐 효과가 없으면 false를 반환해야 함', () => {
      (applyCardPlayedEffects as any).mockReturnValue({});
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();

      const result = processCardPlayedRelicEffects({
        relics: [] as any,
        card: { name: 'Card' } as any,
        playerState: createPlayerState(),
        enemyState: {} as any,
        safeInitialPlayer: { maxHp: 100 } as any,
        addLog,
        setRelicActivated
      } as any);

      expect(result).toBe(false);
    });

    it('safeInitialPlayer에서 maxHp를 가져올 수 있어야 함', () => {
      (applyCardPlayedEffects as any).mockReturnValue({ heal: 10 });
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = { hp: 80 } as any; // maxHp 없음

      processCardPlayedRelicEffects({
        relics: [] as any,
        card: { name: 'Card' } as any,
        playerState,
        enemyState: {} as any,
        safeInitialPlayer: { maxHp: 120 } as any,
        addLog,
        setRelicActivated
      } as any);

      expect(playerState.hp).toBe(90);
    });

    it('maxHp 기본값 100을 사용해야 함', () => {
      (applyCardPlayedEffects as any).mockReturnValue({ heal: 30 });
      const addLog: any = vi.fn();
      const setRelicActivated = vi.fn();
      const playerState = { hp: 90 } as any; // maxHp 없음

      processCardPlayedRelicEffects({
        relics: [] as any,
        card: { name: 'Card' } as any,
        playerState,
        enemyState: {} as any,
        safeInitialPlayer: null as any,
        addLog,
        setRelicActivated
      } as any);

      expect(playerState.hp).toBe(100); // 기본 maxHp 100 적용
    });
  });
});
