/**
 * @file cardPlaySpecials.test.js
 * @description 카드 사용 시 특수 효과 테스트
 *
 * ## 테스트 대상
 * - processCardPlaySpecials: 카드 사용 시 즉시 효과 처리
 *
 * ## 주요 테스트 케이스
 * - autoReload: 탄창 자동 재장전
 * - mentalFocus: 집중 토큰 부여
 * - createdBy: 생성된 카드 ID 추적
 * - selfDamage: 자해 피해
 * - drawCards: 추가 드로우
 */

import { describe, it, expect } from 'vitest';
import { processCardPlaySpecials } from './cardPlaySpecials';

describe('cardPlaySpecials', () => {
  describe('processCardPlaySpecials', () => {
    const createEntity = (overrides = {}): any => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    it('기본 결과 구조를 반환해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Attack', damage: 10 } as any,
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
        card: { name: 'Normal', damage: 10 } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.bonusCards!).toHaveLength(0);
      expect(result.tokensToAdd!).toHaveLength(0);
      expect(result.tokensToRemove!).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });

    it('autoReload는 손패에 장전 카드가 있으면 loaded 토큰을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'AutoReload', special: 'autoReload' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          hand: [{ id: 'reload' }] as any
        }
      });

      expect(result.tokensToAdd!!.some(t => t.id === 'loaded')).toBe(true);
    });

    it('autoReload는 손패에 장전 카드가 없으면 효과가 없어야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'AutoReload', special: 'autoReload' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          hand: [{ id: 'attack' }] as any
        }
      });

      expect(result.tokensToAdd!!.some(t => t.id === 'loaded')).toBe(false);
    });

    it('mentalFocus는 focus 토큰을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Focus', special: 'mentalFocus' } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.tokensToAdd!!.some(t => t.id === 'focus')).toBe(true);
    });

    it('recallCard는 nextTurnEffects에 recallCard를 설정해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Recall', special: 'recallCard' } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.nextTurnEffects!.recallCard).toBe(true);
    });

    it('emergencyDraw는 손패가 6장 이하일 때 효과가 발동해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Emergency', special: 'emergencyDraw' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: { handSize: 5 }
      });

      expect(result.nextTurnEffects!.emergencyDraw).toBe(3);
    });

    it('emergencyDraw는 손패가 6장 초과하면 효과가 없어야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Emergency', special: 'emergencyDraw' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: { handSize: 8 }
      });

      expect(result.nextTurnEffects?.emergencyDraw).toBeUndefined();
    });

    it('sharpenBlade는 fencingDamageBonus를 설정해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Sharpen', special: 'sharpenBlade' } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.nextTurnEffects!.fencingDamageBonus).toBe(3);
    });

    it('evasiveShot은 shoot 보너스 카드를 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { id: 'evasive_shot', name: 'Evasive', special: 'evasiveShot' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }] as any
        }
      });

      expect(result.bonusCards!.length).toBeGreaterThan(0);
      expect((result.bonusCards![0] as any).createdBy).toBe('evasive_shot');
    });

    it('manipulation은 탄걸림이 있으면 해제하고 장전해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Manip', special: 'manipulation' } as any,
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'gun_jam', stacks: 1 }]
          }
        }),
        attackerName: 'player',
        battleContext: { allCards: [] as any }
      });

      expect(result.tokensToRemove!.some(t => t.id === 'gun_jam')).toBe(true);
      expect(result.tokensToAdd!.some(t => t.id === 'loaded')).toBe(true);
    });

    it('manipulation은 탄걸림이 없으면 사격 카드를 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Manip', special: 'manipulation' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }] as any
        }
      });

      expect(result.bonusCards!.length).toBeGreaterThan(0);
    });

    it('spreadShot은 적 유닛 수만큼 사격을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Spread', special: 'spreadShot' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }] as any,
          enemyUnits: [
            { hp: 50, unitId: 0 },
            { hp: 50, unitId: 1 },
            { hp: 50, unitId: 2 }
          ] as any
        }
      });

      expect(result.bonusCards!).toHaveLength(3);
    });

    it('executionSquad는 장전, 탄걸림 면역 토큰을 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'Execution', special: 'executionSquad' } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }] as any
        }
      });

      expect(result.tokensToAdd!.some(t => t.id === 'loaded')).toBe(true);
      expect(result.tokensToAdd!.some(t => t.id === 'jam_immunity')).toBe(true);
      // 총격카드 4장 창조는 BattleApp에서 UI 선택으로 처리됨
    });

    it('aoeAttack은 nextTurnEffects에 isAoeAttack을 설정해야 함', () => {
      const result = processCardPlaySpecials({
        card: { name: 'AoE', special: 'aoeAttack' } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.nextTurnEffects!.isAoeAttack).toBe(true);
    });

    it('cross 특성과 gun_attack 보너스는 사격 카드를 추가해야 함', () => {
      const result = processCardPlaySpecials({
        card: {
          name: 'Cross',
          traits: ['cross'],
          crossBonus: { type: 'gun_attack', count: 2 }
        } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          queue: [
            { actor: 'player', sp: 5 } as any,
            { actor: 'enemy', sp: 5 }
          ],
          currentSp: 5,
          currentQIndex: 0,
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }] as any
        }
      });

      expect(result.bonusCards!).toHaveLength(2);
    });

    it('cross 특성이지만 겹치지 않으면 효과가 없어야 함', () => {
      const result = processCardPlaySpecials({
        card: {
          name: 'Cross',
          traits: ['cross'],
          crossBonus: { type: 'gun_attack', count: 2 }
        } as any,
        attacker: createEntity(),
        attackerName: 'player',
        battleContext: {
          queue: [
            { actor: 'player', sp: 5 } as any,
            { actor: 'enemy', sp: 15 } // 겹치지 않음
          ],
          currentSp: 5,
          currentQIndex: 0,
          allCards: [{ id: 'shoot', damage: 15, name: 'Shoot' }] as any
        }
      });

      expect(result.bonusCards!).toHaveLength(0);
    });

    // appliedTokens 테스트
    it('appliedTokens로 자신에게 토큰을 부여해야 함', () => {
      const result = processCardPlaySpecials({
        card: {
          name: 'BuffCard',
          appliedTokens: [
            { id: 'offense', stacks: 2, target: 'player' }
          ]
        } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.tokensToAdd!).toHaveLength(1);
      expect(result.tokensToAdd![0].id).toBe('offense');
      expect(result.tokensToAdd![0].stacks).toBe(2);
      expect(result.tokensToAdd![0].targetEnemy).toBe(false);
    });

    it('appliedTokens로 적에게 토큰을 부여해야 함 (targetEnemy=true)', () => {
      const result = processCardPlaySpecials({
        card: {
          name: 'DebuffCard',
          appliedTokens: [
            { id: 'dull', stacks: 1, target: 'enemy' },
            { id: 'shaken', stacks: 3, target: 'enemy' }
          ]
        } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.tokensToAdd!).toHaveLength(2);

      const dullToken = result.tokensToAdd!.find(t => t.id === 'dull');
      expect(dullToken).toBeDefined();
      expect(dullToken!.targetEnemy).toBe(true);
      expect(dullToken!.stacks).toBe(1);

      const shakenToken = result.tokensToAdd!.find(t => t.id === 'shaken');
      expect(shakenToken).toBeDefined();
      expect(shakenToken!.targetEnemy).toBe(true);
      expect(shakenToken!.stacks).toBe(3);
    });

    it('최루-연막탄 appliedTokens가 올바르게 처리되어야 함', () => {
      // 최루-연막탄 카드 정의: blurPlus(자신), dull(적 3스택), shaken(적 3스택)
      const result = processCardPlaySpecials({
        card: {
          id: 'tear_smoke_grenade',
          name: '최루-연막탄',
          type: 'general',
          appliedTokens: [
            { id: 'blurPlus', stacks: 1, target: 'player' },
            { id: 'dull', stacks: 3, target: 'enemy' },
            { id: 'shaken', stacks: 3, target: 'enemy' }
          ]
        } as any,
        attacker: createEntity(),
        attackerName: 'player'
      });

      expect(result.tokensToAdd!).toHaveLength(3);

      // blurPlus는 자신에게
      const blurToken = result.tokensToAdd!.find(t => t.id === 'blurPlus');
      expect(blurToken).toBeDefined();
      expect(blurToken!.targetEnemy).toBe(false);

      // dull은 적에게 3스택
      const dullToken = result.tokensToAdd!.find(t => t.id === 'dull');
      expect(dullToken).toBeDefined();
      expect(dullToken!.targetEnemy).toBe(true);
      expect(dullToken!.stacks).toBe(3);

      // shaken은 적에게 3스택
      const shakenToken = result.tokensToAdd!.find(t => t.id === 'shaken');
      expect(shakenToken).toBeDefined();
      expect(shakenToken!.targetEnemy).toBe(true);
      expect(shakenToken!.stacks).toBe(3);
    });
  });
});
