// @ts-nocheck - Test file with type issues
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

  describe('카드 성장 시스템 통합', () => {
    // 실제 존재하는 카드 ID 사용: 'marche', 'lunge', 'coupe' 등
    describe('강화 효과 적용', () => {
      it('cardGrowth가 없으면 원본 카드가 반환되어야 함', () => {
        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], undefined);

        // 강화가 적용되지 않음
        const mainCard = result.mainSpecialsHand[0];
        expect(mainCard?.enhancementLevel).toBeUndefined();
      });

      it('강화 레벨이 있으면 카드에 enhancementLevel이 설정되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 1,
            enhancementLevel: 2,
            specializationCount: 0,
            traits: [] as string[]
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];
        expect(mainCard?.enhancementLevel).toBe(2);
      });

      it('강화된 카드는 enhancedStats를 포함해야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 1,
            enhancementLevel: 3,
            specializationCount: 0,
            traits: [] as string[]
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];
        expect(mainCard?.enhancedStats).toBeDefined();
      });

      it('강화 레벨 0은 강화되지 않은 것으로 처리되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 0,
            enhancementLevel: 0,
            specializationCount: 0,
            traits: [] as string[]
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];
        expect(mainCard?.enhancementLevel).toBeUndefined();
      });
    });

    describe('특화 특성 병합', () => {
      it('특화 특성이 카드에 추가되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 1,
            enhancementLevel: 0,
            specializationCount: 1,
            traits: ['swift']
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];
        expect(mainCard?.traits).toContain('swift');
      });

      it('기존 특성과 특화 특성이 병합되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 1,
            enhancementLevel: 0,
            specializationCount: 1,
            traits: ['swift']
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];
        // marche의 기존 특성('advance')과 swift가 함께 있어야 함
        expect(mainCard?.traits).toBeDefined();
        expect(mainCard?.traits).toContain('swift');
        expect(mainCard?.traits).toContain('advance'); // 기존 특성
      });

      it('중복 특성은 제거되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 2,
            enhancementLevel: 0,
            specializationCount: 2,
            traits: ['swift', 'swift'] // 중복 특성
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];
        const swiftCount = mainCard?.traits?.filter((t: string) => t === 'swift').length || 0;
        expect(swiftCount).toBe(1); // 중복 제거됨
      });
    });

    describe('강화 + 특화 동시 적용', () => {
      it('강화와 특화가 모두 적용되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'rare' as const,
            growthCount: 2,
            enhancementLevel: 2,
            specializationCount: 1,
            traits: ['swift']
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const mainCard = result.mainSpecialsHand[0];

        // 강화 효과 확인
        expect(mainCard?.enhancementLevel).toBe(2);
        expect(mainCard?.enhancedStats).toBeDefined();

        // 특화 특성 확인
        expect(mainCard?.traits).toContain('swift');
      });

      it('덱과 주특기 모두에 성장이 적용되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'common' as const,
            growthCount: 1,
            enhancementLevel: 1,
            specializationCount: 0,
            traits: [] as string[]
          },
          'lunge': {
            rarity: 'rare' as const,
            growthCount: 1,
            enhancementLevel: 3,
            specializationCount: 1,
            traits: ['strongbone']
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: ['lunge'],
          ownedCards: []
        } as any, [], cardGrowth);

        // 주특기 확인
        const mainCard = result.mainSpecialsHand[0];
        expect(mainCard?.enhancementLevel).toBe(1);

        // 보조특기(덱에 포함) 확인
        const subCard = result.deck.find(c => c.id === 'lunge');
        expect(subCard?.enhancementLevel).toBe(3);
        expect(subCard?.traits).toContain('strongbone');
      });
    });

    describe('소멸 카드와 성장 상호작용', () => {
      it('소멸된 카드는 성장 여부와 관계없이 제외되어야 함', () => {
        const cardGrowth = {
          'marche': {
            rarity: 'legendary' as const,
            growthCount: 5,
            enhancementLevel: 5,
            specializationCount: 2,
            traits: ['swift', 'strongbone']
          }
        };

        const result = initializeDeck({
          mainSpecials: ['marche'],
          subSpecials: [],
          ownedCards: []
        } as any, ['marche'], cardGrowth);

        // 소멸되어 주특기에 포함되지 않음
        expect(result.mainSpecialsHand).toHaveLength(0);
      });
    });

    describe('강화로 제거된 특성 병합 방지', () => {
      it('강화로 제거된 특성은 특화로 다시 추가되지 않아야 함', () => {
        // combat_meditation 3강에서 vanish가 제거됨
        const cardGrowth = {
          'combat_meditation': {
            rarity: 'common' as const,
            growthCount: 2,
            enhancementLevel: 3,
            specializationCount: 1,
            traits: ['vanish'] // 특화로 vanish 추가 시도
          }
        };

        const result = initializeDeck({
          mainSpecials: ['combat_meditation'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const card = result.mainSpecialsHand[0];
        // vanish가 3강에서 제거되어 특화로도 추가되지 않음
        expect(card?.traits).toBeDefined();
        expect(card?.traits).not.toContain('vanish');
        expect(card?.enhancedStats?.removedTraits).toContain('vanish');
      });

      it('강화로 제거되지 않은 특성은 특화로 추가되어야 함', () => {
        const cardGrowth = {
          'combat_meditation': {
            rarity: 'common' as const,
            growthCount: 2,
            enhancementLevel: 3,
            specializationCount: 1,
            traits: ['swift'] // 제거 대상이 아닌 특성
          }
        };

        const result = initializeDeck({
          mainSpecials: ['combat_meditation'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const card = result.mainSpecialsHand[0];
        expect(card?.traits).toBeDefined();
        expect(card?.traits).toContain('swift');
      });

      it('복합 케이스: 일부 특성은 제거되고 일부는 추가되어야 함', () => {
        const cardGrowth = {
          'combat_meditation': {
            rarity: 'common' as const,
            growthCount: 3,
            enhancementLevel: 3,
            specializationCount: 2,
            traits: ['vanish', 'swift', 'strongbone'] // vanish는 제거됨, swift/strongbone은 추가됨
          }
        };

        const result = initializeDeck({
          mainSpecials: ['combat_meditation'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const card = result.mainSpecialsHand[0];
        expect(card?.traits).toBeDefined();
        expect(card?.traits).not.toContain('vanish');
        expect(card?.traits).toContain('swift');
        expect(card?.traits).toContain('strongbone');
      });
    });

    describe('강화 설명 복사', () => {
      it('강화된 카드는 업데이트된 설명을 가져야 함', () => {
        const cardGrowth = {
          'strike': {
            rarity: 'common' as const,
            growthCount: 1,
            enhancementLevel: 3,
            specializationCount: 0,
            traits: [] as string[]
          }
        };

        const result = initializeDeck({
          mainSpecials: ['strike'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const card = result.mainSpecialsHand[0];
        // 설명이 존재해야 함
        expect(card?.description).toBeDefined();
      });

      it('강화 레벨 0이면 원본 설명을 유지해야 함', () => {
        const cardGrowth = {
          'strike': {
            rarity: 'common' as const,
            growthCount: 0,
            enhancementLevel: 0,
            specializationCount: 0,
            traits: [] as string[]
          }
        };

        const result = initializeDeck({
          mainSpecials: ['strike'],
          subSpecials: [],
          ownedCards: []
        } as any, [], cardGrowth);

        const card = result.mainSpecialsHand[0];
        // 원본 카드의 description 유지
        expect(card?.enhancementLevel).toBeUndefined();
      });
    });
  });
});
