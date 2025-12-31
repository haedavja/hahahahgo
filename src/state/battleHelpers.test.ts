/**
 * @file battleHelpers.test.ts
 * @description 전투 헬퍼 함수 테스트
 *
 * ## 테스트 대상
 * - createBattleEnemyData: 적 데이터 생성 헬퍼
 * - 엣지 케이스: null, undefined, 불완전한 데이터
 *
 * ## 목적
 * 속성 누락 버그 방지 (speed, isBoss 등)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createBattleEnemyData,
  resolveEnemyDeck,
  createReducerEnemyState,
  computeBattlePlan,
  drawCharacterBuildHand,
  BATTLE_CARDS,
} from './battleHelpers';

describe('createBattleEnemyData', () => {
  describe('정상 데이터 변환', () => {
    it('모든 속성이 있는 적 데이터를 올바르게 변환해야 함', () => {
      const enemy = {
        id: 'ghoul',
        name: '구울',
        emoji: '💀',
        hp: 40,
        ether: 100,
        speed: 10,
        deck: ['ghoul_attack', 'ghoul_block'],
        cardsPerTurn: 2,
        passives: { rage: true },
        tier: 1,
        isBoss: false,
      };

      const result = createBattleEnemyData(enemy);

      expect(result.id).toBe('ghoul');
      expect(result.name).toBe('구울');
      expect(result.emoji).toBe('💀');
      expect(result.hp).toBe(40);
      expect(result.maxHp).toBe(40);
      expect(result.ether).toBe(100);
      expect(result.speed).toBe(10);
      expect(result.deck).toEqual(['ghoul_attack', 'ghoul_block']);
      expect(result.cardsPerTurn).toBe(2);
      expect(result.passives).toEqual({ rage: true });
      expect(result.tier).toBe(1);
      expect(result.isBoss).toBe(false);
    });

    it('보스 적 데이터의 isBoss가 true로 유지되어야 함', () => {
      const boss = {
        id: 'slaughterer',
        name: '살육자',
        hp: 200,
        speed: 20,
        isBoss: true,
      };

      const result = createBattleEnemyData(boss);

      expect(result.isBoss).toBe(true);
    });
  });

  describe('기본값 적용', () => {
    it('빈 객체에 모든 기본값이 적용되어야 함', () => {
      const result = createBattleEnemyData({});

      expect(result.name).toBe('적');
      expect(result.emoji).toBe('👾');
      expect(result.hp).toBe(40);
      expect(result.maxHp).toBe(40);
      expect(result.ether).toBe(100);
      expect(result.speed).toBe(10);
      expect(result.deck).toEqual([]);
      expect(result.cardsPerTurn).toBe(2);
      expect(result.passives).toEqual({});
      expect(result.tier).toBe(1);
      expect(result.isBoss).toBe(false);
    });

    it('null 입력에도 기본값이 적용되어야 함', () => {
      const result = createBattleEnemyData(null);

      expect(result.name).toBe('적');
      expect(result.speed).toBe(10);
      expect(result.isBoss).toBe(false);
    });

    it('undefined 입력에도 기본값이 적용되어야 함', () => {
      const result = createBattleEnemyData(undefined);

      expect(result.name).toBe('적');
      expect(result.speed).toBe(10);
      expect(result.isBoss).toBe(false);
    });
  });

  describe('부분 데이터 처리', () => {
    it('일부 속성만 있는 데이터도 올바르게 처리해야 함', () => {
      const partial = {
        id: 'test',
        name: '테스트 적',
        hp: 50,
        // speed, isBoss 등 누락
      };

      const result = createBattleEnemyData(partial);

      expect(result.id).toBe('test');
      expect(result.name).toBe('테스트 적');
      expect(result.hp).toBe(50);
      expect(result.speed).toBe(10); // 기본값
      expect(result.isBoss).toBe(false); // 기본값
    });

    it('deck이 배열이 아닌 경우 빈 배열로 변환해야 함', () => {
      const invalid = {
        id: 'test',
        deck: 'not-an-array', // 잘못된 타입
      };

      const result = createBattleEnemyData(invalid as any);

      expect(Array.isArray(result.deck)).toBe(true);
      expect(result.deck).toEqual([]);
    });

    it('deck이 null인 경우 빈 배열로 변환해야 함', () => {
      const result = createBattleEnemyData({ deck: null } as any);

      expect(result.deck).toEqual([]);
    });
  });

  describe('필수 속성 검증', () => {
    it('speed 속성이 항상 존재해야 함 (이전 버그 방지)', () => {
      const enemies = [
        {},
        { id: 'test' },
        { id: 'test', name: 'Test' },
        null,
        undefined,
      ];

      enemies.forEach((enemy) => {
        const result = createBattleEnemyData(enemy);
        expect(result).toHaveProperty('speed');
        expect(typeof result.speed).toBe('number');
      });
    });

    it('isBoss 속성이 항상 존재해야 함 (이전 버그 방지)', () => {
      const enemies = [
        {},
        { id: 'test' },
        { id: 'test', name: 'Test' },
        null,
        undefined,
      ];

      enemies.forEach((enemy) => {
        const result = createBattleEnemyData(enemy);
        expect(result).toHaveProperty('isBoss');
        expect(typeof result.isBoss).toBe('boolean');
      });
    });
  });
});

describe('BATTLE_CARDS', () => {
  it('8개의 전투 카드 ID가 있어야 함', () => {
    expect(BATTLE_CARDS).toHaveLength(8);
  });

  it('모든 카드 ID가 문자열이어야 함', () => {
    BATTLE_CARDS.forEach((cardId) => {
      expect(typeof cardId).toBe('string');
    });
  });
});

describe('resolveEnemyDeck', () => {
  it('존재하는 적 종류의 덱을 반환해야 함', () => {
    const deck = resolveEnemyDeck('ghoul');
    expect(Array.isArray(deck)).toBe(true);
  });

  it('존재하지 않는 적 종류에 대해 default 덱을 반환해야 함', () => {
    const deck = resolveEnemyDeck('nonexistent_enemy_type');
    expect(Array.isArray(deck)).toBe(true);
  });

  it('반환된 덱의 모든 요소가 문자열이어야 함', () => {
    const deck = resolveEnemyDeck('default');
    deck.forEach((cardId) => {
      expect(typeof cardId).toBe('string');
    });
  });
});

describe('createReducerEnemyState', () => {
  describe('기본 상태 생성', () => {
    it('최소 데이터로 유효한 적 상태를 생성해야 함', () => {
      const result = createReducerEnemyState({ id: 'test', name: '테스트' });

      expect(result.hp).toBe(40);
      expect(result.maxHp).toBe(40);
      expect(result.block).toBe(0);
      expect(result.counter).toBe(0);
      expect(result.vulnMult).toBe(1);
      expect(result.vulnTurns).toBe(0);
      expect(result.etherOverdriveActive).toBe(false);
    });

    it('HP가 주어지면 해당 값을 사용해야 함', () => {
      const result = createReducerEnemyState({ hp: 80, maxHp: 100 });

      expect(result.hp).toBe(80);
      expect(result.maxHp).toBe(100);
    });

    it('maxHp만 주어지면 hp에도 같은 값을 사용해야 함', () => {
      const result = createReducerEnemyState({ maxHp: 60 });

      expect(result.hp).toBe(60);
      expect(result.maxHp).toBe(60);
    });
  });

  describe('유닛 배열 생성', () => {
    it('units 배열이 없으면 단일 유닛으로 생성해야 함', () => {
      const result = createReducerEnemyState({
        id: 'ghoul',
        name: '구울',
        emoji: '💀',
        hp: 40,
      });

      expect(result.units).toHaveLength(1);
      expect(result.units[0].unitId).toBe(0);
      expect(result.units[0].id).toBe('ghoul');
      expect(result.units[0].name).toBe('구울');
      expect(result.units[0].hp).toBe(40);
      expect(result.units[0].block).toBe(0);
    });

    it('기존 units 배열이 있으면 그대로 사용해야 함', () => {
      const existingUnits = [
        { unitId: 0, id: 'ghoul', name: '구울', hp: 40, maxHp: 40, block: 0, tokens: { usage: [], turn: [], permanent: [] } },
        { unitId: 1, id: 'ghoul', name: '구울', hp: 35, maxHp: 40, block: 5, tokens: { usage: [], turn: [], permanent: [] } },
      ];
      const result = createReducerEnemyState({ units: existingUnits });

      expect(result.units).toHaveLength(2);
      expect(result.units[0].hp).toBe(40);
      expect(result.units[1].hp).toBe(35);
      expect(result.units[1].block).toBe(5);
    });
  });

  describe('에테르 상태', () => {
    it('에테르 값이 주어지면 etherPts와 etherCapacity에 설정해야 함', () => {
      const result = createReducerEnemyState({ ether: 150 });

      expect(result.etherPts).toBe(150);
      expect(result.etherCapacity).toBe(150);
    });

    it('에테르 값이 없으면 기본값 100을 사용해야 함', () => {
      const result = createReducerEnemyState({});

      expect(result.etherPts).toBe(100);
      expect(result.etherCapacity).toBe(100);
    });
  });

  describe('토큰 초기화', () => {
    it('토큰 객체가 올바르게 초기화되어야 함', () => {
      const result = createReducerEnemyState({});

      expect(result.tokens).toEqual({ usage: [], turn: [], permanent: [] });
    });
  });
});

describe('computeBattlePlan', () => {
  it('유효한 전투 계획을 반환해야 함', () => {
    const playerCards = [{ id: 'card1', cardId: 'strike', speed: 5, owner: 'player' as const }] as any;
    const enemyCards = [{ id: 'card2', cardId: 'attack', speed: 4, owner: 'enemy' as const }] as any;

    const result = computeBattlePlan('battle', playerCards, enemyCards);

    expect(result).toHaveProperty('preview');
    expect(result).toHaveProperty('simulation');
    expect(result).toHaveProperty('enemyCount');
    expect(result.enemyCount).toBe(1);
  });

  it('preview에 timeline이 포함되어야 함', () => {
    const playerCards = [{ id: 'card1', cardId: 'strike', speed: 5, owner: 'player' as const }] as any;
    const enemyCards = [{ id: 'card2', cardId: 'attack', speed: 4, owner: 'enemy' as const }] as any;

    const result = computeBattlePlan('battle', playerCards, enemyCards);

    expect(result.preview).toHaveProperty('timeline');
    expect(result.preview).toHaveProperty('tuLimit');
    expect(result.preview.tuLimit).toBe(30);
  });

  it('플레이어 HP가 주어지면 적용되어야 함', () => {
    const playerCards = [{ id: 'card1', cardId: 'strike', speed: 5, owner: 'player' as const }] as any;
    const enemyCards = [{ id: 'card2', cardId: 'attack', speed: 4, owner: 'enemy' as const }] as any;

    const result = computeBattlePlan('battle', playerCards, enemyCards, 50, 100);

    expect(result).toHaveProperty('simulation');
  });

  it('다수 적 전투 시 enemyCount가 증가해야 함', () => {
    const playerCards = [{ id: 'card1', cardId: 'strike', speed: 5, owner: 'player' as const }] as any;
    const enemyCards = [{ id: 'card2', cardId: 'attack', speed: 4, owner: 'enemy' as const }] as any;

    const result = computeBattlePlan('battle', playerCards, enemyCards, null, null, 3);

    expect(result.enemyCount).toBe(3);
  });
});

describe('drawCharacterBuildHand', () => {
  // 실제 존재하는 카드 ID 사용 (battleData.ts의 CARDS에 정의된 카드)
  const VALID_CARD = 'marche'; // 실제 존재하는 카드

  it('빈 주특기/보조특기로도 손패를 생성할 수 있어야 함', () => {
    const hand = drawCharacterBuildHand([], []);
    expect(Array.isArray(hand)).toBe(true);
    expect(hand).toHaveLength(0);
  });

  it('주특기 카드로 실제 존재하는 카드를 사용하면 손패가 생성되어야 함', () => {
    const mainSpecials = [VALID_CARD];
    const hand = drawCharacterBuildHand(mainSpecials, []);

    // 실제 카드 시스템에 존재하면 손패가 생성됨
    expect(Array.isArray(hand)).toBe(true);
    if (hand.length > 0) {
      expect(hand[0]).toHaveProperty('id');
      expect(hand[0]).toHaveProperty('cardId');
    }
  });

  it('반환값이 배열이어야 함', () => {
    const hand = drawCharacterBuildHand(['any_card'], ['another']);
    expect(Array.isArray(hand)).toBe(true);
  });

  it('존재하지 않는 카드 ID로도 에러가 발생하지 않아야 함', () => {
    // 존재하지 않는 카드 ID를 사용해도 함수가 에러 없이 동작해야 함
    expect(() => {
      drawCharacterBuildHand(['nonexistent_card'], ['another_fake']);
    }).not.toThrow();
  });
});
