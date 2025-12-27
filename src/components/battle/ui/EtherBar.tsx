/**
 * EtherBar.tsx
 *
 * 에테르 게이지 바 컴포넌트
 */

import { FC } from 'react';
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from '../../../lib/etherUtils';
import { formatCompactValue } from '../utils/formatUtils';
import { PLAYER_SLOT_COLORS, ENEMY_SLOT_COLORS } from './constants/colors';
import type { EtherBarActions } from '../../../types';

const etherSlots = (pts: number): number => calculateEtherSlots(pts || 0);

interface EtherBarProps {
  pts: number;
  slots?: number;
  previewGain?: number;
  color?: 'cyan' | 'red';
  label?: string;
  pulse?: boolean;
  showBarTooltip?: boolean;
  showPtsTooltip?: boolean;
  actions?: EtherBarActions;
}

export const EtherBar: FC<EtherBarProps> = ({
  pts,
  slots,
  previewGain = 0,
  color = "cyan",
  label,
  pulse = false,
  showBarTooltip = false,
  showPtsTooltip = false,
  actions
}) => {
  const safePts = Number.isFinite(pts) ? pts : 0;
  const derivedSlots = Number.isFinite(slots) ? slots : etherSlots(safePts);
  const safeSlots = Number.isFinite(derivedSlots) ? derivedSlots : 0;
  const safePreview = Number.isFinite(previewGain) ? previewGain : 0;

  // 현재 슬롯 내의 pt (각 슬롯 도달시마다 0으로 리셋)
  const currentPts = getCurrentSlotPts(safePts);
  // 다음 슬롯을 채우는데 필요한 총 pt
  const nextSlotCost = getNextSlotCost(safePts);
  // 다음 슬롯까지의 진행률 (0-1)
  const slotProgress = getSlotProgress(safePts);
  // 진행률은 현재 슬롯 내 비율만 사용 (색상은 회전)
  const ratio = Math.max(0, Math.min(1, slotProgress));
  const tier = `x${safeSlots}`;

  const borderColor = color === 'red' ? '#ef4444' : '#53d7ff';
  const textColor = color === 'red' ? '#fca5a5' : '#8fd3ff';

  // 표시용 압축 문자열과 툴팁용 전체 문자열
  const compactCurrent = formatCompactValue(currentPts);
  const compactNext = formatCompactValue(nextSlotCost);
  const fullTitle = `${currentPts.toLocaleString()} / ${nextSlotCost.toLocaleString()}`;

  const slotColors = color === 'red' ? ENEMY_SLOT_COLORS : PLAYER_SLOT_COLORS;

  return (
    <div
      style={{
        width: '72px',
        padding: '12px 10px 16px',
        borderRadius: '36px',
        background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.95), rgba(10, 15, 25, 0.75))',
        border: '1px solid rgba(96, 210, 255, 0.35)',
        boxShadow: `${pulse ? '0 0 18px rgba(251,191,36,0.55), ' : ''}0 20px 40px rgba(0, 0, 0, 0.45)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative'
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#5fe0ff', letterSpacing: '0.12em' }}>
        {label}
      </div>
      <div style={{
        position: 'relative',
        width: '46px',
        height: '220px',
        margin: '0 auto',
        borderRadius: '30px',
        border: `2px solid ${borderColor}`,
        background: 'rgba(9, 17, 27, 0.95)',
        overflow: 'hidden',
      }}
        onMouseEnter={() => actions?.setShowBarTooltip(true)}
        onMouseLeave={() => actions?.setShowBarTooltip(false)}
      >
        <div style={{
          position: 'absolute',
          left: '3px',
          right: '3px',
          bottom: '3px',
          height: `${ratio * 100}%`,
          borderRadius: '24px',
          background: slotColors[((safeSlots ?? 0) % slotColors.length + slotColors.length) % slotColors.length],
          transition: 'height 0.8s ease-out'
        }} />
      </div>
      {showBarTooltip && (
        <div className="insight-tooltip" style={{ position: 'absolute', left: '50%', top: '0', transform: 'translate(-50%, -110%)', whiteSpace: 'nowrap', zIndex: 1200 }}>
          <div className="insight-tooltip-title">진행률</div>
          <div className="insight-tooltip-desc">{Math.round(slotProgress * 100)}%</div>
        </div>
      )}
      <div
        style={{ textAlign: 'center', color: textColor, fontSize: '20px', position: 'relative' }}
        onMouseEnter={() => actions?.setShowPtsTooltip(true)}
        onMouseLeave={() => actions?.setShowPtsTooltip(false)}
      >
        <div key={`pts-${safePts}`} style={{ fontFamily: 'monospace', lineHeight: 1.1, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div>{compactCurrent}</div>
          <div style={{ height: '1px', width: '100%', background: 'rgba(255,255,255,0.4)' }} />
          <div>{compactNext}</div>
        </div>
        <div style={{ marginTop: '6px' }}>{tier}</div>
        {safePreview > 0 && (
          <div style={{ color: '#6ee7b7', fontSize: '16px', marginTop: '4px' }}>
            +{safePreview.toLocaleString()}pt
          </div>
        )}
        {showPtsTooltip && (
          <div className="insight-tooltip" style={{ position: 'absolute', left: '50%', top: '-12px', transform: 'translate(-50%, -100%)', whiteSpace: 'nowrap', zIndex: 1200 }}>
            <div className="insight-tooltip-title">에테르</div>
            <div className="insight-tooltip-desc">{fullTitle}</div>
            {safePreview > 0 && (
              <div className="insight-tooltip-desc">+{safePreview.toLocaleString()} pt</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
