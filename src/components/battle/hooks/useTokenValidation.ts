/**
 * @file useTokenValidation.ts
 * @description 카드 토큰 요구사항 검증 훅
 *
 * useCardSelection에서 분리된 토큰 검증 로직
 * 종속성: player (1개)
 */

import { useCallback } from 'react';
import { getAllTokens } from '../../../lib/tokenUtils';
import type { Card, PlayerBattleState, TokenDisplayData } from '../../../types';

/** 토큰 검증 결과 */
export interface TokenValidationResult {
  ok: boolean;
  message?: string;
}

/**
 * 토큰 검증 훅
 *
 * @param player - 플레이어 전투 상태
 * @returns checkRequiredTokens 함수
 */
export function useTokenValidation(player: PlayerBattleState) {
  /**
   * 카드의 requiredTokens 요구사항 체크
   *
   * @param card - 검증할 카드
   * @param currentSelected - 현재 선택된 카드들
   * @returns 검증 결과 { ok, message? }
   */
  const checkRequiredTokens = useCallback(
    (card: Card, currentSelected: Card[]): TokenValidationResult => {
      if (!card.requiredTokens || card.requiredTokens.length === 0) {
        return { ok: true };
      }

      const playerTokens: TokenDisplayData[] = getAllTokens(player);

      for (const req of card.requiredTokens) {
        // 이미 선택된 카드들이 소모하는 해당 토큰 수 계산
        const alreadyReserved = currentSelected.reduce((sum: number, c: Card) => {
          if (!c.requiredTokens) return sum;
          const sameReq = c.requiredTokens.find(r => r.id === req.id);
          return sum + (sameReq ? sameReq.stacks : 0);
        }, 0);

        // 플레이어가 보유한 해당 토큰 수
        const playerToken = playerTokens.find(t => t.id === req.id);
        const playerStacks = playerToken?.stacks || 0;

        // 사용 가능한 토큰 수 = 보유량 - 이미 선택된 카드가 요구하는 양
        const available = playerStacks - alreadyReserved;

        if (available < req.stacks) {
          const tokenName = playerToken?.name || req.id;
          return {
            ok: false,
            message: `⚠️ ${tokenName} 부족 (필요: ${req.stacks}, 사용 가능: ${available})`,
          };
        }
      }

      return { ok: true };
    },
    [player]
  );

  return { checkRequiredTokens };
}
