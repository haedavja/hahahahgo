/**
 * @file dataIntegrity.integration.test.ts
 * @description 데이터 무결성 통합 테스트
 *
 * ## 테스트 목적
 * 실제 데이터 파일을 사용하여 런타임 오류를 방지하기 위한 통합 테스트
 *
 * ## 테스트 범위
 * - 적 데이터 속성 검증 (speed, maxHp, deck 등)
 * - 상징 데이터 속성 검증
 * - 토큰 시스템 무결성
 * - 카드 데이터 무결성
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { ENEMIES, ENEMY_GROUPS, getEnemyGroupDetails, getRandomEnemyGroupByNode } from '../components/battle/battleData';
import { getRelicById, getAllRelics } from '../data/relics';
import { TOKENS, TOKEN_TYPES } from '../data/tokens';
import { createBattleEnemyData, createReducerEnemyState } from '../state/battleHelpers';
import { addToken, removeToken, hasToken, getTokenStacks, getAllTokens, createEmptyTokens } from './tokenUtils';
import { calculatePassiveEffects } from './relicEffects';
import { generateEnemyActions, decideEnemyMode } from '../components/battle/utils/enemyAI';
import { detectPokerCombo } from '../components/battle/utils/comboDetection';
import { getInsightRevealLevel } from '../components/battle/utils/insightSystem';

describe('적 데이터 무결성', () => {
  it('모든 적 그룹의 적이 필수 속성을 가진다', () => {
    // ENEMY_GROUPS는 배열이고, enemies는 적 ID 배열
    // getEnemyGroupDetails를 통해 실제 적 객체를 가져옴
    ENEMY_GROUPS.forEach((group: any) => {
      const details = getEnemyGroupDetails(group.id);
      expect(details, `${group.id}: details`).not.toBeNull();
      expect(Array.isArray(details!.enemies), `${group.id}: enemies is array`).toBe(true);

      details!.enemies.forEach((enemy: any, idx: number) => {
        expect(enemy.id, `${group.id}[${idx}]: id`).toBeDefined();
        expect(enemy.name, `${group.id}[${idx}]: name`).toBeDefined();
        expect(typeof enemy.hp, `${group.id}[${idx}]: hp is number`).toBe('number');
        expect(enemy.hp).toBeGreaterThan(0);

        // speed 속성 검증 (최근 버그 수정)
        expect(typeof enemy.speed, `${group.id}[${idx}]: speed is number`).toBe('number');
        expect(enemy.speed).toBeGreaterThan(0);

        // maxSpeed 속성 검증 (타임라인 표시 버그 방지)
        expect(typeof enemy.maxSpeed, `${group.id}[${idx}]: maxSpeed is number`).toBe('number');
        expect(enemy.maxSpeed).toBeGreaterThanOrEqual(enemy.speed);

        // deck 속성 검증
        expect(Array.isArray(enemy.deck), `${group.id}[${idx}]: deck is array`).toBe(true);
        expect(enemy.deck.length).toBeGreaterThan(0);
      });
    });
  });

  it('ENEMIES 배열의 모든 적이 speed와 maxSpeed를 가진다', () => {
    // 새 적 추가 시 maxSpeed 누락 방지를 위한 검증
    ENEMIES.forEach((enemy: any) => {
      expect(typeof enemy.speed, `${enemy.id}: speed is number`).toBe('number');
      expect(enemy.speed, `${enemy.id}: speed > 0`).toBeGreaterThan(0);
      expect(typeof enemy.maxSpeed, `${enemy.id}: maxSpeed is number`).toBe('number');
      expect(enemy.maxSpeed, `${enemy.id}: maxSpeed >= speed`).toBeGreaterThanOrEqual(enemy.speed);
    });
  });

  it('createBattleEnemyData가 모든 필수 속성을 포함한다', () => {
    const testEnemy = { id: 'test', name: '테스트', hp: 50, speed: 15, deck: ['card1'] };
    const battleEnemy = createBattleEnemyData(testEnemy);

    expect(battleEnemy.id).toBe('test');
    expect(battleEnemy.name).toBe('테스트');
    expect(battleEnemy.hp).toBe(50);
    expect(battleEnemy.maxHp).toBe(50);
    expect(battleEnemy.speed).toBe(15);
    expect(battleEnemy.maxSpeed).toBe(15); // speed를 폴백으로 사용
    expect(battleEnemy.deck).toEqual(['card1']);
    expect(battleEnemy.isBoss).toBe(false);
  });

  it('createBattleEnemyData가 누락된 속성에 기본값을 제공한다', () => {
    const battleEnemy = createBattleEnemyData(null);

    expect(battleEnemy.hp).toBe(40);
    expect(battleEnemy.maxHp).toBe(40);
    expect(battleEnemy.speed).toBe(10);
    expect(battleEnemy.maxSpeed).toBe(10); // 기본 speed와 동일
    expect(Array.isArray(battleEnemy.deck)).toBe(true);
    expect(battleEnemy.isBoss).toBe(false);
  });

  it('getRandomEnemyGroupByNode가 유효한 그룹을 반환한다', () => {
    for (let nodeNumber = 1; nodeNumber <= 10; nodeNumber++) {
      const group = getRandomEnemyGroupByNode(nodeNumber);
      expect(group).toBeDefined();
      expect(group.id).toBeDefined();
    }
  });
});

describe('적 상태 초기화 (units 배열 통일)', () => {
  it('createReducerEnemyState가 단일 적에도 units 배열을 생성한다', () => {
    const enemy = ENEMIES[0]; // ghoul
    const state = createReducerEnemyState(enemy);

    expect(state.units).toBeDefined();
    expect(Array.isArray(state.units)).toBe(true);
    expect(state.units.length).toBe(1);
    expect(state.units[0].unitId).toBe(0);
    expect(state.units[0].hp).toBe(enemy.hp);
    expect(state.units[0].maxHp).toBe(enemy.hp);
  });

  it('createReducerEnemyState가 기존 units 배열을 유지한다', () => {
    const existingUnits = [
      { unitId: 0, id: 'ghoul', hp: 40, maxHp: 40, block: 0, tokens: { usage: [], turn: [], permanent: [] } },
      { unitId: 1, id: 'ghoul', hp: 40, maxHp: 40, block: 0, tokens: { usage: [], turn: [], permanent: [] } }
    ];
    const enemy = { ...ENEMIES[0], units: existingUnits };
    const state = createReducerEnemyState(enemy);

    expect(state.units.length).toBe(2);
    expect(state.units[0].unitId).toBe(0);
    expect(state.units[1].unitId).toBe(1);
  });

  it('createReducerEnemyState가 모든 필수 필드를 포함한다', () => {
    const enemy = ENEMIES[0];
    const state = createReducerEnemyState(enemy);

    // 필수 필드 검증
    expect(state.hp).toBe(enemy.hp);
    expect(state.maxHp).toBe(enemy.hp);
    expect(state.maxSpeed).toBe(enemy.maxSpeed);
    expect(state.vulnMult).toBe(1);
    expect(state.vulnTurns).toBe(0);
    expect(state.block).toBe(0);
    expect(state.counter).toBe(0);
    expect(state.etherOverdriveActive).toBe(false);
    expect(state.tokens).toBeDefined();
    expect(Array.isArray(state.tokens.usage)).toBe(true);
    expect(Array.isArray(state.tokens.turn)).toBe(true);
    expect(Array.isArray(state.tokens.permanent)).toBe(true);
  });

  it('모든 ENEMIES가 createReducerEnemyState를 통해 올바르게 초기화된다', () => {
    ENEMIES.forEach((enemy) => {
      const state = createReducerEnemyState(enemy);

      expect(state.units, `${enemy.id}: units 배열 존재`).toBeDefined();
      expect(state.units.length, `${enemy.id}: units 길이 >= 1`).toBeGreaterThanOrEqual(1);
      expect(state.maxSpeed, `${enemy.id}: maxSpeed 설정됨`).toBe(enemy.maxSpeed);
      expect(state.hp, `${enemy.id}: hp 설정됨`).toBe(enemy.hp);
    });
  });
});

describe('상징 데이터 무결성', () => {
  it('모든 상징이 필수 속성을 가진다', () => {
    const relics = getAllRelics();

    relics.forEach((relic: any) => {
      expect(relic.id, `${relic.name}: id`).toBeDefined();
      expect(relic.name, `${relic.id}: name`).toBeDefined();
      expect(relic.effects, `${relic.id}: effects`).toBeDefined();
    });
  });

  it('getRelicById가 올바르게 작동한다', () => {
    const relic = getRelicById('etherCrystal');
    expect(relic).not.toBeNull();
    expect(relic?.id).toBe('etherCrystal');

    const unknown = getRelicById('nonexistent');
    expect(unknown).toBeNull();
  });

  it('calculatePassiveEffects가 빈 배열에서 작동한다', () => {
    const stats = calculatePassiveEffects([]);
    expect(stats.maxEnergy).toBe(0);
    expect(stats.etherMultiplier).toBe(1);
  });

  it('calculatePassiveEffects가 유효한 상징 ID 배열에서 작동한다', () => {
    const stats = calculatePassiveEffects(['etherCrystal']);
    expect(stats).toBeDefined();
    expect(typeof stats.maxEnergy).toBe('number');
  });
});

describe('토큰 시스템 무결성', () => {
  it('토큰 추가/제거/조회가 올바르게 작동한다', () => {
    const entity = { tokens: createEmptyTokens() };

    // 토큰 추가
    const addResult = addToken(entity, 'offense', 2);
    expect(addResult.tokens.usage.length).toBe(1);
    expect(addResult.tokens.usage[0].stacks).toBe(2);

    // 토큰 조회
    entity.tokens = addResult.tokens;
    expect(hasToken(entity, 'offense')).toBe(true);
    expect(getTokenStacks(entity, 'offense')).toBe(2);

    // 토큰 제거
    const removeResult = removeToken(entity, 'offense', TOKEN_TYPES.USAGE, 1);
    expect(removeResult.tokens.usage[0].stacks).toBe(1);
  });

  it('null/undefined 엔티티에서 안전하게 작동한다', () => {
    expect(hasToken(null, 'offense')).toBe(false);
    expect(hasToken(undefined, 'offense')).toBe(false);
    expect(getTokenStacks(null, 'offense')).toBe(0);
    expect(getAllTokens(null)).toEqual([]);

    const addResult = addToken(null, 'offense', 1);
    expect(addResult.tokens).toBeDefined();
    expect(addResult.logs).toBeDefined();
  });

  it('모든 토큰이 유효한 타입을 가진다', () => {
    Object.entries(TOKENS).forEach(([tokenId, token]) => {
      expect(['usage', 'turn', 'permanent']).toContain(token.type);
      expect(['positive', 'negative', 'neutral']).toContain(token.category);
    });
  });
});

describe('적 AI 무결성', () => {
  it('generateEnemyActions가 null 적에서 빈 배열을 반환한다', () => {
    const actions = generateEnemyActions(null, null, 0, 3, 1);
    expect(actions).toEqual([]);
  });

  it('generateEnemyActions가 빈 덱에서도 작동한다', () => {
    const enemy = { id: 'test', deck: [], hp: 50, unitId: 1 };
    const mode = decideEnemyMode('test');
    const actions = generateEnemyActions(enemy as any, mode, 0, 3, 1);
    // 기본 덱을 사용하므로 빈 배열이 아님
    expect(Array.isArray(actions)).toBe(true);
  });

  it('decideEnemyMode가 유효한 모드를 반환한다', () => {
    const mode = decideEnemyMode('ghoul');
    expect(['aggro', 'turtle', 'balanced']).toContain(mode.key);
  });
});

describe('콤보 감지 무결성', () => {
  it('detectPokerCombo가 빈 배열에서 null을 반환한다', () => {
    expect(detectPokerCombo([])).toBeNull();
  });

  it('detectPokerCombo가 null/undefined에서 null을 반환한다', () => {
    expect(detectPokerCombo(null as any)).toBeNull();
    expect(detectPokerCombo(undefined as any)).toBeNull();
  });

  it('detectPokerCombo가 비배열에서 null을 반환한다', () => {
    expect(detectPokerCombo('not an array' as any)).toBeNull();
    expect(detectPokerCombo({} as any)).toBeNull();
  });
});

describe('통찰 시스템 무결성', () => {
  it('getInsightRevealLevel이 빈 배열에서 기본값을 반환한다', () => {
    const result = getInsightRevealLevel(5, []);
    expect(result.level).toBe(0);
    expect(result.visible).toBe(false);
  });

  it('getInsightRevealLevel이 null/undefined에서 안전하게 작동한다', () => {
    const result = getInsightRevealLevel(5, null as any);
    expect(result.level).toBe(0);
    expect(result.visible).toBe(false);
  });
});
