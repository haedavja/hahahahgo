/**
 * @file cardPlaySpecials.test.js
 * @description cardPlaySpecials 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import { processCardPlaySpecials } from './cardPlaySpecials';

describe('cardPlaySpecials', () => {
  describe('processCardPlaySpecials', () => {
    const createEntity = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    it('기본 결과 구조를 반환해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Attack', damage: 10 },
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result).toHaveProperty('bonusCards');
      expect(result).toHaveProperty('tokensToAdd');
      expect(result).toHaveProperty('tokensToRemove');
      expect(result).toHaveProperty('nextTurnEffects');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('logs');
    });

    it('special이 없으면 빈 배열을 반환해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Normal', damage: 10 },
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.bonusCards).toHaveLength(0);
      expect(result.tokensToAdd).toHaveLength(0);
      expect(result.tokensToRemove).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });

    it('autoReload는 손패에 장전 카드가 있으면 loaded 토큰을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'AutoReload', special: 'autoReload' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          hand: [{ id: 'reload' }]
        }
      });

      expect(result.tokensToAdd.some(t => t.id === 'loaded')).toBe(true);
    });

    it('autoReload는 손패에 장전 카드가 없으면 효과가 없어야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'AutoReload', special: 'autoReload' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          hand: [{ id: 'attack' }]
        }
      });

      expect(result.tokensToAdd.some(t => t.id === 'loaded')).toBe(false);
    });

    it('mentalFocus는 focus 토큰을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Focus', special: 'mentalFocus' },
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.tokensToAdd.some(t => t.id === 'focus')).toBe(true);
    });

    it('recallCard는 nextTurnEffects에 recallCard를 설정해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Recall', special: 'recallCard' },
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.nextTurnEffects.recallCard).toBe(true);
    });

    it('emergencyDraw는 손패가 6장 이하일 때 효과가 발동해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Emergency', special: 'emergencyDraw' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: { handSize: 5 }
      });

      expect(result.nextTurnEffects.emergencyDraw).toBe(3);
    });

    it('emergencyDraw는 손패가 6장 초과하면 효과가 없어야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Emergency', special: 'emergencyDraw' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: { handSize: 8 }
      });

      expect(result.nextTurnEffects?.emergencyDraw).toBeUndefined();
    });

    it('sharpenBlade는 fencingDamageBonus를 설정해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Sharpen', special: 'sharpenBlade' },
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.nextTurnEffects.fencingDamageBonus).toBe(3);
    });

    it('evasiveShot은 shoot 보너스 카드를 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { id: 'evasive_shot', name: 'Evasive', special: 'evasiveShot' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }]
        }
      });

      expect(result.bonusCards.length).toBeGreaterThan(0);
      expect(result.bonusCards[0].createdBy).toBe('evasive_shot');
    });

    it('manipulation은 탄걸림이 있으면 해제하고 장전해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Manip', special: 'manipulation' },
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'gun_jam', stacks: 1 }]
          }
        }),
        attackerName: 'player',
        battleContext: { allCards: [] }
      });

      expect(result.tokensToRemove.some(t => t.id === 'gun_jam')).toBe(true);
      expect(result.tokensToAdd.some(t => t.id === 'loaded')).toBe(true);
    });

    it('manipulation은 탄걸림이 없으면 사격 카드를 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Manip', special: 'manipulation' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }]
        }
      });

      expect(result.bonusCards.length).toBeGreaterThan(0);
    });

    it('spreadShot은 적 유닛 수만큼 사격을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Spread', special: 'spreadShot' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }],
          enemyUnits: [
            { hp: 50, unitId: 0 },
            { hp: 50, unitId: 1 },
            { hp: 50, unitId: 2 }
          ]
        }
      });

      expect(result.bonusCards).toHaveLength(3);
    });

    it('executionSquad는 장전, 면역, 사격 4장을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Execution', special: 'executionSquad' },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }]
        }
      });

      expect(result.tokensToAdd.some(t => t.id === 'loaded')).toBe(true);
      expect(result.tokensToAdd.some(t => t.id === 'jam_immune')).toBe(true);
      expect(result.bonusCards).toHaveLength(4);
    });

    it('aoeAttack은 nextTurnEffects에 isAoeAttack을 설정해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'AoE', special: 'aoeAttack' },
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.nextTurnEffects.isAoeAttack).toBe(true);
    });

    it('cross 특성과 gun_attack 보너스는 사격 카드를 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: {
          name: 'Cross',
          traits: ['cross'],
          crossBonus: { type: 'gun_attack', count: 2 }
        },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          queue: [
            { actor: 'player', sp: 5 },
            { actor: 'enemy', sp: 5 }
          ],
          currentSp: 5,
          currentQIndex: 0,
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }]
        }
      });

      expect(result.bonusCards).toHaveLength(2);
    });

    it('cross 특성이지만 겹치지 않으면 효과가 없어야 함', () => {
      const result = processCardPlaySpecials({
        card: {
          name: 'Cross',
          traits: ['cross'],
          crossBonus: { type: 'gun_attack', count: 2 }
        },
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          queue: [
            { actor: 'player', sp: 5 },
            { actor: 'enemy', sp: 15 } // 겹치지 않음
          ],
          currentSp: 5,
          currentQIndex: 0,
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }]
        }
      });

      expect(result.bonusCards).toHaveLength(0);
    });
  });
});
