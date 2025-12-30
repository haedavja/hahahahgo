/**
 * @file dungeonNodes.test.ts
 * @description 던전 노드 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  DUNGEON_NODE_TYPES,
  CONNECTION_TYPES,
  DUNGEON_EVENT_TYPES,
  CHOICE_RESULT_TYPES,
  OBSTACLE_TEMPLATES,
  calculateTimePenalty,
} from './dungeonNodes';

describe('dungeonNodes', () => {
  describe('DUNGEON_NODE_TYPES', () => {
    it('모든 노드 타입이 정의되어 있다', () => {
      expect(DUNGEON_NODE_TYPES.ENTRANCE).toBe('entrance');
      expect(DUNGEON_NODE_TYPES.ROOM).toBe('room');
      expect(DUNGEON_NODE_TYPES.CORRIDOR).toBe('corridor');
      expect(DUNGEON_NODE_TYPES.CROSSROAD).toBe('crossroad');
      expect(DUNGEON_NODE_TYPES.EXIT).toBe('exit');
      expect(DUNGEON_NODE_TYPES.SHORTCUT).toBe('shortcut');
      expect(DUNGEON_NODE_TYPES.TREASURE).toBe('treasure');
      expect(DUNGEON_NODE_TYPES.BOSS).toBe('boss');
    });

    it('8개의 노드 타입이 있다', () => {
      expect(Object.keys(DUNGEON_NODE_TYPES)).toHaveLength(8);
    });
  });

  describe('CONNECTION_TYPES', () => {
    it('모든 연결 타입이 정의되어 있다', () => {
      expect(CONNECTION_TYPES.OPEN).toBe('open');
      expect(CONNECTION_TYPES.STAT_GATE).toBe('stat_gate');
      expect(CONNECTION_TYPES.ITEM_GATE).toBe('item_gate');
      expect(CONNECTION_TYPES.ONE_WAY).toBe('one_way');
      expect(CONNECTION_TYPES.LOCKED).toBe('locked');
    });

    it('5개의 연결 타입이 있다', () => {
      expect(Object.keys(CONNECTION_TYPES)).toHaveLength(5);
    });
  });

  describe('DUNGEON_EVENT_TYPES', () => {
    it('모든 이벤트 타입이 정의되어 있다', () => {
      expect(DUNGEON_EVENT_TYPES.NONE).toBe('none');
      expect(DUNGEON_EVENT_TYPES.CHEST).toBe('chest');
      expect(DUNGEON_EVENT_TYPES.COMBAT).toBe('combat');
      expect(DUNGEON_EVENT_TYPES.CURIO).toBe('curio');
      expect(DUNGEON_EVENT_TYPES.OBSTACLE).toBe('obstacle');
      expect(DUNGEON_EVENT_TYPES.TRAP).toBe('trap');
      expect(DUNGEON_EVENT_TYPES.REST).toBe('rest');
      expect(DUNGEON_EVENT_TYPES.MERCHANT).toBe('merchant');
    });

    it('8개의 이벤트 타입이 있다', () => {
      expect(Object.keys(DUNGEON_EVENT_TYPES)).toHaveLength(8);
    });
  });

  describe('CHOICE_RESULT_TYPES', () => {
    it('모든 결과 타입이 정의되어 있다', () => {
      expect(CHOICE_RESULT_TYPES.SUCCESS).toBe('success');
      expect(CHOICE_RESULT_TYPES.FAILURE).toBe('failure');
      expect(CHOICE_RESULT_TYPES.PARTIAL).toBe('partial');
      expect(CHOICE_RESULT_TYPES.HIDDEN).toBe('hidden');
    });
  });

  describe('OBSTACLE_TEMPLATES', () => {
    it('cliff 템플릿이 정의되어 있다', () => {
      expect(OBSTACLE_TEMPLATES.cliff).toBeDefined();
      expect(OBSTACLE_TEMPLATES.cliff.id).toBe('cliff');
      expect(OBSTACLE_TEMPLATES.cliff.name).toBe('깎아지른 절벽');
      expect(OBSTACLE_TEMPLATES.cliff.eventType).toBe(DUNGEON_EVENT_TYPES.OBSTACLE);
    });

    it('cliff 선택지가 올바르게 정의되어 있다', () => {
      const cliffChoices = OBSTACLE_TEMPLATES.cliff.choices;
      expect(cliffChoices.length).toBeGreaterThan(0);

      const climbChoice = cliffChoices.find(c => c.id === 'climb');
      expect(climbChoice).toBeDefined();
      expect(climbChoice?.repeatable).toBe(true);
      expect(climbChoice?.maxAttempts).toBe(5);
    });

    it('lockedChest 템플릿이 정의되어 있다', () => {
      expect(OBSTACLE_TEMPLATES.lockedChest).toBeDefined();
      expect(OBSTACLE_TEMPLATES.lockedChest.id).toBe('locked_chest');
    });

    it('모든 템플릿에 choices가 있다', () => {
      Object.values(OBSTACLE_TEMPLATES).forEach(template => {
        expect(Array.isArray(template.choices)).toBe(true);
        expect(template.choices.length).toBeGreaterThan(0);
      });
    });

    it('선택지마다 outcomes가 정의되어 있다', () => {
      Object.values(OBSTACLE_TEMPLATES).forEach(template => {
        template.choices.forEach(choice => {
          expect(choice.outcomes).toBeDefined();
          // success 또는 failure 중 하나는 있어야 함
          const hasOutcome = choice.outcomes.success || choice.outcomes.failure;
          expect(hasOutcome).toBeTruthy();
        });
      });
    });
  });

  describe('calculateTimePenalty', () => {
    it('시간 비율에 따라 패널티 레벨이 증가한다', () => {
      const penalty1 = calculateTimePenalty(40, 100);  // 40% - 안전
      const penalty2 = calculateTimePenalty(60, 100);  // 60% - 불안
      const penalty3 = calculateTimePenalty(80, 100);  // 80% - 위험

      expect(penalty1.level).toBe(0);
      expect(penalty2.level).toBe(1);
      expect(penalty3.level).toBe(2);
    });

    it('50% 미만은 안전 레벨', () => {
      const penalty = calculateTimePenalty(40, 100);
      expect(penalty.level).toBe(0);
      expect(penalty.description).toBe('안전');
      expect(penalty.etherDecay).toBe(0);
      expect(penalty.ambushChance).toBe(0);
    });

    it('90% 이상은 절박 레벨', () => {
      const penalty = calculateTimePenalty(95, 100);
      expect(penalty.level).toBe(3);
      expect(penalty.description).toBe('절박');
    });

    it('패널티 객체 구조가 올바르다', () => {
      const penalty = calculateTimePenalty(50, 100);
      expect(penalty).toHaveProperty('level');
      expect(penalty).toHaveProperty('description');
      expect(penalty).toHaveProperty('etherDecay');
      expect(penalty).toHaveProperty('ambushChance');
    });
  });

  describe('데이터 무결성', () => {
    it('모든 템플릿 ID가 고유하다', () => {
      const ids = Object.values(OBSTACLE_TEMPLATES).map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('모든 선택지 ID가 템플릿 내에서 고유하다', () => {
      Object.values(OBSTACLE_TEMPLATES).forEach(template => {
        const choiceIds = template.choices.map(c => c.id);
        const uniqueChoiceIds = new Set(choiceIds);
        expect(uniqueChoiceIds.size).toBe(choiceIds.length);
      });
    });

    it('scalingRequirement가 있는 선택지는 유효한 stat을 가진다', () => {
      const validStats = ['strength', 'agility', 'insight'];
      Object.values(OBSTACLE_TEMPLATES).forEach(template => {
        template.choices.forEach((choice: any) => {
          if (choice.scalingRequirement) {
            expect(validStats).toContain(choice.scalingRequirement.stat);
            expect(typeof choice.scalingRequirement.baseValue).toBe('number');
            expect(typeof choice.scalingRequirement.increment).toBe('number');
          }
        });
      });
    });
  });
});
