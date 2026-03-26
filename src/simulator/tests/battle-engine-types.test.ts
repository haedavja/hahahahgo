/**
 * @file battle-engine-types.test.ts
 * @description 전투 엔진 타입 및 상수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MAX_SPEED,
  DEFAULT_PLAYER_ENERGY,
  DEFAULT_MAX_SUBMIT_CARDS,
  DEFAULT_HAND_SIZE,
  DEFAULT_CONFIG,
  type BattleEngineConfig,
  type TraitModifiers,
} from '../core/battle-engine-types';

describe('battle-engine-types', () => {
  describe('상수 값 검증', () => {
    it('DEFAULT_MAX_SPEED는 30', () => {
      expect(DEFAULT_MAX_SPEED).toBe(30);
    });

    it('DEFAULT_PLAYER_ENERGY는 6', () => {
      expect(DEFAULT_PLAYER_ENERGY).toBe(6);
    });

    it('DEFAULT_MAX_SUBMIT_CARDS는 5', () => {
      expect(DEFAULT_MAX_SUBMIT_CARDS).toBe(5);
    });

    it('DEFAULT_HAND_SIZE는 5', () => {
      expect(DEFAULT_HAND_SIZE).toBe(5);
    });
  });

  describe('DEFAULT_CONFIG 검증', () => {
    it('기본 설정 값이 올바름', () => {
      expect(DEFAULT_CONFIG.maxSpeed).toBe(30);
      expect(DEFAULT_CONFIG.maxTurns).toBe(30);
      expect(DEFAULT_CONFIG.enableCrits).toBe(true);
      expect(DEFAULT_CONFIG.enableCombos).toBe(true);
      expect(DEFAULT_CONFIG.enableRelics).toBe(true);
      expect(DEFAULT_CONFIG.enableAnomalies).toBe(true);
      expect(DEFAULT_CONFIG.enableTimeline).toBe(true);
      expect(DEFAULT_CONFIG.verbose).toBe(false);
      expect(DEFAULT_CONFIG.mapRisk).toBe(0);
    });

    it('모든 필수 속성 존재', () => {
      const requiredKeys: (keyof BattleEngineConfig)[] = [
        'maxSpeed',
        'maxTurns',
        'enableCrits',
        'enableCombos',
        'enableRelics',
        'enableAnomalies',
        'enableTimeline',
        'verbose',
        'mapRisk',
      ];

      for (const key of requiredKeys) {
        expect(DEFAULT_CONFIG).toHaveProperty(key);
      }
    });
  });

  describe('BattleEngineConfig 타입', () => {
    it('커스텀 설정 생성 가능', () => {
      const customConfig: BattleEngineConfig = {
        maxSpeed: 50,
        maxTurns: 20,
        enableCrits: false,
        enableCombos: false,
        enableRelics: true,
        enableAnomalies: false,
        enableTimeline: true,
        verbose: true,
        mapRisk: 3,
      };

      expect(customConfig.maxSpeed).toBe(50);
      expect(customConfig.enableCrits).toBe(false);
      expect(customConfig.mapRisk).toBe(3);
    });

    it('Partial<BattleEngineConfig>로 기본 설정 오버라이드', () => {
      const partialConfig: Partial<BattleEngineConfig> = {
        verbose: true,
        maxTurns: 50,
      };

      const merged = { ...DEFAULT_CONFIG, ...partialConfig };

      expect(merged.verbose).toBe(true);
      expect(merged.maxTurns).toBe(50);
      expect(merged.maxSpeed).toBe(30); // 기본값 유지
    });
  });

  describe('TraitModifiers 타입', () => {
    it('기본 특성 수정자 생성', () => {
      const modifiers: TraitModifiers = {
        damageMultiplier: 1.5,
        blockMultiplier: 0.8,
        speedModifier: -2,
        effects: ['pierce', 'burn'],
      };

      expect(modifiers.damageMultiplier).toBe(1.5);
      expect(modifiers.blockMultiplier).toBe(0.8);
      expect(modifiers.speedModifier).toBe(-2);
      expect(modifiers.effects).toContain('pierce');
    });

    it('speedBonus는 선택적', () => {
      const withBonus: TraitModifiers = {
        damageMultiplier: 1,
        blockMultiplier: 1,
        speedModifier: 0,
        speedBonus: 3,
        effects: [],
      };

      const withoutBonus: TraitModifiers = {
        damageMultiplier: 1,
        blockMultiplier: 1,
        speedModifier: 0,
        effects: [],
      };

      expect(withBonus.speedBonus).toBe(3);
      expect(withoutBonus.speedBonus).toBeUndefined();
    });
  });

  describe('상수 게임 로직 일관성', () => {
    it('최대 제출 카드 수가 핸드 사이즈 이하', () => {
      expect(DEFAULT_MAX_SUBMIT_CARDS).toBeLessThanOrEqual(DEFAULT_HAND_SIZE);
    });

    it('기본 에너지가 양수', () => {
      expect(DEFAULT_PLAYER_ENERGY).toBeGreaterThan(0);
    });

    it('최대 속도가 합리적인 범위', () => {
      expect(DEFAULT_MAX_SPEED).toBeGreaterThan(0);
      expect(DEFAULT_MAX_SPEED).toBeLessThanOrEqual(100);
    });

    it('mapRisk 범위 체크 (0-4)', () => {
      expect(DEFAULT_CONFIG.mapRisk).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.mapRisk).toBeLessThanOrEqual(4);
    });
  });
});
