// @ts-nocheck - Test file with type issues
/**
 * 타입 가드 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  isDefined,
  isString,
  isNumber,
  isObject,
  isArray,
  isCardType,
  isCardRarity,
  isCard,
  isPartialCard,
  isTokenInstance,
  isTokenState,
  createEmptyTokenState,
  isCombatant,
  isPlayerBattleState,
  isBattleEvent,
  isResources,
  isEnemyUnit,
  getNumber,
  getString,
  getArray,
  getObject,
  hasTrait,
  getSpeedCost,
  getLeisurePosition,
  getStrainOffset,
  isPlayerActor,
  isEnemyActor,
  mergeEntityState,
  // TokenEntity 가드
  isTokenEntity,
  asTokenEntity,
  getTokens,
  getHp,
  getBlock,
  getStrength,
  getEnergy,
  getEtherPts,
  updateTokens,
} from './guards';

describe('기본 타입 가드', () => {
  describe('isDefined', () => {
    it('null/undefined가 아닌 값은 true', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    it('null/undefined는 false', () => {
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('isString', () => {
    it('문자열은 true', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
    });

    it('문자열이 아닌 값은 false', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('숫자는 true', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
    });

    it('NaN은 false', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('숫자가 아닌 값은 false', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('객체는 true', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });

    it('배열, null은 false', () => {
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('배열은 true', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('배열이 아닌 값은 false', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
    });

    it('아이템 가드와 함께 사용', () => {
      expect(isArray([1, 2, 3], isNumber)).toBe(true);
      expect(isArray([1, 'two', 3], isNumber)).toBe(false);
    });
  });
});

describe('카드 타입 가드', () => {
  describe('isCardType', () => {
    it('유효한 카드 타입은 true', () => {
      expect(isCardType('attack')).toBe(true);
      expect(isCardType('defense')).toBe(true);
      expect(isCardType('support')).toBe(true);
    });

    it('유효하지 않은 타입은 false', () => {
      expect(isCardType('invalid')).toBe(false);
      expect(isCardType(123)).toBe(false);
    });
  });

  describe('isCardRarity', () => {
    it('유효한 희귀도는 true', () => {
      expect(isCardRarity('common')).toBe(true);
      expect(isCardRarity('legendary')).toBe(true);
    });

    it('유효하지 않은 희귀도는 false', () => {
      expect(isCardRarity('epic')).toBe(false);
    });
  });

  describe('isCard', () => {
    it('유효한 카드는 true', () => {
      const card = {
        id: 'strike',
        name: '타격',
        type: 'attack',
        speedCost: 8,
        actionCost: 1,
        description: '15 피해',
      };
      expect(isCard(card)).toBe(true);
    });

    it('필수 필드가 없으면 false', () => {
      expect(isCard({ id: 'test' })).toBe(false);
      expect(isCard(null)).toBe(false);
    });
  });

  describe('isPartialCard', () => {
    it('id만 있으면 true', () => {
      expect(isPartialCard({ id: 'test' })).toBe(true);
    });

    it('id가 없으면 false', () => {
      expect(isPartialCard({ name: 'test' })).toBe(false);
    });
  });
});

describe('토큰 타입 가드', () => {
  describe('isTokenInstance', () => {
    it('유효한 토큰 인스턴스는 true', () => {
      expect(isTokenInstance({ id: 'burn' })).toBe(true);
      expect(isTokenInstance({ id: 'burn', stacks: 3 })).toBe(true);
    });

    it('id가 없으면 false', () => {
      expect(isTokenInstance({ stacks: 3 })).toBe(false);
    });
  });

  describe('isTokenState', () => {
    it('유효한 TokenState는 true', () => {
      const state = {
        usage: [{ id: 'dodge', stacks: 1 }],
        turn: [],
        permanent: [],
      };
      expect(isTokenState(state)).toBe(true);
    });

    it('필수 배열이 없으면 false', () => {
      expect(isTokenState({ usage: [] })).toBe(false);
    });
  });

  describe('createEmptyTokenState', () => {
    it('빈 토큰 상태 생성', () => {
      const state = createEmptyTokenState();
      expect(state.usage).toEqual([]);
      expect(state.turn).toEqual([]);
      expect(state.permanent).toEqual([]);
    });
  });
});

describe('전투 참여자 타입 가드', () => {
  const validCombatant = {
    hp: 100,
    maxHp: 100,
    block: 0,
    tokens: { usage: [], turn: [], permanent: [] },
  };

  describe('isCombatant', () => {
    it('유효한 Combatant는 true', () => {
      expect(isCombatant(validCombatant)).toBe(true);
    });

    it('필수 필드가 없으면 false', () => {
      expect(isCombatant({ hp: 100 })).toBe(false);
    });
  });

  describe('isPlayerBattleState', () => {
    it('energy가 있으면 true', () => {
      const player = { ...validCombatant, energy: 6 };
      expect(isPlayerBattleState(player)).toBe(true);
    });

    it('energy가 없으면 false', () => {
      expect(isPlayerBattleState(validCombatant)).toBe(false);
    });
  });
});

describe('이벤트 타입 가드', () => {
  describe('isBattleEvent', () => {
    it('유효한 이벤트는 true', () => {
      expect(isBattleEvent({ actor: 'player', msg: '공격!' })).toBe(true);
    });

    it('필수 필드가 없으면 false', () => {
      expect(isBattleEvent({ actor: 'player' })).toBe(false);
    });
  });
});

describe('안전한 속성 접근', () => {
  const obj = { num: 42, str: 'hello', arr: [1, 2], nested: { a: 1 } };

  describe('getNumber', () => {
    it('숫자 값 반환', () => {
      expect(getNumber(obj, 'num')).toBe(42);
    });

    it('없으면 기본값 반환', () => {
      expect(getNumber(obj, 'missing')).toBe(0);
      expect(getNumber(obj, 'missing', 10)).toBe(10);
    });

    it('객체가 아니면 기본값', () => {
      expect(getNumber(null, 'num')).toBe(0);
    });
  });

  describe('getString', () => {
    it('문자열 값 반환', () => {
      expect(getString(obj, 'str')).toBe('hello');
    });

    it('없으면 기본값 반환', () => {
      expect(getString(obj, 'missing')).toBe('');
    });
  });

  describe('getArray', () => {
    it('배열 값 반환', () => {
      expect(getArray(obj, 'arr')).toEqual([1, 2]);
    });

    it('없으면 빈 배열 반환', () => {
      expect(getArray(obj, 'missing')).toEqual([]);
    });
  });

  describe('getObject', () => {
    it('객체 값 반환', () => {
      expect(getObject(obj, 'nested')).toEqual({ a: 1 });
    });

    it('없으면 빈 객체 반환', () => {
      expect(getObject(obj, 'missing')).toEqual({});
    });
  });
});

describe('유틸리티 가드', () => {
  describe('hasTrait', () => {
    it('특성이 있으면 true', () => {
      expect(hasTrait({ traits: ['leisure', 'chain'] }, 'leisure')).toBe(true);
    });

    it('특성이 없으면 false', () => {
      expect(hasTrait({ traits: ['chain'] }, 'leisure')).toBe(false);
      expect(hasTrait({}, 'leisure')).toBe(false);
    });
  });

  describe('getSpeedCost', () => {
    it('originalSpeedCost 우선', () => {
      expect(getSpeedCost({ originalSpeedCost: 10, speedCost: 8 })).toBe(10);
    });

    it('speedCost 사용', () => {
      expect(getSpeedCost({ speedCost: 8 })).toBe(8);
    });

    it('기본값 4', () => {
      expect(getSpeedCost({})).toBe(4);
      expect(getSpeedCost(null)).toBe(4);
    });
  });

  describe('getLeisurePosition', () => {
    it('leisurePosition 반환', () => {
      expect(getLeisurePosition({ leisurePosition: 12 })).toBe(12);
    });

    it('없으면 undefined', () => {
      expect(getLeisurePosition({})).toBeUndefined();
    });
  });

  describe('getStrainOffset', () => {
    it('strainOffset 반환', () => {
      expect(getStrainOffset({ strainOffset: 3 })).toBe(3);
    });

    it('없으면 0', () => {
      expect(getStrainOffset({})).toBe(0);
    });
  });
});

describe('TokenEntity 가드', () => {

  const validTokenState = { usage: [], turn: [], permanent: [] };
  const validEntity = {
    tokens: validTokenState,
    hp: 100,
    maxHp: 100,
    block: 5,
    strength: 2,
    energy: 6,
    etherPts: 50,
  };

  describe('isTokenEntity', () => {
    it('유효한 TokenEntity는 true', () => {
      expect(isTokenEntity(validEntity)).toBe(true);
    });

    it('tokens 없어도 true (선택적 필드)', () => {
      expect(isTokenEntity({ hp: 50 })).toBe(true);
    });

    it('null/undefined는 false', () => {
      expect(isTokenEntity(null)).toBe(false);
      expect(isTokenEntity(undefined)).toBe(false);
    });

    it('잘못된 tokens 형식은 false', () => {
      expect(isTokenEntity({ tokens: 'invalid' })).toBe(false);
      expect(isTokenEntity({ tokens: { usage: 'wrong' } })).toBe(false);
    });
  });

  describe('asTokenEntity', () => {
    it('유효한 객체를 TokenEntity로 변환', () => {
      const result = asTokenEntity(validEntity);
      expect(result.hp).toBe(100);
      expect(result.strength).toBe(2);
      expect(result.tokens).toEqual(validTokenState);
    });

    it('null이면 기본 TokenEntity 반환', () => {
      const result = asTokenEntity(null);
      expect(result.tokens).toEqual({ usage: [], turn: [], permanent: [] });
    });

    it('tokens 없으면 빈 tokens 생성', () => {
      const result = asTokenEntity({ hp: 50 });
      expect(result.tokens).toEqual({ usage: [], turn: [], permanent: [] });
      expect(result.hp).toBe(50);
    });
  });

  describe('getTokens', () => {
    it('tokens 반환', () => {
      expect(getTokens(validEntity)).toEqual(validTokenState);
    });

    it('없으면 빈 TokenState 반환', () => {
      expect(getTokens({})).toEqual({ usage: [], turn: [], permanent: [] });
      expect(getTokens(null)).toEqual({ usage: [], turn: [], permanent: [] });
    });
  });

  describe('엔티티 속성 접근', () => {
    it('getHp', () => {
      expect(getHp(validEntity)).toBe(100);
      expect(getHp({})).toBe(0);
    });

    it('getBlock', () => {
      expect(getBlock(validEntity)).toBe(5);
      expect(getBlock({})).toBe(0);
    });

    it('getStrength', () => {
      expect(getStrength(validEntity)).toBe(2);
      expect(getStrength({})).toBe(0);
    });

    it('getEnergy', () => {
      expect(getEnergy(validEntity)).toBe(6);
      expect(getEnergy({})).toBe(0);
    });

    it('getEtherPts', () => {
      expect(getEtherPts(validEntity)).toBe(50);
      expect(getEtherPts({})).toBe(0);
    });
  });

  describe('updateTokens', () => {
    it('tokens만 업데이트', () => {
      const newTokens = {
        usage: [{ id: 'test', stacks: 1 }],
        turn: [],
        permanent: [],
      };
      const result = updateTokens(validEntity, newTokens);
      expect(result.tokens).toEqual(newTokens);
      expect(result.hp).toBe(100);
    });
  });
});

describe('actor 타입 가드', () => {
  describe('isPlayerActor', () => {
    it('player는 true', () => {
      expect(isPlayerActor('player')).toBe(true);
    });

    it('enemy는 false', () => {
      expect(isPlayerActor('enemy')).toBe(false);
    });

    it('다른 문자열은 false', () => {
      expect(isPlayerActor('ally')).toBe(false);
      expect(isPlayerActor('')).toBe(false);
    });
  });

  describe('isEnemyActor', () => {
    it('enemy는 true', () => {
      expect(isEnemyActor('enemy')).toBe(true);
    });

    it('player는 false', () => {
      expect(isEnemyActor('player')).toBe(false);
    });

    it('다른 문자열은 false', () => {
      expect(isEnemyActor('ally')).toBe(false);
      expect(isEnemyActor('')).toBe(false);
    });
  });
});

describe('isResources', () => {
  it('빈 객체는 true', () => {
    expect(isResources({})).toBe(true);
  });

  it('리소스 객체는 true', () => {
    expect(isResources({ gold: 100, hp: 50 })).toBe(true);
  });

  it('null은 false', () => {
    expect(isResources(null)).toBe(false);
  });

  it('undefined는 false', () => {
    expect(isResources(undefined)).toBe(false);
  });

  it('문자열은 false', () => {
    expect(isResources('resources')).toBe(false);
  });

  it('배열은 false', () => {
    expect(isResources([1, 2, 3])).toBe(false);
  });
});

describe('isEnemyUnit', () => {
  const validTokens = {
    usage: [],
    turn: [],
    permanent: [],
  };

  it('유효한 EnemyUnit은 true', () => {
    const validEnemy = {
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: validTokens,
      name: 'Goblin',
    };
    expect(isEnemyUnit(validEnemy)).toBe(true);
  });

  it('Combatant 속성이 있으면 true', () => {
    const combatant = {
      hp: 30,
      maxHp: 30,
      block: 5,
      tokens: validTokens,
    };
    expect(isEnemyUnit(combatant)).toBe(true);
  });

  it('빈 객체는 false (Combatant가 아님)', () => {
    expect(isEnemyUnit({})).toBe(false);
  });

  it('null은 false', () => {
    expect(isEnemyUnit(null)).toBe(false);
  });
});

describe('mergeEntityState', () => {
  it('두 객체를 병합한다', () => {
    const current = { hp: 100, gold: 50 };
    const updates = { hp: 80 };
    const result = mergeEntityState(current, updates);
    expect(result).toEqual({ hp: 80, gold: 50 });
  });

  it('새 속성을 추가한다', () => {
    const current = { hp: 100 };
    const updates = { gold: 50 };
    const result = mergeEntityState(current, updates);
    expect(result).toEqual({ hp: 100, gold: 50 });
  });

  it('원본을 변경하지 않는다', () => {
    const current = { hp: 100 };
    const updates = { hp: 50 };
    mergeEntityState(current, updates);
    expect(current.hp).toBe(100);
  });
});
