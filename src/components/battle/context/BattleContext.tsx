/**
 * @file BattleContext.tsx
 * @description 전투 시스템 Context Provider
 *
 * prop drilling을 줄이기 위해 전투 관련 상태와 유틸리티 함수를 Context로 제공합니다.
 *
 * ## 제공되는 값
 * - battle: 전투 상태 (phase, hand, selected 등)
 * - player: 플레이어 상태
 * - enemy: 적 상태
 * - enemyUnits: 다중 적 유닛 배열
 * - actions: 상태 변경 액션들
 * - formatters: 포맷팅 유틸리티 (formatSpeedText 등)
 */

import { createContext, useContext, ReactNode, FC } from 'react';
import type {
  ContextEnemyUnit as EnemyUnit,
  ContextPlayer as Player,
  ContextEnemy as Enemy,
  ContextBattle as Battle,
  ContextActions as Actions,
  ContextFormatters as Formatters,
} from '../../../types';

export interface BattleContextValue {
  battle: Battle;
  player: Player;
  enemy: Enemy;
  enemyUnits: EnemyUnit[];
  actions: Actions;
  formatters: Formatters;
}

const BattleContext = createContext<BattleContextValue | null>(null);

interface BattleProviderProps {
  children: ReactNode;
  value: BattleContextValue;
}

/**
 * BattleContext Provider
 */
export const BattleProvider: FC<BattleProviderProps> = ({ children, value }) => {
  return (
    <BattleContext.Provider value={value}>
      {children}
    </BattleContext.Provider>
  );
};

/**
 * BattleContext 사용 훅
 * @returns BattleContextValue
 * @throws Error Provider 외부에서 사용 시 에러
 */
export function useBattleContext(): BattleContextValue {
  const context = useContext(BattleContext);
  if (context === null) {
    throw new Error('useBattleContext must be used within a BattleProvider');
  }
  return context;
}

/**
 * 선택적 BattleContext 사용 훅 (Provider 없어도 동작)
 * @returns BattleContextValue | null
 */
export function useBattleContextOptional(): BattleContextValue | null {
  return useContext(BattleContext);
}

export default BattleContext;
