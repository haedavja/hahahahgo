/**
 * PathosSlots.tsx
 *
 * 전투 화면용 파토스 (액티브 스킬) 슬롯 컴포넌트
 * phase가 'select' 또는 'respond'일 때만 파토스 사용 가능
 */

import { FC, MutableRefObject, memo, useCallback, useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from "../../../state/gameStore";
import {
  getEquippedPathos,
  canUsePathos,
  usePathos,
  PathosCooldowns,
  PathosUseResult
} from "../../../lib/pathosEffects";
import { PATHOS, type Pathos } from "../../../data/growth/pathosData";
import type {
  Combatant,
  BattleEvent
} from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  left: '20px',
  top: '90px',
  display: 'flex',
  gap: '8px',
  zIndex: 100,
};

const SLOT_BASE_STYLE: CSSProperties = {
  position: 'relative',
  width: '48px',
  height: '48px',
  borderRadius: '8px',
  background: 'rgba(12, 18, 32, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
};

const ICON_STYLE: CSSProperties = {
  fontSize: '20px',
  textAlign: 'center',
};

const COOLDOWN_OVERLAY_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '8px',
  fontSize: '18px',
  fontWeight: 800,
  color: '#f87171',
};

const TOOLTIP_BASE: CSSProperties = {
  position: 'absolute',
  left: '56px',
  top: '0',
  minWidth: '180px',
  padding: '10px 12px',
  background: 'rgba(15, 23, 42, 0.98)',
  border: '1px solid rgba(100, 140, 200, 0.5)',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 0.15s, visibility 0.15s',
  zIndex: 200,
  pointerEvents: 'none',
};

const TOOLTIP_TITLE_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: '13px',
  color: '#a78bfa',
  marginBottom: '6px',
};

const TOOLTIP_DESC_STYLE: CSSProperties = {
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.4,
  marginBottom: '6px',
};

const TOOLTIP_COOLDOWN_STYLE: CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  paddingTop: '4px',
  borderTop: '1px solid rgba(100, 120, 150, 0.3)',
};

const HOVER_CSS = `
  .battle-pathos-slot:hover .battle-pathos-tooltip {
    opacity: 1 !important;
    visibility: visible !important;
  }
`;

const TYPE_ICONS: Record<string, string> = {
  gun: '🔫',
  sword: '⚔️',
  common: '✨',
};

interface PathosSlotsProps {
  phase: string;
  player: Combatant;
  enemy: Combatant;
  cooldowns: PathosCooldowns;
  onPathosUsed: (result: PathosUseResult, newCooldowns: PathosCooldowns) => void;
  battleRef: { current: { phase?: string; [key: string]: unknown } | null };
}

export const PathosSlots: FC<PathosSlotsProps> = memo(({
  phase,
  player,
  enemy,
  cooldowns,
  onPathosUsed,
  battleRef
}) => {
  const equippedPathos = useMemo(() => getEquippedPathos(), []);

  // 파토스는 select/respond 단계에서만 사용 가능
  const canUsePathosByPhase = phase === 'select' || phase === 'respond';

  // 최신 phase를 가져오는 헬퍼 함수
  const getLatestPhase = useCallback((): string => battleRef?.current?.phase || phase, [battleRef, phase]);

  const handleUsePathos = useCallback((pathosId: string): void => {
    const latestPhase = getLatestPhase();
    const canUseNow = latestPhase === 'select' || latestPhase === 'respond';

    if (!canUseNow) {
      return;
    }

    if (!canUsePathos(pathosId, cooldowns)) {
      return;
    }

    // 파토스 사용
    const newCooldowns = { ...cooldowns };
    const result = usePathos(pathosId, player, enemy, newCooldowns);

    if (result.success) {
      onPathosUsed(result, newCooldowns);
    }
  }, [cooldowns, player, enemy, getLatestPhase, onPathosUsed]);

  const getSlotStyle = useCallback((canUse: boolean): CSSProperties => ({
    ...SLOT_BASE_STYLE,
    border: `2px solid ${canUse ? 'rgba(167, 139, 250, 0.9)' : 'rgba(120, 140, 180, 0.5)'}`,
    cursor: canUse ? 'pointer' : 'default',
    boxShadow: canUse ? '0 0 8px rgba(167, 139, 250, 0.4)' : 'none',
    opacity: canUse ? 1 : 0.6,
  }), []);

  if (equippedPathos.length === 0) {
    return null;
  }

  return (
    <div style={CONTAINER_STYLE}>
      {equippedPathos.map((pathos) => {
        const isOnCooldown = cooldowns[pathos.id] && cooldowns[pathos.id] > 0;
        const remainingCooldown = cooldowns[pathos.id] || 0;
        const canUse = canUsePathosByPhase && !isOnCooldown;
        const slotStyle = getSlotStyle(canUse);

        return (
          <div
            key={pathos.id}
            onClick={() => canUse && handleUsePathos(pathos.id)}
            className="battle-pathos-slot"
            style={slotStyle}
          >
            <span style={ICON_STYLE}>
              {TYPE_ICONS[pathos.type] || '✨'}
            </span>

            {/* 쿨다운 오버레이 */}
            {isOnCooldown && (
              <div style={COOLDOWN_OVERLAY_STYLE}>
                {remainingCooldown}
              </div>
            )}

            {/* 파토스 툴팁 */}
            <div style={TOOLTIP_BASE} className="battle-pathos-tooltip">
              <div style={TOOLTIP_TITLE_STYLE}>
                {pathos.name}
              </div>
              <div style={TOOLTIP_DESC_STYLE}>
                {pathos.description}
              </div>
              <div style={TOOLTIP_COOLDOWN_STYLE}>
                {isOnCooldown
                  ? `⏳ 쿨다운 ${remainingCooldown}턴`
                  : pathos.cooldown
                    ? `✓ 사용 가능 (쿨다운 ${pathos.cooldown}턴)`
                    : '✓ 쿨다운 없음'
                }
              </div>
            </div>
          </div>
        );
      })}

      <style>{HOVER_CSS}</style>
    </div>
  );
});
