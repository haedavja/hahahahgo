/**
 * @file useBlockOverlay.ts
 * @description HP 바의 블록 오버레이 스타일 계산 hook
 *
 * PlayerHpBar와 EnemyHpBar에서 공통으로 사용하는 블록 오버레이 로직입니다.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { BLOCK_COLORS } from '../ui/constants/colors';

interface BlockOverlayProps {
  block: number | undefined;
  maxHp: number | undefined;
  hp: number | undefined;
}

/**
 * 블록 오버레이 스타일을 계산하는 hook
 *
 * @param props.block - 현재 블록 수치
 * @param props.maxHp - 최대 HP
 * @param props.hp - 현재 HP (maxHp 폴백용)
 * @returns CSSProperties - 블록 오버레이 스타일
 */
export function useBlockOverlay({ block, maxHp, hp }: BlockOverlayProps): CSSProperties {
  return useMemo((): CSSProperties => {
    const effectiveBlock = block ?? 0;
    const effectiveMaxHp = maxHp ?? hp ?? 1;

    return {
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: `${Math.min((effectiveBlock / effectiveMaxHp) * 100, 100)}%`,
      background: BLOCK_COLORS.gradient,
      borderRight: `2px solid ${BLOCK_COLORS.border}`,
    };
  }, [block, maxHp, hp]);
}

/**
 * HP 퍼센티지 계산
 *
 * @param hp - 현재 HP
 * @param maxHp - 최대 HP
 * @param hidden - 숨김 여부 (true면 0% 반환)
 * @returns 퍼센티지 문자열 (예: "75%")
 */
export function useHpPercentage(hp: number, maxHp: number | undefined, hidden: boolean = false): string {
  return useMemo(() => {
    if (hidden) return '0%';
    const percentage = (hp / (maxHp ?? hp ?? 1)) * 100;
    return `${percentage}%`;
  }, [hp, maxHp, hidden]);
}
