// @ts-nocheck - Test file with type issues
/**
 * @file events.test.ts
 * @description 이벤트 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import { eventLibrary, getEventStep, getEventTitle } from './events';
import type { NewEventDefinition, NewEventStage } from '../types';

// 테스트용 이벤트 생성
function createMockEvent(overrides: Partial<NewEventDefinition> = {}): NewEventDefinition {
  return {
    id: 'test_event',
    title: '테스트 이벤트',
    description: '테스트 설명',
    choices: [
      { text: '선택 1', next: 'step2' },
      { text: '선택 2', final: true },
    ],
    ...overrides,
  } as NewEventDefinition;
}

describe('events', () => {
  describe('eventLibrary', () => {
    it('eventLibrary가 객체로 정의되어 있다', () => {
      expect(typeof eventLibrary).toBe('object');
    });
  });

  describe('getEventStep', () => {
    it('null 이벤트면 null 반환', () => {
      const result = getEventStep(null);
      expect(result).toBeNull();
    });

    it('undefined 이벤트면 null 반환', () => {
      const result = getEventStep(undefined);
      expect(result).toBeNull();
    });

    it('다단계 이벤트에서 특정 단계를 가져온다', () => {
      const event = createMockEvent({
        stages: {
          start: {
            description: '시작 단계',
            choices: [{ text: '다음', next: 'step2' }],
          },
          step2: {
            description: '두번째 단계',
            choices: [{ text: '종료', final: true }],
          },
        },
      });

      const result = getEventStep(event, 'step2');

      expect(result).not.toBeNull();
      expect(result?.description).toBe('두번째 단계');
    });

    it('다단계 이벤트에서 stepId 없으면 start 반환', () => {
      const event = createMockEvent({
        stages: {
          start: {
            description: '시작 단계',
            choices: [],
          },
        },
      });

      const result = getEventStep(event);

      expect(result?.description).toBe('시작 단계');
    });

    it('다단계 이벤트에서 존재하지 않는 stepId면 start로 폴백', () => {
      const event = createMockEvent({
        stages: {
          start: {
            description: '시작 단계',
            choices: [],
          },
        },
      });

      const result = getEventStep(event, 'nonexistent');

      expect(result?.description).toBe('시작 단계');
    });

    it('단일 단계 이벤트 (레거시) 처리', () => {
      const event = createMockEvent({
        description: '레거시 설명',
        choices: [{ text: '확인', final: true }],
      });

      const result = getEventStep(event);

      expect(result).not.toBeNull();
      expect(result?.description).toBe('레거시 설명');
      expect(result?.choices.length).toBe(1);
    });

    it('description 없는 레거시 이벤트는 빈 문자열', () => {
      const event = createMockEvent({
        description: undefined,
        choices: [],
      });

      const result = getEventStep(event);

      expect(result?.description).toBe('');
    });

    it('choices 없는 레거시 이벤트는 빈 배열', () => {
      const event = createMockEvent({
        description: '설명',
        choices: undefined,
      });

      const result = getEventStep(event);

      expect(result?.choices).toEqual([]);
    });
  });

  describe('getEventTitle', () => {
    it('제목이 있으면 제목 반환', () => {
      const event = createMockEvent({ title: '멋진 이벤트' });

      const result = getEventTitle(event);

      expect(result).toBe('멋진 이벤트');
    });

    it('제목이 없으면 기본값 반환', () => {
      const event = createMockEvent({ title: undefined });

      const result = getEventTitle(event);

      expect(result).toBe('알 수 없는 사건');
    });

    it('null 이벤트면 기본값 반환', () => {
      const result = getEventTitle(null);

      expect(result).toBe('알 수 없는 사건');
    });

    it('undefined 이벤트면 기본값 반환', () => {
      const result = getEventTitle(undefined);

      expect(result).toBe('알 수 없는 사건');
    });
  });
});
