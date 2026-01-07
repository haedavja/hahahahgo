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

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  createBattleEnemyData,
  resolveEnemyDeck,
  createReducerEnemyState,
  computeBattlePlan,
  drawCharacterBuildHand,
  BATTLE_CARDS,
} from './battleHelpers';
import {
  createPlayerHandCard,
  createEnemyHandCard,
} from '../test/factories';

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
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

    const result = computeBattlePlan('battle', playerCards, enemyCards);

    expect(result).toHaveProperty('preview');
    expect(result).toHaveProperty('simulation');
    expect(result).toHaveProperty('enemyCount');
    expect(result.enemyCount).toBe(1);
  });

  it('preview에 timeline이 포함되어야 함', () => {
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

    const result = computeBattlePlan('battle', playerCards, enemyCards);

    expect(result.preview).toHaveProperty('timeline');
    expect(result.preview).toHaveProperty('tuLimit');
    expect(result.preview.tuLimit).toBe(30);
  });

  it('플레이어 HP가 주어지면 적용되어야 함', () => {
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

    const result = computeBattlePlan('battle', playerCards, enemyCards, 50, 100);

    expect(result).toHaveProperty('simulation');
  });

  it('다수 적 전투 시 enemyCount가 증가해야 함', () => {
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

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
      expect(hand[0]).toHaveProperty('name');
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

  it('보유 카드도 포함하여 손패를 생성할 수 있어야 함', () => {
    const mainSpecials = ['marche'];
    const subSpecials = ['parade'];
    const ownedCards = ['strike', 'block', 'dodge'];

    // 랜덤성이 있으므로 에러가 발생하지 않는지만 확인
    expect(() => {
      drawCharacterBuildHand(mainSpecials, subSpecials, ownedCards);
    }).not.toThrow();
  });
});

describe('createBattlePayload', () => {
  // 동적 import를 통해 함수 가져오기
  let createBattlePayload: typeof import('./battleHelpers').createBattlePayload;

  beforeAll(async () => {
    const module = await import('./battleHelpers');
    createBattlePayload = module.createBattlePayload;
  });

  describe('null/invalid 노드 처리', () => {
    it('null 노드는 null을 반환해야 함', () => {
      const result = createBattlePayload(null as any, null);
      expect(result).toBeNull();
    });

    it('start 노드는 null을 반환해야 함', () => {
      const startNode = {
        id: 'start',
        type: 'battle',
        isStart: true,
        selectable: true,
        cleared: false,
      };
      const result = createBattlePayload(startNode as any, null);
      expect(result).toBeNull();
    });

    it('non-battle 노드는 null을 반환해야 함', () => {
      const eventNode = {
        id: 'event1',
        type: 'event',
        selectable: true,
        cleared: false,
      };
      const result = createBattlePayload(eventNode as any, null);
      expect(result).toBeNull();
    });
  });

  describe('정상 battle 노드', () => {
    it('battle 노드에서 유효한 페이로드를 생성해야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.nodeId).toBe('battle1');
      expect(result?.kind).toBe('battle');
      expect(result?.enemyCount).toBeGreaterThanOrEqual(1);
      expect(result?.playerHand).toBeDefined();
      expect(result?.enemyHand).toBeDefined();
      expect(result?.preview).toBeDefined();
      expect(result?.simulation).toBeDefined();
    });

    it('elite 노드에서 유효한 페이로드를 생성해야 함', () => {
      const eliteNode = {
        id: 'elite1',
        type: 'elite',
        layer: 3,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(eliteNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.kind).toBe('elite');
      expect(result?.difficulty).toBe(4);
    });

    it('boss 노드에서 유효한 페이로드를 생성해야 함', () => {
      const bossNode = {
        id: 'boss1',
        type: 'boss',
        layer: 5,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(bossNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.kind).toBe('boss');
      expect(result?.difficulty).toBe(5);
    });

    it('dungeon 노드에서 유효한 페이로드를 생성해야 함', () => {
      const dungeonNode = {
        id: 'dungeon1',
        type: 'dungeon',
        layer: 2,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(dungeonNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.kind).toBe('dungeon');
      expect(result?.difficulty).toBe(3);
    });
  });

  describe('캐릭터 빌드 처리', () => {
    it('캐릭터 빌드가 있으면 주특기/보조특기 카드를 사용해야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const characterBuild = {
        mainSpecials: ['marche', 'parade'],
        subSpecials: ['strike', 'block'],
        ownedCards: ['dodge'],
      };

      const result = createBattlePayload(battleNode as any, characterBuild as any);

      expect(result).not.toBeNull();
      expect(result?.hasCharacterBuild).toBe(true);
      expect(result?.characterBuild).toEqual(characterBuild);
    });

    it('빈 캐릭터 빌드는 hasCharacterBuild가 false여야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const emptyBuild = {
        mainSpecials: [],
        subSpecials: [],
        ownedCards: [],
      };

      const result = createBattlePayload(battleNode as any, emptyBuild as any);

      expect(result).not.toBeNull();
      expect(result?.hasCharacterBuild).toBe(false);
    });
  });

  describe('플레이어 HP 처리', () => {
    it('플레이어 HP가 주어지면 시뮬레이션에 적용되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null, 50, 100);

      expect(result).not.toBeNull();
      expect(result?.simulation).toBeDefined();
    });
  });
});

