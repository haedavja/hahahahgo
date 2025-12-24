/**
 * @file enemyDeathProcessing.test.js
 * @description enemyDeathProcessing 함수 테스트
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
        queue: [{ actor: 'player' }, { actor: 'enemy' }, { actor: 'enemy' }],
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
        queue: [{ actor: 'player' }],
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
        { actor: 'player', card: { name: 'Done' } },
        { actor: 'player', card: { name: 'Done' } },
        { actor: 'enemy', card: { name: 'Remaining 1' } },
        { actor: 'enemy', card: { name: 'Remaining 2' } }
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
        queue: [1, 2, 3, 4, 5],
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
