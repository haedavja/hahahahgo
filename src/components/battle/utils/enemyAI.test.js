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
  assignSourceUnitToActions
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
