/**
 * @file BattleContext.jsx
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

import { createContext, useContext } from 'react';

/**
 * @typedef {Object} BattleContextValue
 * @property {Object} battle - 전투 상태
 * @property {Object} player - 플레이어 상태
 * @property {Object} enemy - 적 상태
 * @property {Array} enemyUnits - 다중 적 유닛 배열
 * @property {Object} actions - 상태 변경 액션들
 * @property {Object} formatters - 포맷팅 유틸리티
 */

const BattleContext = createContext(null);

/**
 * BattleContext Provider
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {BattleContextValue} props.value
 */
export function BattleProvider({ children, value }) {
  return (
    <BattleContext.Provider value={value}>
      {children}
    </BattleContext.Provider>
  );
}

/**
 * BattleContext 사용 훅
 * @returns {BattleContextValue}
 * @throws {Error} Provider 외부에서 사용 시 에러
 */
export function useBattleContext() {
  const context = useContext(BattleContext);
  if (context === null) {
    throw new Error('useBattleContext must be used within a BattleProvider');
  }
  return context;
}

/**
 * 선택적 BattleContext 사용 훅 (Provider 없어도 동작)
 * @returns {BattleContextValue|null}
 */
export function useBattleContextOptional() {
  return useContext(BattleContext);
}

export default BattleContext;
