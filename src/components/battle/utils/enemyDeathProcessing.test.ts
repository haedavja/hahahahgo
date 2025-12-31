/**
 * @file enemyDeathProcessing.test.js
 * @description 적 사망 처리 테스트
 *
 * ## 테스트 대상
 * - processEnemyDeath: 적 HP 0 시 사망 처리 및 UI 업데이트
 *
 * ## 주요 테스트 케이스
 * - 적 피격 애니메이션(setEnemyHit) 활성화
 * - 사망 사운드 재생 (200Hz, 500ms)
 * - 타임라인 숨김 및 자동진행 중단
 * - 남은 카드 비활성화(disabledCardIndices)
 * - 에테르 누적 0일 때 최종값 설정
 */

import { describe, it, expect, vi } from 'vitest';
import { processEnemyDeath } from './enemyDeathProcessing';

describe('enemyDeathProcessing', () => {
  describe('processEnemyDeath', () => {
    const createMockActions = () => ({
      setEnemyHit: vi.fn(),
      setTimelineIndicatorVisible: vi.fn(),
      setAutoProgress: vi.fn(),
      setDisabledCardIndices: vi.fn(),
      setQIndex: vi.fn(),
      setEtherFinalValue: vi.fn()
    });

    it('적 피격 애니메이션을 활성화해야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 2,
        queue: [
          { actor: 'player', card: {} as any, originalIndex: 0 },
          { actor: 'enemy', card: {} as any, originalIndex: 1 },
          { actor: 'enemy', card: {} as any, originalIndex: 2 }
        ],
        queueLength: 3,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setEnemyHit).toHaveBeenCalledWith(true);
    });

    it('죽음 사운드를 재생해야 함 (200Hz, 500ms)', () => {
      const playSound = vi.fn();

      processEnemyDeath({
        newQIndex: 1,
        queue: [{ actor: 'player', card: {} as any, originalIndex: 0 }],
        queueLength: 1,
        turnEtherAccumulated: 10,
        playSound,
        actions: createMockActions()
      });

      expect(playSound).toHaveBeenCalledWith(200, 500);
    });

    it('타임라인 인디케이터를 숨겨야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 1,
        queue: [],
        queueLength: 2,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setTimelineIndicatorVisible).toHaveBeenCalledWith(false);
    });

    it('자동 진행을 중단해야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 1,
        queue: [],
        queueLength: 2,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setAutoProgress).toHaveBeenCalledWith(false);
    });

    it('남은 카드를 비활성화해야 함', () => {
      const actions = createMockActions();
      const queue = [
        { actor: 'player' as const, card: { name: 'Done' } as any, originalIndex: 0 },
        { actor: 'player' as const, card: { name: 'Done' } as any, originalIndex: 1 },
        { actor: 'enemy' as const, card: { name: 'Remaining 1' } as any, originalIndex: 2 },
        { actor: 'enemy' as const, card: { name: 'Remaining 2' } as any, originalIndex: 3 }
      ];

      processEnemyDeath({
        newQIndex: 2,
        queue,
        queueLength: 4,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      // 인덱스 2, 3이 비활성화되어야 함
      expect(actions.setDisabledCardIndices).toHaveBeenCalledWith([2, 3]);
    });

    it('빈 큐에서도 비활성화 인덱스가 빈 배열이어야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 0,
        queue: [],
        queueLength: 0,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setDisabledCardIndices).toHaveBeenCalledWith([]);
    });

    it('큐 인덱스를 끝으로 이동해야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 2,
        queue: [
          { actor: 'player', card: {} as any, originalIndex: 0 },
          { actor: 'player', card: {} as any, originalIndex: 1 },
          { actor: 'player', card: {} as any, originalIndex: 2 },
          { actor: 'player', card: {} as any, originalIndex: 3 },
          { actor: 'player', card: {} as any, originalIndex: 4 }
        ],
        queueLength: 5,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setQIndex).toHaveBeenCalledWith(5);
    });

    it('에테르 누적이 0이면 최종값 0으로 설정해야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 1,
        queue: [],
        queueLength: 1,
        turnEtherAccumulated: 0,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setEtherFinalValue).toHaveBeenCalledWith(0);
    });

    it('에테르 누적이 있으면 최종값을 설정하지 않아야 함', () => {
      const actions = createMockActions();

      processEnemyDeath({
        newQIndex: 1,
        queue: [],
        queueLength: 1,
        turnEtherAccumulated: 10,
        playSound: vi.fn(),
        actions
      });

      expect(actions.setEtherFinalValue).not.toHaveBeenCalled();
    });
  });
});