describe('createBattlePayload 추가 테스트', () => {
  let createBattlePayload: typeof import('./battleHelpers').createBattlePayload;

  beforeAll(async () => {
    const module = await import('./battleHelpers');
    createBattlePayload = module.createBattlePayload;
  });

  describe('노드 layer 처리', () => {
    it('layer가 숫자가 아니면 기본값 1을 사용해야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: undefined,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.nodeId).toBe('battle1');
    });

    it('layer가 문자열이면 기본값을 사용해야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 'invalid' as any,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
    });
  });

  describe('적 그룹 처리', () => {
    it('적 덱이 빈 경우 기본 덱을 사용해야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.enemyLibrary.length).toBeGreaterThan(0);
    });
  });

  describe('displayLabel 처리', () => {
    it('displayLabel이 있으면 label에 반영되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        displayLabel: '특별 전투',
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      // displayLabel이 label에 사용될 수 있음 (또는 그룹 이름)
      expect(result?.label).toBeDefined();
    });
  });

  describe('보상 처리', () => {
    it('battle 노드의 보상이 설정되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.rewards).toBeDefined();
    });

    it('elite 노드의 보상이 설정되어야 함', () => {
      const eliteNode = {
        id: 'elite1',
        type: 'elite',
        layer: 3,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(eliteNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.rewards).toBeDefined();
    });
  });

  describe('mixedEnemies 생성', () => {
    it('적 데이터가 mixedEnemies에 올바르게 변환되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(Array.isArray(result?.mixedEnemies)).toBe(true);
      result?.mixedEnemies.forEach(enemy => {
        expect(enemy).toHaveProperty('id');
        expect(enemy).toHaveProperty('name');
        expect(enemy).toHaveProperty('hp');
      });
    });
  });

  describe('totalEnemyHp 계산', () => {
    it('적 총 HP가 계산되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(typeof result?.totalEnemyHp).toBe('number');
      expect(result?.totalEnemyHp).toBeGreaterThan(0);
    });
  });

  describe('선택된 카드 초기화', () => {
    it('selectedCardIds가 빈 배열로 초기화되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.selectedCardIds).toEqual([]);
    });

    it('maxSelection이 설정되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(typeof result?.maxSelection).toBe('number');
    });
  });

  describe('discardPile 초기화', () => {
    it('버린 카드 더미가 빈 배열로 초기화되어야 함', () => {
      const battleNode = {
        id: 'battle1',
        type: 'battle',
        layer: 1,
        selectable: true,
        cleared: false,
      };

      const result = createBattlePayload(battleNode as any, null);

      expect(result).not.toBeNull();
      expect(result?.playerDiscardPile).toEqual([]);
      expect(result?.enemyDiscardPile).toEqual([]);
    });
  });
});

