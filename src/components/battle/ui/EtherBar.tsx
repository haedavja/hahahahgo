/**
 * EtherBar.tsx
 *
 * 에테르 게이지 바 컴포넌트
 * 최적화: 헬퍼 함수 추출, memo 적용, 스타일 상수 추출
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from '../../../lib/etherUtils';
import { formatCompactValue } from '../utils/formatUtils';
import { PLAYER_SLOT_COLORS, ENEMY_SLOT_COLORS } from './constants/colors';
import type { EtherBarActions } from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_BASE_STYLE: CSSProperties = {
  width: '72px',
  padding: '12px 10px 16px',
  borderRadius: '36px',
  background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.95), rgba(10, 15, 25, 0.75))',
  border: '1px solid rgba(96, 210, 255, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  position: 'relative'
};

const LABEL_STYLE: CSSProperties = {
  fontSize: '11px',
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#5fe0ff',
  letterSpacing: '0.12em'
};

const BAR_WRAPPER_BASE_STYLE: CSSProperties = {
  position: 'relative',
  width: '46px',
  height: '220px',
  margin: '0 auto',
  borderRadius: '30px',
  background: 'rgba(9, 17, 27, 0.95)',
  overflow: 'hidden'
};

const BAR_FILL_BASE_STYLE: CSSProperties = {
  position: 'absolute',
  left: '3px',
  right: '3px',
  bottom: '3px',
  borderRadius: '24px',
  transition: 'height 0.8s ease-out'
};

const TOOLTIP_STYLE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '0',
  transform: 'translate(-50%, -110%)',
  whiteSpace: 'nowrap',
  zIndex: 1200
};

const PTS_CONTAINER_BASE_STYLE: CSSProperties = {
  textAlign: 'center',
  fontSize: '20px',
  position: 'relative'
};

const PTS_DISPLAY_STYLE: CSSProperties = {
  fontFamily: 'monospace',
  lineHeight: 1.1,
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px'
};

const DIVIDER_STYLE: CSSProperties = {
  height: '1px',
  width: '100%',
  background: 'rgba(255,255,255,0.4)'
};

const TIER_STYLE: CSSProperties = {
  marginTop: '6px'
};

const PREVIEW_STYLE: CSSProperties = {
  color: '#6ee7b7',
  fontSize: '16px',
  marginTop: '4px'
};

const PTS_TOOLTIP_STYLE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '-12px',
  transform: 'translate(-50%, -100%)',
  whiteSpace: 'nowrap',
  zIndex: 1200
};

const etherSlots = (pts: number): number => calculateEtherSlots(pts || 0);

/**
 * 숫자가 유효한지 검증하고 기본값 반환
 * 반복되는 Number.isFinite 검증을 단일 헬퍼로 추출
 */
const ensureFinite = (value: number | undefined, fallback: number): number =>
  Number.isFinite(value) ? value! : fallback;

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

export const EtherBar: FC<EtherBarProps> = memo(({
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
  // 헬퍼 함수로 중복 검증 제거
  const safePts = ensureFinite(pts, 0);
  const derivedSlots = ensureFinite(slots, etherSlots(safePts));
  const safeSlots = ensureFinite(derivedSlots, 0);
  const safePreview = ensureFinite(previewGain, 0);
  const slotColorIndex = safeSlots % PLAYER_SLOT_COLORS.length;

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

  // 동적 스타일 메모이제이션
  const containerStyle = useMemo((): CSSProperties => ({
    ...CONTAINER_BASE_STYLE,
    boxShadow: `${pulse ? '0 0 18px rgba(251,191,36,0.55), ' : ''}0 20px 40px rgba(0, 0, 0, 0.45)`
  }), [pulse]);

  const barWrapperStyle = useMemo((): CSSProperties => ({
    ...BAR_WRAPPER_BASE_STYLE,
    border: `2px solid ${borderColor}`
  }), [borderColor]);

  const barFillStyle = useMemo((): CSSProperties => ({
    ...BAR_FILL_BASE_STYLE,
    height: `${ratio * 100}%`,
    background: slotColors[slotColorIndex]
  }), [ratio, slotColors, slotColorIndex]);

  const ptsContainerStyle = useMemo((): CSSProperties => ({
    ...PTS_CONTAINER_BASE_STYLE,
    color: textColor
  }), [textColor]);

  return (
    <div style={containerStyle}>
      <div style={LABEL_STYLE}>
        {label}
      </div>
      <div
        style={barWrapperStyle}
        onMouseEnter={() => actions?.setShowBarTooltip(true)}
        onMouseLeave={() => actions?.setShowBarTooltip(false)}
      >
        <div style={barFillStyle} />
      </div>
      {showBarTooltip && (
        <div className="insight-tooltip" style={TOOLTIP_STYLE}>
          <div className="insight-tooltip-title">진행률</div>
          <div className="insight-tooltip-desc">{Math.round(slotProgress * 100)}%</div>
        </div>
      )}
      <div
        style={ptsContainerStyle}
        onMouseEnter={() => actions?.setShowPtsTooltip(true)}
        onMouseLeave={() => actions?.setShowPtsTooltip(false)}
      >
        <div key={`pts-${safePts}`} style={PTS_DISPLAY_STYLE}>
          <div>{compactCurrent}</div>
          <div style={DIVIDER_STYLE} />
          <div>{compactNext}</div>
        </div>
        <div style={TIER_STYLE}>{tier}</div>
        {safePreview > 0 && (
          <div style={PREVIEW_STYLE}>
            +{safePreview.toLocaleString()}pt
          </div>
        )}
        {showPtsTooltip && (
          <div className="insight-tooltip" style={PTS_TOOLTIP_STYLE}>
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
});
