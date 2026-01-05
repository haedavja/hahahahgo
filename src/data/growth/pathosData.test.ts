/**
 * @file pathosData.test.ts
 * @description 파토스 데이터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  TIER2_PATHOS,
  TIER4_PATHOS,
  TIER6_PATHOS,
  PATHOS,
  PATHOS_NODES,
  getPathosForLevel,
  getPathosNodeChoices,
  getPathosNodesForTier,
  MAX_EQUIPPED_PATHOS,
  type PathosType,
} from './pathosData';

describe('pathosData', () => {
  describe('TIER2_PATHOS', () => {
    it('12개의 2단계 파토스가 정의되어 있다', () => {
      expect(Object.keys(TIER2_PATHOS).length).toBe(12);
    });

    it('각 파토스에 필수 속성이 있다', () => {
      for (const pathos of Object.values(TIER2_PATHOS)) {
        expect(pathos).toHaveProperty('id');
        expect(pathos).toHaveProperty('name');
        expect(pathos).toHaveProperty('type');
        expect(pathos).toHaveProperty('description');
        expect(pathos).toHaveProperty('effect');
        expect(pathos).toHaveProperty('pyramidLevel');
      }
    });

    it('모든 2단계 파토스는 pyramidLevel 2', () => {
      for (const pathos of Object.values(TIER2_PATHOS)) {
        expect(pathos.pyramidLevel).toBe(2);
      }
    });

    it('검과 총 타입으로 구분된다', () => {
      const swordPathos = Object.values(TIER2_PATHOS).filter(p => p.type === 'sword');
      const gunPathos = Object.values(TIER2_PATHOS).filter(p => p.type === 'gun');

      expect(swordPathos.length).toBe(6);
      expect(gunPathos.length).toBe(6);
    });

    it('cross 파토스', () => {
      expect(TIER2_PATHOS.cross.name).toBe('교차');
      expect(TIER2_PATHOS.cross.type).toBe('sword');
      expect(TIER2_PATHOS.cross.nodeId).toBe('pierce');
    });

    it('armorPiercing 파토스', () => {
      expect(TIER2_PATHOS.armorPiercing.name).toBe('철갑탄');
      expect(TIER2_PATHOS.armorPiercing.type).toBe('gun');
      expect(TIER2_PATHOS.armorPiercing.cooldown).toBe(2);
    });
  });

  describe('TIER4_PATHOS', () => {
    it('10개의 4단계 파토스가 정의되어 있다', () => {
      expect(Object.keys(TIER4_PATHOS).length).toBe(10);
    });

    it('모든 4단계 파토스는 pyramidLevel 4', () => {
      for (const pathos of Object.values(TIER4_PATHOS)) {
        expect(pathos.pyramidLevel).toBe(4);
      }
    });

    it('검과 총 타입으로 구분된다', () => {
      const swordPathos = Object.values(TIER4_PATHOS).filter(p => p.type === 'sword');
      const gunPathos = Object.values(TIER4_PATHOS).filter(p => p.type === 'gun');

      expect(swordPathos.length).toBe(5);
      expect(gunPathos.length).toBe(5);
    });

    it('wayOfSword 파토스', () => {
      expect(TIER4_PATHOS.wayOfSword.name).toBe('검의 길');
      expect(TIER4_PATHOS.wayOfSword.effect.action).toBe('forceCross');
    });

    it('wanted 파토스', () => {
      expect(TIER4_PATHOS.wanted.name).toBe('원티드');
      expect(TIER4_PATHOS.wanted.effect.percent).toBe(100);
    });
  });

  describe('TIER6_PATHOS', () => {
    it('6개의 6단계 파토스가 정의되어 있다', () => {
      expect(Object.keys(TIER6_PATHOS).length).toBe(6);
    });

    it('모든 6단계 파토스는 pyramidLevel 6', () => {
      for (const pathos of Object.values(TIER6_PATHOS)) {
        expect(pathos.pyramidLevel).toBe(6);
      }
    });

    it('검과 총 타입으로 구분된다', () => {
      const swordPathos = Object.values(TIER6_PATHOS).filter(p => p.type === 'sword');
      const gunPathos = Object.values(TIER6_PATHOS).filter(p => p.type === 'gun');

      expect(swordPathos.length).toBe(3);
      expect(gunPathos.length).toBe(3);
    });

    it('trance 파토스', () => {
      expect(TIER6_PATHOS.trance.name).toBe('무아지경');
      expect(TIER6_PATHOS.trance.type).toBe('sword');
      expect(TIER6_PATHOS.trance.nodeId).toBe('ultimate');
    });

    it('barricade 파토스', () => {
      expect(TIER6_PATHOS.barricade.name).toBe('탄막');
      expect(TIER6_PATHOS.barricade.type).toBe('gun');
      expect(TIER6_PATHOS.barricade.cooldown).toBe(5);
    });
  });

  describe('PATHOS (통합)', () => {
    it('28개의 파토스가 통합되어 있다', () => {
      expect(Object.keys(PATHOS).length).toBe(28);
    });

    it('2단계, 4단계, 6단계 파토스가 모두 포함', () => {
      expect(PATHOS.cross).toBeDefined();
      expect(PATHOS.armorPiercing).toBeDefined();
      expect(PATHOS.wayOfSword).toBeDefined();
      expect(PATHOS.wanted).toBeDefined();
      expect(PATHOS.trance).toBeDefined();
      expect(PATHOS.barricade).toBeDefined();
    });
  });

  describe('PATHOS_NODES', () => {
    it('14개의 노드가 정의되어 있다', () => {
      expect(Object.keys(PATHOS_NODES).length).toBe(14);
    });

    it('각 노드에 필수 속성이 있다', () => {
      for (const node of Object.values(PATHOS_NODES)) {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('tier');
        expect(node).toHaveProperty('choices');
        expect(node).toHaveProperty('description');
        expect(node.choices.length).toBe(2);
      }
    });

    it('6개의 2단계 노드가 있다', () => {
      const tier2Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 2);
      expect(tier2Nodes.length).toBe(6);
    });

    it('5개의 4단계 노드가 있다', () => {
      const tier4Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 4);
      expect(tier4Nodes.length).toBe(5);
    });

    it('3개의 6단계 노드가 있다', () => {
      const tier6Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 6);
      expect(tier6Nodes.length).toBe(3);
    });

    it('pierce 노드', () => {
      expect(PATHOS_NODES.pierce.name).toBe('관통');
      expect(PATHOS_NODES.pierce.tier).toBe(2);
      expect(PATHOS_NODES.pierce.choices).toEqual(['cross', 'armorPiercing']);
    });

    it('ironman 노드', () => {
      expect(PATHOS_NODES.ironman.name).toBe('철인');
      expect(PATHOS_NODES.ironman.tier).toBe(4);
      expect(PATHOS_NODES.ironman.choices).toEqual(['wayOfSword', 'wanted']);
    });
  });

  describe('getPathosForLevel', () => {
    it('레벨 1이면 빈 배열', () => {
      const result = getPathosForLevel(1);
      expect(result).toEqual([]);
    });

    it('레벨 2이면 2단계 파토스 모두 반환', () => {
      const result = getPathosForLevel(2);
      expect(result.length).toBe(12);
      expect(result.every(p => p.pyramidLevel <= 2)).toBe(true);
    });

    it('레벨 4이면 2단계와 4단계 파토스 반환', () => {
      const result = getPathosForLevel(4);
      expect(result.length).toBe(22);
    });

    it('레벨 6이면 모든 파토스 반환', () => {
      const result = getPathosForLevel(6);
      expect(result.length).toBe(28);
    });

    it('타입 필터링 - sword', () => {
      const result = getPathosForLevel(6, 'sword');
      expect(result.every(p => p.type === 'sword')).toBe(true);
      expect(result.length).toBe(14);
    });

    it('타입 필터링 - gun', () => {
      const result = getPathosForLevel(6, 'gun');
      expect(result.every(p => p.type === 'gun')).toBe(true);
      expect(result.length).toBe(14);
    });

    it('레벨이 높아도 더 많이 반환되지 않음', () => {
      const level6 = getPathosForLevel(6);
      const level10 = getPathosForLevel(10);
      expect(level6.length).toBe(level10.length);
    });
  });

  describe('getPathosNodeChoices', () => {
    it('pierce 노드의 선택지 반환', () => {
      const result = getPathosNodeChoices('pierce');

      expect(result).not.toBeNull();
      expect(result![0].id).toBe('cross');
      expect(result![1].id).toBe('armorPiercing');
    });

    it('ironman 노드의 선택지 반환', () => {
      const result = getPathosNodeChoices('ironman');

      expect(result).not.toBeNull();
      expect(result![0].id).toBe('wayOfSword');
      expect(result![1].id).toBe('wanted');
    });

    it('존재하지 않는 노드는 null', () => {
      const result = getPathosNodeChoices('nonexistent');
      expect(result).toBeNull();
    });

    it('모든 노드의 선택지가 유효하다', () => {
      for (const nodeId of Object.keys(PATHOS_NODES)) {
        const result = getPathosNodeChoices(nodeId);
        expect(result).not.toBeNull();
        expect(result![0]).toBeDefined();
        expect(result![1]).toBeDefined();
      }
    });
  });

  describe('getPathosNodesForTier', () => {
    it('2단계 노드 6개 반환', () => {
      const result = getPathosNodesForTier(2);
      expect(result.length).toBe(6);
      expect(result.every(n => n.tier === 2)).toBe(true);
    });

    it('4단계 노드 5개 반환', () => {
      const result = getPathosNodesForTier(4);
      expect(result.length).toBe(5);
      expect(result.every(n => n.tier === 4)).toBe(true);
    });

    it('6단계 노드 3개 반환', () => {
      const result = getPathosNodesForTier(6);
      expect(result.length).toBe(3);
      expect(result.every(n => n.tier === 6)).toBe(true);
    });

    it('존재하지 않는 단계는 빈 배열', () => {
      const result = getPathosNodesForTier(3);
      expect(result).toEqual([]);
    });
  });

  describe('MAX_EQUIPPED_PATHOS', () => {
    it('최대 장착 슬롯은 3', () => {
      expect(MAX_EQUIPPED_PATHOS).toBe(3);
    });
  });

  describe('파토스 효과 타입 테스트', () => {
    it('addToken 효과', () => {
      expect(PATHOS.armorPiercing.effect.action).toBe('addToken');
      expect(PATHOS.armorPiercing.effect.token).toBe('armorPiercing');
    });

    it('onCrossBlock 효과', () => {
      expect(PATHOS.cross.effect.action).toBe('onCrossBlock');
      expect(PATHOS.cross.effect.value).toBe(4);
    });

    it('chainEvade 효과', () => {
      expect(PATHOS.dance.effect.action).toBe('chainEvade');
    });

    it('forceCross 효과', () => {
      expect(PATHOS.wayOfSword.effect.action).toBe('forceCross');
    });

    it('ignoreEvasion 효과', () => {
      expect(PATHOS.wanted.effect.action).toBe('ignoreEvasion');
      expect(PATHOS.wanted.effect.percent).toBe(100);
    });

    it('setSpeed 효과', () => {
      expect(PATHOS.lightSword.effect.action).toBe('setSpeed');
      expect(PATHOS.lightSword.effect.value).toBe(1);
    });

    it('aoe 효과', () => {
      expect(PATHOS.barrage.effect.action).toBe('aoe');
      expect(PATHOS.barrage.effect.target).toBe('all');
    });

    it('chainBonus 효과', () => {
      expect(PATHOS.swordDance.effect.action).toBe('chainBonus');
      expect(PATHOS.swordDance.effect.percent).toBe(50);
    });

    it('noFineseCost 효과 (6단계)', () => {
      expect(PATHOS.trance.effect.action).toBe('noFineseCost');
      expect(PATHOS.trance.effect.percent).toBe(50);
    });

    it('noAmmoCost 효과 (6단계)', () => {
      expect(PATHOS.barricade.effect.action).toBe('noAmmoCost');
      expect(PATHOS.barricade.effect.duration).toBe('turn');
    });

    it('guaranteeCross 효과 (6단계)', () => {
      expect(PATHOS.swordKing.effect.action).toBe('guaranteeCross');
      expect(PATHOS.swordKing.effect.value).toBe(2);
    });

    it('guaranteeCrit 효과 (6단계)', () => {
      expect(PATHOS.sniperKing.effect.action).toBe('guaranteeCrit');
      expect(PATHOS.sniperKing.effect.value).toBe(2);
    });
  });
});