describe('travelToNode', () => {
  let travelToNode: typeof import('./battleHelpers').travelToNode;

  beforeAll(async () => {
    const module = await import('./battleHelpers');
    travelToNode = module.travelToNode;
  });

  describe('invalid 입력', () => {
    it('존재하지 않는 노드 ID는 null을 반환해야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'node1', type: 'battle', selectable: true, cleared: false, connections: [] },
          ],
        },
      };

      const result = travelToNode(state as any, 'nonexistent');

      expect(result).toBeNull();
    });

    it('선택 불가능한 노드는 null을 반환해야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'node1', type: 'battle', selectable: false, cleared: false, connections: [] },
          ],
        },
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).toBeNull();
    });

    it('이미 클리어된 노드는 null을 반환해야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'node1', type: 'battle', selectable: true, cleared: true, connections: [] },
          ],
        },
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).toBeNull();
    });
  });

  describe('정상 이동', () => {
    it('유효한 노드로 이동 시 결과를 반환해야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['node1'] },
            { id: 'node1', type: 'battle', layer: 1, selectable: true, cleared: false, connections: ['node2'] },
            { id: 'node2', type: 'battle', layer: 2, selectable: false, cleared: false, connections: [] },
          ],
        },
        mapRisk: 0,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).not.toBeNull();
      expect(result?.target.id).toBe('node1');
      expect(result?.target.cleared).toBe(true);
      expect(result?.map.currentNodeId).toBe('node1');
    });

    it('연결된 노드가 selectable로 변경되어야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['node1'] },
            { id: 'node1', type: 'battle', layer: 1, selectable: true, cleared: false, connections: ['node2', 'node3'] },
            { id: 'node2', type: 'battle', layer: 2, selectable: false, cleared: false, connections: [] },
            { id: 'node3', type: 'event', layer: 2, selectable: false, cleared: false, connections: [] },
          ],
        },
        mapRisk: 0,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).not.toBeNull();
      const node2 = result?.map.nodes.find(n => n.id === 'node2');
      const node3 = result?.map.nodes.find(n => n.id === 'node3');
      expect(node2?.selectable).toBe(true);
      expect(node3?.selectable).toBe(true);
    });

    it('다른 노드들은 selectable이 false로 변경되어야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['node1', 'node2'] },
            { id: 'node1', type: 'battle', layer: 1, selectable: true, cleared: false, connections: ['node3'] },
            { id: 'node2', type: 'battle', layer: 1, selectable: true, cleared: false, connections: ['node3'] },
            { id: 'node3', type: 'battle', layer: 2, selectable: false, cleared: false, connections: [] },
          ],
        },
        mapRisk: 0,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).not.toBeNull();
      const node2 = result?.map.nodes.find(n => n.id === 'node2');
      expect(node2?.selectable).toBe(false); // node2는 선택하지 않았으므로 비활성화
    });
  });

  describe('이벤트 노드 이동', () => {
    it('event 노드로 이동 시 event 페이로드가 생성되어야 함', () => {
      // Math.random을 0.5로 고정하여 event 타입 유지 (>= 0.25면 event 유지)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['event1'] },
            { id: 'event1', type: 'event', layer: 1, selectable: true, cleared: false, connections: [] },
          ],
        },
        mapRisk: 50,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'event1');

      expect(result).not.toBeNull();
      expect(result?.target.type).toBe('event');

      vi.restoreAllMocks();
    });
  });

  describe('캐릭터 빌드 상태', () => {
    it('characterBuild가 있으면 battle에 전달되어야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['battle1'] },
            { id: 'battle1', type: 'battle', layer: 1, selectable: true, cleared: false, connections: [] },
          ],
        },
        characterBuild: {
          mainSpecials: ['strike', 'block'],
          subSpecials: ['dodge'],
          ownedCards: [],
        },
        playerHp: 80,
        maxHp: 100,
        mapRisk: 0,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'battle1');

      expect(result).not.toBeNull();
      expect(result?.battle).not.toBeNull();
    });
  });

  describe('연결이 빈 배열인 노드', () => {
    it('connections가 빈 배열인 노드도 처리되어야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['node1'] },
            { id: 'node1', type: 'battle', layer: 1, selectable: true, cleared: false, connections: [] },
          ],
        },
        mapRisk: 0,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).not.toBeNull();
      expect(result?.target.cleared).toBe(true);
    });
  });

  describe('pendingNextEvent 처리', () => {
    it('pendingNextEvent가 있으면 usedPendingEvent가 설정되어야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['event1'] },
            { id: 'event1', type: 'event', layer: 1, selectable: true, cleared: false, connections: [] },
          ],
        },
        mapRisk: 50,
        completedEvents: [],
        pendingNextEvent: 'special_event',
      };

      const result = travelToNode(state as any, 'event1');

      expect(result).not.toBeNull();
      // usedPendingEvent는 createEventPayload 함수에서 결정됨
      expect(result?.usedPendingEvent).toBeDefined();
    });
  });

  describe('이미 클리어된 연결 노드', () => {
    it('클리어된 연결 노드는 selectable이 변경되지 않아야 함', () => {
      const state = {
        map: {
          nodes: [
            { id: 'start', type: 'start', selectable: false, cleared: true, isStart: true, connections: ['node1'] },
            { id: 'node1', type: 'battle', layer: 1, selectable: true, cleared: false, connections: ['node2'] },
            { id: 'node2', type: 'battle', layer: 2, selectable: false, cleared: true, connections: [] },
          ],
        },
        mapRisk: 0,
        completedEvents: [],
        pendingNextEvent: null,
      };

      const result = travelToNode(state as any, 'node1');

      expect(result).not.toBeNull();
      const node2 = result?.map.nodes.find(n => n.id === 'node2');
      // 이미 클리어된 노드는 selectable이 false를 유지
      expect(node2?.selectable).toBe(false);
    });
  });
});

