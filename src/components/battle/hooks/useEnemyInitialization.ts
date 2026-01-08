/**
 * @file useEnemyInitialization.ts
 * @description 적 초기화 훅
 *
 * ## 주요 기능
 * - 적 상태 초기화 (체력, 덱 등)
 * - 전투 상태 리셋
 * - 페이즈 select로 설정
 */

import { useEffect, type MutableRefObject } from 'react';
import { createReducerEnemyState } from '../../../state/battleHelpers';
import type { BattlePhase } from '../reducer/battleReducerActions';
import { ENEMIES } from '../battleData';

interface InitialEnemy {
  deck?: string[];
  name?: string;
  [key: string]: unknown;
}

interface UseEnemyInitializationParams {
  initialEnemy: InitialEnemy | null;
  prevRevealLevelRef: MutableRefObject<number>;
  actions: {
    setEnemy: (enemy: unknown) => void;
    setSelected: (selected: unknown[]) => void;
    setQueue: (queue: unknown[]) => void;
    setQIndex: (index: number) => void;
    setFixedOrder: (order: unknown) => void;
    setPhase: (phase: BattlePhase) => void;
  };
}

/**
 * 적 초기화 훅
 */
export function useEnemyInitialization(params: UseEnemyInitializationParams): void {
  const {
    initialEnemy,
    prevRevealLevelRef,
    actions
  } = params;

  useEffect(() => {
    if (!initialEnemy) return;
    const enemyState = createReducerEnemyState({
      ...initialEnemy,
      deck: (initialEnemy.deck as string[]) || ENEMIES[0]?.deck || [],
      name: initialEnemy.name ?? '적',
    } as Parameters<typeof createReducerEnemyState>[0]);
    actions.setEnemy(enemyState);
    actions.setSelected([]);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setFixedOrder(null);
    // 참고: turnStartProcessedRef는 player init에서 이미 리셋됨
    // 여기서 다시 리셋하면 턴 시작 효과가 두 번 발동됨
    prevRevealLevelRef.current = 0;
    actions.setPhase('select');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
