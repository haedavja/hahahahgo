/**
 * @file usePathosManagement.ts
 * @description 파토스(감정) 시스템 관리 커스텀 Hook
 *
 * 파토스 쿨다운, 턴 효과, 다음 카드 효과를 관리합니다.
 */

import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react';
import { PathosCooldowns, PathosUseResult, decreaseCooldowns } from '../../../lib/pathosEffects';
import type { BattleActions } from './useBattleState';
import type { PlayerState, EnemyState } from '../reducer/battleReducerActions';

interface UsePathosManagementParams {
  actions: BattleActions;
  battlePhase: string;
  turnNumber: number;
  battleRef: MutableRefObject<{ pathosTurnEffects?: PathosUseResult['turnEffects']; pathosNextCardEffects?: PathosUseResult['nextCardEffects'] } | null>;
}

interface UsePathosManagementResult {
  pathosCooldowns: PathosCooldowns;
  pathosTurnEffects: PathosUseResult['turnEffects'];
  pathosNextCardEffects: PathosUseResult['nextCardEffects'];
  handlePathosUsed: (result: PathosUseResult, newCooldowns: PathosCooldowns) => void;
  consumeNextCardEffects: () => void;
}

/**
 * 파토스 시스템 관리 Hook
 *
 * @param params - 파라미터 객체
 * @returns 파토스 상태 및 핸들러
 */
export function usePathosManagement({
  actions,
  battlePhase,
  turnNumber,
  battleRef,
}: UsePathosManagementParams): UsePathosManagementResult {
  // 파토스 상태
  const [pathosCooldowns, setPathosCooldowns] = useState<PathosCooldowns>({});
  const [pathosTurnEffects, setPathosTurnEffects] = useState<PathosUseResult['turnEffects']>(undefined);
  const [pathosNextCardEffects, setPathosNextCardEffects] = useState<PathosUseResult['nextCardEffects']>(undefined);

  // 파토스 사용 결과 처리
  const handlePathosUsed = useCallback((result: PathosUseResult, newCooldowns: PathosCooldowns) => {
    // 쿨다운 업데이트
    setPathosCooldowns(newCooldowns);

    // 플레이어/적 상태 업데이트
    if (result.updatedPlayer) {
      actions.setPlayer(result.updatedPlayer as PlayerState);
    }
    if (result.updatedEnemy) {
      actions.setEnemy(result.updatedEnemy as EnemyState);
    }

    // 로그 추가
    result.logs.forEach(log => actions.addLog(log));

    // turnEffects와 nextCardEffects 저장 (병합)
    if (result.turnEffects) {
      setPathosTurnEffects(prev => ({ ...prev, ...result.turnEffects }));
    }
    if (result.nextCardEffects) {
      setPathosNextCardEffects(prev => ({ ...prev, ...result.nextCardEffects }));
    }
  }, [actions]);

  // 파토스 쿨다운 감소 및 턴 효과 초기화 (턴 시작 시)
  const prevTurnNumberRef = useRef(0);
  useEffect(() => {
    if (turnNumber > prevTurnNumberRef.current && battlePhase === 'select') {
      setPathosCooldowns((prev: PathosCooldowns) => decreaseCooldowns(prev));
      setPathosTurnEffects(undefined); // 턴 효과 초기화
      prevTurnNumberRef.current = turnNumber;
    }
  }, [turnNumber, battlePhase]);

  // battleRef에 파토스 효과 동기화
  useEffect(() => {
    if (battleRef.current) {
      battleRef.current.pathosTurnEffects = pathosTurnEffects;
      battleRef.current.pathosNextCardEffects = pathosNextCardEffects;
    }
  }, [pathosTurnEffects, pathosNextCardEffects, battleRef]);

  // 다음 카드 효과 소모 함수
  const consumeNextCardEffects = useCallback(() => {
    setPathosNextCardEffects(undefined);
  }, []);

  return {
    pathosCooldowns,
    pathosTurnEffects,
    pathosNextCardEffects,
    handlePathosUsed,
    consumeNextCardEffects,
  };
}
