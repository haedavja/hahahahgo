/**
 * @file index.test.ts
 * @description 통합 게임 시뮬레이터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  GameSimulator,
  createGameSimulator,
  EventSimulator,
  ShopSimulator,
  RestSimulator,
  DungeonSimulator,
  MapSimulator,
  RunSimulator,
  createEventSimulator,
  createShopSimulator,
  createRestSimulator,
  createDungeonSimulator,
  createMapSimulator,
  createRunSimulator,
  createDefaultPlayer,
} from './index';

describe('게임 시뮬레이터 모듈 export', () => {
  describe('시뮬레이터 클래스 export', () => {
    it('EventSimulator가 export된다', () => {
      expect(EventSimulator).toBeDefined();
    });

    it('ShopSimulator가 export된다', () => {
      expect(ShopSimulator).toBeDefined();
    });

    it('RestSimulator가 export된다', () => {
      expect(RestSimulator).toBeDefined();
    });

    it('DungeonSimulator가 export된다', () => {
      expect(DungeonSimulator).toBeDefined();
    });

    it('MapSimulator가 export된다', () => {
      expect(MapSimulator).toBeDefined();
    });

    it('RunSimulator가 export된다', () => {
      expect(RunSimulator).toBeDefined();
    });

    it('GameSimulator가 export된다', () => {
      expect(GameSimulator).toBeDefined();
    });
  });

  describe('팩토리 함수 export', () => {
    it('createEventSimulator가 export된다', () => {
      expect(typeof createEventSimulator).toBe('function');
    });

    it('createShopSimulator가 export된다', () => {
      expect(typeof createShopSimulator).toBe('function');
    });

    it('createRestSimulator가 export된다', () => {
      expect(typeof createRestSimulator).toBe('function');
    });

    it('createDungeonSimulator가 export된다', () => {
      expect(typeof createDungeonSimulator).toBe('function');
    });

    it('createMapSimulator가 export된다', () => {
      expect(typeof createMapSimulator).toBe('function');
    });

    it('createRunSimulator가 export된다', () => {
      expect(typeof createRunSimulator).toBe('function');
    });

    it('createGameSimulator가 export된다', () => {
      expect(typeof createGameSimulator).toBe('function');
    });

    it('createDefaultPlayer가 export된다', () => {
      expect(typeof createDefaultPlayer).toBe('function');
    });
  });
});

describe('GameSimulator', () => {
  describe('constructor', () => {
    it('GameSimulator를 생성한다', () => {
      const simulator = new GameSimulator();
      expect(simulator).toBeDefined();
    });

    it('GameSimulator 인스턴스는 initialize 메서드를 가진다', () => {
      const simulator = new GameSimulator();
      expect(typeof simulator.initialize).toBe('function');
    });

    it('GameSimulator 인스턴스는 simulateRun 메서드를 가진다', () => {
      const simulator = new GameSimulator();
      expect(typeof simulator.simulateRun).toBe('function');
    });

    it('GameSimulator 인스턴스는 simulateMultipleRuns 메서드를 가진다', () => {
      const simulator = new GameSimulator();
      expect(typeof simulator.simulateMultipleRuns).toBe('function');
    });

    it('GameSimulator 인스턴스는 compareStrategies 메서드를 가진다', () => {
      const simulator = new GameSimulator();
      expect(typeof simulator.compareStrategies).toBe('function');
    });

    it('GameSimulator 인스턴스는 runBalanceTest 메서드를 가진다', () => {
      const simulator = new GameSimulator();
      expect(typeof simulator.runBalanceTest).toBe('function');
    });
  });
});

describe('createDefaultPlayer', () => {
  it('기본 플레이어 객체를 생성한다', () => {
    const player = createDefaultPlayer();
    expect(player).toBeDefined();
  });

  it('기본 플레이어는 hp를 가진다', () => {
    const player = createDefaultPlayer();
    expect(typeof player.hp).toBe('number');
    expect(player.hp).toBeGreaterThan(0);
  });

  it('기본 플레이어는 maxHp를 가진다', () => {
    const player = createDefaultPlayer();
    expect(typeof player.maxHp).toBe('number');
    expect(player.maxHp).toBeGreaterThan(0);
  });

  it('기본 플레이어는 gold를 가진다', () => {
    const player = createDefaultPlayer();
    expect(typeof player.gold).toBe('number');
  });

  it('기본 플레이어는 deck을 가진다', () => {
    const player = createDefaultPlayer();
    expect(Array.isArray(player.deck)).toBe(true);
  });

  it('기본 플레이어는 relics를 가진다', () => {
    const player = createDefaultPlayer();
    expect(Array.isArray(player.relics)).toBe(true);
  });

  it('기본 플레이어는 스탯을 가진다', () => {
    const player = createDefaultPlayer();
    expect(typeof player.strength).toBe('number');
    expect(typeof player.agility).toBe('number');
    expect(typeof player.insight).toBe('number');
  });
});

describe('팩토리 함수 실행', () => {
  it('createEventSimulator가 EventSimulator를 반환한다', async () => {
    const simulator = await createEventSimulator();
    expect(simulator).toBeInstanceOf(EventSimulator);
  });

  it('createShopSimulator가 ShopSimulator를 반환한다', async () => {
    const simulator = await createShopSimulator();
    expect(simulator).toBeInstanceOf(ShopSimulator);
  });

  it('createRestSimulator가 RestSimulator를 반환한다', () => {
    const simulator = createRestSimulator();
    expect(simulator).toBeInstanceOf(RestSimulator);
  });

  it('createDungeonSimulator가 DungeonSimulator를 반환한다', () => {
    const simulator = createDungeonSimulator();
    expect(simulator).toBeInstanceOf(DungeonSimulator);
  });

  it('createMapSimulator가 MapSimulator를 반환한다', () => {
    const simulator = createMapSimulator();
    expect(simulator).toBeInstanceOf(MapSimulator);
  });

  it('createRunSimulator가 RunSimulator를 반환한다', async () => {
    const simulator = await createRunSimulator();
    expect(simulator).toBeInstanceOf(RunSimulator);
  });
});
