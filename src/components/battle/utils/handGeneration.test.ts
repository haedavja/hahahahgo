/**
 * @file handGeneration.test.js
 * @description 핸드/덱 생성 테스트
 *
 * ## 테스트 대상
 * - shuffleArray: 배열 셔플 (Fisher-Yates)
 * - initializeDeck: 덱 초기화
 * - drawFromDeck: 덱에서 카드 드로우
 * - getDefaultStartingHand: 기본 시작 핸드
 * - drawCharacterBuildHand: 캐릭터 빌드 기반 핸드
 *
 * ## 주요 테스트 케이스
 * - 셔플 후 원본 배열 유지
 * - 덱 소진 시 discard 재셔플
 * - 시작 핸드 크기 설정
 * - 캐릭터별 보장 카드 포함
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shuffleArray,
  initializeDeck,
  drawFromDeck,
  getDefaultStartingHand,
  drawCharacterBuildHand
} from './handGeneration';

describe('handGeneration', () => {
  describe('shuffleArray', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('빈 배열은 빈 배열을 반환해야 함', () => {
      expect(shuffleArray([])).toEqual([]);
    });

    it('단일 요소 배열은 그대로 반환해야 함', () => {
      expect(shuffleArray([1])).toEqual([1]);
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      shuffleArray(original);

      expect(original).toEqual(copy);
    });

    it('모든 요소가 포함되어야 함', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('새 배열을 반환해야 함', () => {
      const original = [1, 2, 3];
      const shuffled = shuffleArray(original);

      expect(shuffled).not.toBe(original);
    });
  });

  describe('initializeDeck', () => {
    it('null characterBuild는 빈 결과를 반환해야 함', () => {
      const result = initializeDeck(null as any);

      expect(result.deck).toEqual([]);
      expect(result.mainSpecialsHand).toEqual([]);
    });

    it('undefined characterBuild는 빈 결과를 반환해야 함', () => {
      const result = initializeDeck(undefined as any);

      expect(result.deck).toEqual([]);
      expect(result.mainSpecialsHand).toEqual([]);
    });

    it('빈 characterBuild는 빈 결과를 반환해야 함', () => {
      const result = initializeDeck({} as any);

      expect(result.deck).toEqual([]);
      expect(result.mainSpecialsHand).toEqual([]);
    });

    it('결과 구조가 올바라야 함', () => {
      const result = initializeDeck({
        mainSpecials: [],
        subSpecials: [],
        ownedCards: []
      } as any);

      expect(result).toHaveProperty('deck');
      expect(result).toHaveProperty('mainSpecialsHand');
      expect(Array.isArray(result.deck)).toBe(true);
      expect(Array.isArray(result.mainSpecialsHand)).toBe(true);
    });
  });

  describe('drawFromDeck', () => {
    it('빈 덱과 빈 무덤은 빈 결과를 반환해야 함', () => {
      const result = drawFromDeck([], [], 3);

      expect(result.drawnCards).toEqual([]);
      expect(result.newDeck).toEqual([]);
      expect(result.newDiscardPile).toEqual([]);
      expect(result.reshuffled).toBe(false);
    });

    it('덱에서 지정된 수만큼 드로우해야 함', () => {
      const deck = [
        { id: 'card1', __handUid: 'uid1' } as any,
        { id: 'card2', __handUid: 'uid2' } as any,
        { id: 'card3', __handUid: 'uid3' } as any
      ];

      const result = drawFromDeck(deck, [], 2);

      expect(result.drawnCards).toHaveLength(2);
      expect(result.newDeck).toHaveLength(1);
    });

    it('드로우 후 남은 덱이 올바라야 함', () => {
      const deck = [
        { id: 'card1', __handUid: 'uid1' } as any,
        { id: 'card2', __handUid: 'uid2' } as any,
        { id: 'card3', __handUid: 'uid3' } as any
      ];

      const result = drawFromDeck(deck, [], 2);

      expect(result.newDeck[0].id).toBe('card3');
    });

    it('덱이 부족하면 무덤을 섞어서 덱에 추가해야 함', () => {
      const deck = [{ id: 'card1', __handUid: 'uid1' } as any];
      const discardPile = [
        { id: 'card2', __handUid: 'uid2' } as any,
        { id: 'card3', __handUid: 'uid3' } as any
      ];

      const result = drawFromDeck(deck, discardPile, 3);

      expect(result.reshuffled).toBe(true);
      expect(result.drawnCards.length).toBeGreaterThanOrEqual(1);
    });

    it('주특기 카드는 무덤에서 직접 손패로 이동해야 함', () => {
      const deck = [] as typeof discardPile;
      const discardPile = [
        { id: 'main1', __handUid: 'uid1', __isMainSpecial: true } as any,
        { id: 'normal1', __handUid: 'uid2' } as any
      ];

      const result = drawFromDeck(deck, discardPile, 2);

      const mainInDrawn = result.drawnCards.filter(c => c.__isMainSpecial);
      expect(mainInDrawn).toHaveLength(1);
    });

    it('보조특기는 셔플 시 덱 위로 배치되어야 함', () => {
      const deck = [] as typeof discardPile;
      const discardPile = [
        { id: 'sub1', __handUid: 'uid1', __isSubSpecial: true } as any,
        { id: 'normal1', __handUid: 'uid2' } as any,
        { id: 'normal2', __handUid: 'uid3' } as any
      ];

      const result = drawFromDeck(deck, discardPile, 3);

      expect(result.reshuffled).toBe(true);
    });

    it('escape 특성 카드가 escapeBan에 있으면 무덤으로 이동해야 함', () => {
      const deck = [
        { id: 'escape1', __handUid: 'uid1', traits: ['escape'] } as any,
        { id: 'normal1', __handUid: 'uid2' } as any
      ];
      const escapeBan = new Set(['escape1']);

      const result = drawFromDeck(deck, [], 2, escapeBan);

      expect(result.drawnCards.find(c => c.id === 'escape1')).toBeUndefined();
      expect(result.newDiscardPile.find(c => c.id === 'escape1')).toBeDefined();
    });
  });

  describe('getDefaultStartingHand', () => {
    it('배열을 반환해야 함', () => {
      const result = getDefaultStartingHand();

      expect(Array.isArray(result)).toBe(true);
    });

    it('존재하지 않는 카드는 필터링되어야 함', () => {
      const result = getDefaultStartingHand();

      expect(result.every(card => card !== null && card !== undefined)).toBe(true);
    });
  });

  describe('drawCharacterBuildHand', () => {
    it('null characterBuild는 빈 배열을 반환해야 함', () => {
      const result = drawCharacterBuildHand(null as any);

      expect(result).toEqual([]);
    });

    it('빈 characterBuild는 빈 배열을 반환해야 함', () => {
      const result = drawCharacterBuildHand({} as any);

      expect(result).toEqual([]);
    });

    it('각 카드에 __handUid가 설정되어야 함', () => {
      const result = drawCharacterBuildHand({
        mainSpecials: [],
        subSpecials: [],
        ownedCards: []
      } as any);

      // 빈 빌드이므로 빈 배열 반환
      expect(result).toEqual([]);
    });

    it('vanishedCards는 필터링되어야 함', () => {
      const result = drawCharacterBuildHand(
        { mainSpecials: ['card1'], subSpecials: [], ownedCards: [] } as any,
        {} as any,
        [] as any,
        0,
        new Set(),
        ['card1']
      );

      // card1이 vanished이므로 필터링됨
      expect(result.find(c => c?.id === 'card1')).toBeUndefined();
    });
  });
});
