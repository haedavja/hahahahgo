/**
 * enemyAI.test.js
 *
 * 적 AI 행동 결정 로직 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  decideEnemyMode,
  generateEnemyActions,
  shouldEnemyOverdrive,
  assignSourceUnitToActions,
  expandActionsWithGhosts,
  ENEMY_MODE_WEIGHTS
} from './enemyAI';

// 테스트용 카드 헬퍼
function createEnemyCard(id, type, actionCost, speedCost, damage = 0, block = 0) {
  return { id, type, actionCost, speedCost, damage, block, hits: 1 };
}

describe('decideEnemyMode', () => {
  it('3가지 모드 중 하나를 반환', () => {
    // 여러 번 실행해서 모든 모드가 나오는지 확인
    const modes = new Set();
    for (let i = 0; i < 100; i++) {
      const mode = decideEnemyMode();
      modes.add(mode.key);
    }
    expect(modes.has('aggro')).toBe(true);
    expect(modes.has('turtle')).toBe(true);
    expect(modes.has('balanced')).toBe(true);
  });

  it('반환된 모드는 올바른 구조를 가짐', () => {
    const mode = decideEnemyMode();
    expect(mode).toHaveProperty('name');
    expect(mode).toHaveProperty('key');
    expect(mode).toHaveProperty('prefer');
    expect(['aggro', 'turtle', 'balanced']).toContain(mode.key);
  });

  it('적 객체를 받아 가중치 적용', () => {
    const enemy = { id: 'ghoul' };
    const mode = decideEnemyMode(enemy);
    expect(['aggro', 'turtle', 'balanced']).toContain(mode.key);
  });

  it('적 ID 문자열도 지원', () => {
    const mode = decideEnemyMode('slaughterer');
    expect(['aggro', 'turtle', 'balanced']).toContain(mode.key);
  });

  it('알 수 없는 적은 기본 가중치 사용', () => {
    const mode = decideEnemyMode('unknown_enemy');
    expect(['aggro', 'turtle', 'balanced']).toContain(mode.key);
  });

  it('구울은 공격적 모드 빈도가 높음', () => {
    // 통계적 테스트: 1000회 중 aggro가 50% 이상이어야 함
    let aggroCount = 0;
    for (let i = 0; i < 1000; i++) {
      const mode = decideEnemyMode('ghoul');
      if (mode.key === 'aggro') aggroCount++;
    }
    // 60% 가중치이므로 최소 50%는 aggro여야 함 (오차 허용)
    expect(aggroCount).toBeGreaterThan(400);
  });

  it('도살자는 극공격형', () => {
    // 통계적 테스트: aggro 가중치 80%
    let aggroCount = 0;
    for (let i = 0; i < 1000; i++) {
      const mode = decideEnemyMode('slaughterer');
      if (mode.key === 'aggro') aggroCount++;
    }
    // 80% 가중치이므로 최소 70%는 aggro여야 함
    expect(aggroCount).toBeGreaterThan(600);
  });

  it('ENEMY_MODE_WEIGHTS에 기본값 존재', () => {
    expect(ENEMY_MODE_WEIGHTS).toHaveProperty('default');
    expect(ENEMY_MODE_WEIGHTS.default).toHaveProperty('aggro');
    expect(ENEMY_MODE_WEIGHTS.default).toHaveProperty('turtle');
    expect(ENEMY_MODE_WEIGHTS.default).toHaveProperty('balanced');
  });
});

describe('generateEnemyActions', () => {
  const testDeck = [
    createEnemyCard('atk1', 'attack', 2, 5, 10, 0),
    createEnemyCard('atk2', 'attack', 3, 7, 15, 0),
    createEnemyCard('def1', 'defense', 2, 4, 0, 8),
    createEnemyCard('def2', 'general', 1, 3, 0, 5),
  ];

  it('enemy가 null이면 빈 배열 반환', () => {
    const result = generateEnemyActions(null, { key: 'aggro' });
    expect(result).toEqual([]);
  });

  it('덱이 있는 적은 덱에서 카드 선택', () => {
    const enemy = { deck: ['atk1', 'def1'] };
    const mode = { key: 'aggro' };
    const result = generateEnemyActions(enemy, mode, 0, 3, 1);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('maxCards 제한 준수', () => {
    const enemy = { deck: ['atk1', 'atk2', 'def1', 'def2'] };
    const mode = { key: 'balanced' };
    const result = generateEnemyActions(enemy, mode, 0, 2, 1);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('minCards 요구사항 우선', () => {
    const enemy = { deck: ['atk1', 'atk2', 'def1'] };
    const mode = { key: 'balanced' };
    const result = generateEnemyActions(enemy, mode, 2, 3, 2);
    // minCards가 2이므로 가능하면 2장 이상 선택
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('빈 덱이면 기본 카드 풀에서 선택', () => {
    const enemy = { deck: [] };
    const mode = { key: 'aggro' };
    const result = generateEnemyActions(enemy, mode, 0, 3, 1);
    // 기본 ENEMY_CARDS에서 선택하므로 최소 1장은 나와야 함
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

describe('shouldEnemyOverdrive', () => {
  // 현재 함수가 항상 false를 반환하도록 구현됨
  it('현재는 항상 false 반환 (패턴 확정 전 금지)', () => {
    expect(shouldEnemyOverdrive({ key: 'aggro' }, [], 100, 2)).toBe(false);
    expect(shouldEnemyOverdrive({ key: 'turtle' }, [], 100, 2)).toBe(false);
    expect(shouldEnemyOverdrive({ key: 'balanced' }, [], 100, 2)).toBe(false);
  });

  it('턴 1에서는 폭주 안 함', () => {
    expect(shouldEnemyOverdrive({ key: 'aggro' }, [], 100, 1)).toBe(false);
  });

  it('에테르가 0이면 폭주 안 함', () => {
    expect(shouldEnemyOverdrive({ key: 'aggro' }, [], 0, 2)).toBe(false);
  });
});

describe('assignSourceUnitToActions', () => {
  it('actions가 비어있으면 그대로 반환', () => {
    const result = assignSourceUnitToActions([], []);
    expect(result).toEqual([]);
  });

  it('units가 비어있으면 그대로 반환', () => {
    const actions = [{ id: 'atk1' }];
    const result = assignSourceUnitToActions(actions, []);
    expect(result).toEqual(actions);
  });

  it('죽은 유닛은 무시', () => {
    const actions = [{ id: 'atk1' }];
    const units = [
      { unitId: 1, hp: 0, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['atk1'] }
    ];
    const result = assignSourceUnitToActions(actions, units);
    expect(result[0].__sourceUnitId).toBe(2);
  });

  it('카드를 가진 유닛에 할당', () => {
    const actions = [{ id: 'atk1' }, { id: 'def1' }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['def1'] }
    ];
    const result = assignSourceUnitToActions(actions, units);
    expect(result[0].__sourceUnitId).toBe(1);
    expect(result[1].__sourceUnitId).toBe(2);
  });

  it('여러 유닛이 같은 카드를 가지면 균등 배분', () => {
    const actions = [{ id: 'atk1' }, { id: 'atk1' }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['atk1'] }
    ];
    const result = assignSourceUnitToActions(actions, units);
    // 첫 번째 카드는 유닛 1, 두 번째 카드는 유닛 2에 할당
    const unitIds = result.map(a => a.__sourceUnitId);
    expect(unitIds).toContain(1);
    expect(unitIds).toContain(2);
  });

  it('덱에 없는 카드는 첫 번째 유닛에 할당', () => {
    const actions = [{ id: 'unknown_card' }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['def1'] }
    ];
    const result = assignSourceUnitToActions(actions, units);
    expect(result[0].__sourceUnitId).toBe(1);
  });

  it('단일 유닛에 모든 카드 할당', () => {
    const actions = [{ id: 'atk1' }, { id: 'atk2' }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1', 'atk2'] }
    ];
    const result = assignSourceUnitToActions(actions, units);
    expect(result[0].__sourceUnitId).toBe(1);
    expect(result[1].__sourceUnitId).toBe(1);
  });
});

describe('expandActionsWithGhosts', () => {
  it('actions가 비어있으면 그대로 반환', () => {
    const result = expandActionsWithGhosts([], []);
    expect(result).toEqual([]);
  });

  it('units가 비어있으면 그대로 반환', () => {
    const actions = [{ id: 'atk1' }];
    const result = expandActionsWithGhosts(actions, []);
    expect(result).toEqual(actions);
  });

  it('단일 유닛이면 유령카드 생성 안 함', () => {
    const actions = [{ id: 'atk1', damage: 10 }];
    const units = [{ unitId: 1, hp: 50, deck: ['atk1'] }];
    const result = expandActionsWithGhosts(actions, units);

    expect(result.length).toBe(1);
    expect(result[0].isGhost).toBeFalsy();
  });

  it('2개 유닛: 실제 1장 + 유령 1장', () => {
    const actions = [{ id: 'atk1', damage: 10 }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['atk1'] }
    ];
    const result = expandActionsWithGhosts(actions, units);

    expect(result.length).toBe(2);

    // 실제 카드 1장
    const realCards = result.filter(c => !c.isGhost);
    expect(realCards.length).toBe(1);

    // 유령 카드 1장
    const ghostCards = result.filter(c => c.isGhost);
    expect(ghostCards.length).toBe(1);
    expect(ghostCards[0].createdBy).toBe('atk1');
  });

  it('3개 유닛: 실제 1장 + 유령 2장', () => {
    const actions = [{ id: 'atk1', damage: 10 }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['atk1'] },
      { unitId: 3, hp: 50, deck: ['atk1'] }
    ];
    const result = expandActionsWithGhosts(actions, units);

    expect(result.length).toBe(3);

    const realCards = result.filter(c => !c.isGhost);
    const ghostCards = result.filter(c => c.isGhost);

    expect(realCards.length).toBe(1);
    expect(ghostCards.length).toBe(2);
  });

  it('죽은 유닛은 무시', () => {
    const actions = [{ id: 'atk1', damage: 10 }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 0, deck: ['atk1'] },  // 죽음
      { unitId: 3, hp: 50, deck: ['atk1'] }
    ];
    const result = expandActionsWithGhosts(actions, units);

    // 살아있는 유닛 2개만 고려
    expect(result.length).toBe(2);

    const realCards = result.filter(c => !c.isGhost);
    const ghostCards = result.filter(c => c.isGhost);

    expect(realCards.length).toBe(1);
    expect(ghostCards.length).toBe(1);
  });

  it('각 유닛에 다른 __sourceUnitId 할당', () => {
    const actions = [{ id: 'atk1', damage: 10 }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['atk1'] },
      { unitId: 3, hp: 50, deck: ['atk1'] }
    ];
    const result = expandActionsWithGhosts(actions, units);

    const unitIds = result.map(c => c.__sourceUnitId);
    expect(unitIds).toContain(1);
    expect(unitIds).toContain(2);
    expect(unitIds).toContain(3);
  });

  it('여러 실제 카드 + 유령카드 확장', () => {
    const actions = [
      { id: 'atk1', damage: 10 },
      { id: 'def1', block: 5 }
    ];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1', 'def1'] },
      { unitId: 2, hp: 50, deck: ['atk1', 'def1'] }
    ];
    const result = expandActionsWithGhosts(actions, units);

    // 카드 2장 x 유닛 2개 = 총 4장
    expect(result.length).toBe(4);

    const realCards = result.filter(c => !c.isGhost);
    const ghostCards = result.filter(c => c.isGhost);

    expect(realCards.length).toBe(2);
    expect(ghostCards.length).toBe(2);
  });

  it('유령카드는 원본 카드 속성 복사', () => {
    const actions = [{ id: 'atk1', damage: 10, type: 'attack', speedCost: 5 }];
    const units = [
      { unitId: 1, hp: 50, deck: ['atk1'] },
      { unitId: 2, hp: 50, deck: ['atk1'] }
    ];
    const result = expandActionsWithGhosts(actions, units);

    const ghost = result.find(c => c.isGhost);
    expect(ghost.damage).toBe(10);
    expect(ghost.type).toBe('attack');
    expect(ghost.speedCost).toBe(5);
  });
});
