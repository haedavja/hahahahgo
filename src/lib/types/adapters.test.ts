/**
 * @file adapters.test.ts
 * @description 게임/시뮬레이터 타입 변환 어댑터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  // 게임 → 시뮬레이터
  toSimulatorPlayer,
  toSimulatorEnemy,
  toSimulatorCard,
  toSimulatorTimelineCard,
  // 시뮬레이터 → 게임
  toGameBattleResult,
  toGameCombatant,
  // 유틸리티
  cloneTokenState,
  isVictory,
  isUnitAlive,
  getAliveUnits,
  applyTokenStacks,
  // 밸리데이션
  isValidCardId,
  isValidEnemyId,
  isValidBattleResult,
  // 기본값 생성
  createDefaultPlayerState,
  createDefaultEnemyState,
  createEmptyBattleResult,
} from './adapters';
import type { BattleResult, EnemyUnit } from './shared';

describe('타입 어댑터', () => {
  // ==================== 게임 → 시뮬레이터 변환 ====================
  describe('toSimulatorPlayer', () => {
    it('필수 필드만 있는 플레이어 변환', () => {
      const result = toSimulatorPlayer({ hp: 80, maxHp: 100 });

      expect(result.hp).toBe(80);
      expect(result.maxHp).toBe(100);
      expect(result.block).toBe(0);
      expect(result.energy).toBe(3);
      expect(result.strength).toBe(0);
      expect(result.tokens).toEqual({});
      expect(result.hand).toEqual([]);
      expect(result.deck).toEqual([]);
    });

    it('모든 필드가 있는 플레이어 변환', () => {
      const result = toSimulatorPlayer({
        hp: 50,
        maxHp: 100,
        block: 10,
        energy: 2,
        maxEnergy: 4,
        strength: 3,
        agility: 1,
        insight: 2,
        tokens: { sharpen: 3 },
        hand: ['strike', 'guard'],
        deck: ['slash'],
        discard: ['thrust'],
        relics: ['relic1'],
        ether: 50,
        maxSpeed: 12,
      });

      expect(result.hp).toBe(50);
      expect(result.block).toBe(10);
      expect(result.energy).toBe(2);
      expect(result.maxEnergy).toBe(4);
      expect(result.strength).toBe(3);
      expect(result.agility).toBe(1);
      expect(result.insight).toBe(2);
      expect(result.tokens).toEqual({ sharpen: 3 });
      expect(result.hand).toEqual(['strike', 'guard']);
      expect(result.ether).toBe(50);
      expect(result.maxSpeed).toBe(12);
    });
  });

  describe('toSimulatorEnemy', () => {
    it('필수 필드만 있는 적 변환', () => {
      const result = toSimulatorEnemy({
        id: 'goblin',
        name: '고블린',
        hp: 30,
        maxHp: 30,
      });

      expect(result.id).toBe('goblin');
      expect(result.name).toBe('고블린');
      expect(result.hp).toBe(30);
      expect(result.maxHp).toBe(30);
      expect(result.block).toBe(0);
      expect(result.cardsPerTurn).toBe(1);
    });

    it('모든 필드가 있는 적 변환', () => {
      const result = toSimulatorEnemy({
        id: 'dragon',
        name: '드래곤',
        hp: 200,
        maxHp: 200,
        block: 20,
        tokens: { burn: 3 },
        maxSpeed: 20,
        cardsPerTurn: 3,
        deck: ['fire_breath', 'tail_swipe'],
        emoji: '🐉',
        tier: 3,
        isBoss: true,
        description: '강력한 보스',
        passives: { fireAura: true },
        units: [{ id: 'minion', hp: 10, maxHp: 10 } as EnemyUnit],
      });

      expect(result.id).toBe('dragon');
      expect(result.block).toBe(20);
      expect(result.cardsPerTurn).toBe(3);
      expect(result.isBoss).toBe(true);
      expect(result.passives).toEqual({ fireAura: true });
      expect(result.units).toHaveLength(1);
    });
  });

  describe('toSimulatorCard', () => {
    it('카드 복사', () => {
      const original = {
        id: 'strike',
        name: '타격',
        type: 'attack' as const,
        speedCost: 4,
        actionCost: 1,
        damage: 10,
        description: '기본 공격',
      };
      const result = toSimulatorCard(original);

      expect(result).toEqual(original);
      expect(result).not.toBe(original); // 새 객체
    });
  });

  describe('toSimulatorTimelineCard', () => {
    it('cardId/owner 기반 변환', () => {
      const result = toSimulatorTimelineCard({
        cardId: 'strike',
        owner: 'player',
        position: 5,
      });

      expect(result.cardId).toBe('strike');
      expect(result.owner).toBe('player');
      expect(result.position).toBe(5);
      expect(result.sp).toBe(5);
    });

    it('id/actor 기반 변환 (레거시)', () => {
      const result = toSimulatorTimelineCard({
        id: 'enemy_attack',
        actor: 'enemy',
        sp: 8,
      });

      expect(result.cardId).toBe('enemy_attack');
      expect(result.owner).toBe('enemy');
      expect(result.sp).toBe(8);
    });

    it('speed 필드 사용', () => {
      const result = toSimulatorTimelineCard({
        cardId: 'slash',
        speed: 6,
      });

      expect(result.position).toBe(6);
      expect(result.sp).toBe(6);
    });

    it('crossed/executed 플래그 보존', () => {
      const result = toSimulatorTimelineCard({
        cardId: 'guard',
        crossed: true,
        executed: false,
      });

      expect(result.crossed).toBe(true);
      expect(result.executed).toBe(false);
    });
  });

  // ==================== 시뮬레이터 → 게임 변환 ====================
  describe('toGameBattleResult', () => {
    it('승리 결과 변환', () => {
      const simResult: BattleResult = {
        winner: 'player',
        victory: true,
        turns: 5,
        playerDamageDealt: 100,
        enemyDamageDealt: 30,
        playerFinalHp: 70,
        enemyFinalHp: 0,
        etherGained: 25,
        goldChange: 0,
        battleLog: ['Turn 1 started'],
        events: [],
        cardUsage: {},
        comboStats: {},
        tokenStats: {},
        timeline: [],
      };

      const result = toGameBattleResult(simResult);

      expect(result.victory).toBe(true);
      expect(result.turns).toBe(5);
      expect(result.playerHp).toBe(70);
      expect(result.enemyHp).toBe(0);
      expect(result.etherGained).toBe(25);
      expect(result.battleLog).toEqual(['Turn 1 started']);
    });

    it('패배 결과 변환', () => {
      const simResult: BattleResult = {
        winner: 'enemy',
        victory: false,
        turns: 3,
        playerDamageDealt: 20,
        enemyDamageDealt: 100,
        playerFinalHp: 0,
        enemyFinalHp: 50,
        etherGained: 0,
        goldChange: 0,
        battleLog: [],
        events: [],
        cardUsage: {},
        comboStats: {},
        tokenStats: {},
        timeline: [],
      };

      const result = toGameBattleResult(simResult);

      expect(result.victory).toBe(false);
      expect(result.playerHp).toBe(0);
    });
  });

  describe('toGameCombatant', () => {
    it('전투 참여자 변환', () => {
      const combatant = {
        hp: 50,
        maxHp: 100,
        block: 15,
        tokens: { sharpen: 2, guard: 1 },
      };

      const result = toGameCombatant(combatant);

      expect(result.hp).toBe(50);
      expect(result.maxHp).toBe(100);
      expect(result.block).toBe(15);
      expect(result.tokens).toEqual({ sharpen: 2, guard: 1 });
      expect(result.tokens).not.toBe(combatant.tokens); // 복사됨
    });
  });

  // ==================== 유틸리티 ====================
  describe('cloneTokenState', () => {
    it('토큰 상태 복사', () => {
      const original = { sharpen: 3, guard: 2 };
      const cloned = cloneTokenState(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('isVictory', () => {
    it('winner가 player면 승리', () => {
      expect(isVictory({ winner: 'player' } as BattleResult)).toBe(true);
    });

    it('victory가 true면 승리', () => {
      expect(isVictory({ winner: 'draw', victory: true } as BattleResult)).toBe(true);
    });

    it('winner가 enemy면 패배', () => {
      expect(isVictory({ winner: 'enemy', victory: false } as BattleResult)).toBe(false);
    });
  });

  describe('isUnitAlive / getAliveUnits', () => {
    const units: EnemyUnit[] = [
      { id: 'a', hp: 10, maxHp: 20 } as EnemyUnit,
      { id: 'b', hp: 0, maxHp: 15 } as EnemyUnit,
      { id: 'c', hp: 5, maxHp: 10 } as EnemyUnit,
    ];

    it('isUnitAlive - hp > 0이면 살아있음', () => {
      expect(isUnitAlive(units[0])).toBe(true);
      expect(isUnitAlive(units[1])).toBe(false);
    });

    it('getAliveUnits - 살아있는 유닛만 반환', () => {
      const alive = getAliveUnits(units);
      expect(alive).toHaveLength(2);
      expect(alive.map(u => u.id)).toEqual(['a', 'c']);
    });
  });

  describe('applyTokenStacks', () => {
    it('새 토큰 추가', () => {
      const result = applyTokenStacks({}, 'sharpen', 3);
      expect(result).toEqual({ sharpen: 3 });
    });

    it('기존 토큰에 스택 추가', () => {
      const result = applyTokenStacks({ sharpen: 2 }, 'sharpen', 3);
      expect(result).toEqual({ sharpen: 5 });
    });

    it('스택 감소', () => {
      const result = applyTokenStacks({ sharpen: 5 }, 'sharpen', -2);
      expect(result).toEqual({ sharpen: 3 });
    });

    it('0이 되면 토큰 제거', () => {
      const result = applyTokenStacks({ sharpen: 2 }, 'sharpen', -2);
      expect(result).toEqual({});
    });

    it('음수가 되지 않음', () => {
      const result = applyTokenStacks({ sharpen: 1 }, 'sharpen', -5);
      expect(result).toEqual({});
    });

    it('원본 불변', () => {
      const original = { sharpen: 2 };
      applyTokenStacks(original, 'sharpen', 1);
      expect(original).toEqual({ sharpen: 2 });
    });
  });

  // ==================== 밸리데이션 ====================
  describe('isValidCardId', () => {
    it('유효한 카드 ID', () => {
      expect(isValidCardId('strike')).toBe(true);
      expect(isValidCardId('card_001')).toBe(true);
    });

    it('유효하지 않은 카드 ID', () => {
      expect(isValidCardId('')).toBe(false);
      expect(isValidCardId(null)).toBe(false);
      expect(isValidCardId(undefined)).toBe(false);
    });
  });

  describe('isValidEnemyId', () => {
    it('유효한 적 ID', () => {
      expect(isValidEnemyId('goblin')).toBe(true);
    });

    it('유효하지 않은 적 ID', () => {
      expect(isValidEnemyId('')).toBe(false);
      expect(isValidEnemyId(null)).toBe(false);
    });
  });

  describe('isValidBattleResult', () => {
    it('유효한 전투 결과', () => {
      expect(isValidBattleResult({
        winner: 'player',
        turns: 5,
        playerFinalHp: 70,
        enemyFinalHp: 0,
      })).toBe(true);
    });

    it('winner가 draw인 경우도 유효', () => {
      expect(isValidBattleResult({
        winner: 'draw',
        turns: 10,
        playerFinalHp: 0,
        enemyFinalHp: 0,
      })).toBe(true);
    });

    it('null/undefined는 무효', () => {
      expect(isValidBattleResult(null)).toBe(false);
      expect(isValidBattleResult(undefined)).toBe(false);
    });

    it('필수 필드 누락 시 무효', () => {
      expect(isValidBattleResult({ winner: 'player' })).toBe(false);
      expect(isValidBattleResult({ turns: 5 })).toBe(false);
    });
  });

  // ==================== 기본값 생성 ====================
  describe('createDefaultPlayerState', () => {
    it('기본값으로 플레이어 생성', () => {
      const result = createDefaultPlayerState();

      expect(result.hp).toBe(100);
      expect(result.maxHp).toBe(100);
      expect(result.block).toBe(0);
      expect(result.energy).toBe(3);
      expect(result.strength).toBe(0);
      expect(result.tokens).toEqual({});
    });

    it('오버라이드 적용', () => {
      const result = createDefaultPlayerState({
        hp: 50,
        strength: 5,
        relics: ['relic1'],
      });

      expect(result.hp).toBe(50);
      expect(result.maxHp).toBe(100); // 기본값 유지
      expect(result.strength).toBe(5);
      expect(result.relics).toEqual(['relic1']);
    });
  });

  describe('createDefaultEnemyState', () => {
    it('기본값으로 적 생성', () => {
      const result = createDefaultEnemyState('slime', '슬라임');

      expect(result.id).toBe('slime');
      expect(result.name).toBe('슬라임');
      expect(result.hp).toBe(50);
      expect(result.maxHp).toBe(50);
      expect(result.cardsPerTurn).toBe(1);
    });

    it('오버라이드 적용', () => {
      const result = createDefaultEnemyState('dragon', '드래곤', {
        hp: 200,
        maxHp: 200,
        isBoss: true,
      });

      expect(result.id).toBe('dragon');
      expect(result.hp).toBe(200);
      expect(result.isBoss).toBe(true);
    });
  });

  describe('createEmptyBattleResult', () => {
    it('빈 전투 결과 생성', () => {
      const result = createEmptyBattleResult();

      expect(result.winner).toBe('draw');
      expect(result.victory).toBe(false);
      expect(result.turns).toBe(0);
      expect(result.playerDamageDealt).toBe(0);
      expect(result.battleLog).toEqual([]);
      expect(result.events).toEqual([]);
    });
  });
});