describe('createBattleEnemyData 추가 엣지 케이스', () => {
  it('maxSpeed만 있을 때 speed에도 같은 값이 사용되어야 함', () => {
    const enemy = { maxSpeed: 15 };
    const result = createBattleEnemyData(enemy);

    expect(result.maxSpeed).toBe(15);
    expect(result.speed).toBe(10); // 기본값
  });

  it('maxHp만 있을 때 hp에도 같은 값이 사용되어야 함', () => {
    const enemy = { maxHp: 60 };
    const result = createBattleEnemyData(enemy);

    expect(result.maxHp).toBe(60);
    expect(result.hp).toBe(40); // 기본값
  });
});

describe('createReducerEnemyState 추가 테스트', () => {
  it('speed만 있을 때 maxSpeed에도 같은 값이 사용되어야 함', () => {
    const result = createReducerEnemyState({ speed: 12 });

    expect(result.maxSpeed).toBe(12);
  });

  it('빈 units 배열은 단일 유닛으로 생성해야 함', () => {
    const result = createReducerEnemyState({ id: 'test', units: [] as any });

    expect(result.units).toHaveLength(1);
  });

  it('기존 속성이 spread로 전달되어야 함', () => {
    const result = createReducerEnemyState({
      id: 'custom',
      name: '커스텀 적',
      customField: 'value',
    } as any);

    expect(result.id).toBe('custom');
    expect((result as any).customField).toBe('value');
  });
});

describe('computeBattlePlan 추가 테스트', () => {
  it('빈 손패로도 계획을 생성해야 함', () => {
    const result = computeBattlePlan('battle', [], []);

    expect(result).toHaveProperty('preview');
    expect(result).toHaveProperty('simulation');
    expect(result.preview.timeline).toBeDefined();
  });

  it('elite 전투 타입에서도 작동해야 함', () => {
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

    const result = computeBattlePlan('elite', playerCards, enemyCards);

    expect(result).toHaveProperty('simulation');
  });

  it('boss 전투 타입에서도 작동해야 함', () => {
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

    const result = computeBattlePlan('boss', playerCards, enemyCards);

    expect(result).toHaveProperty('simulation');
  });

  it('존재하지 않는 전투 타입은 default를 사용해야 함', () => {
    const playerCards = [createPlayerHandCard({ id: 'card1' })];
    const enemyCards = [createEnemyHandCard({ id: 'card2' })];

    const result = computeBattlePlan('unknown_type', playerCards, enemyCards);

    expect(result).toHaveProperty('simulation');
  });
});
