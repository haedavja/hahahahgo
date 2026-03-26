/**
 * @file GrowthStatsPanel.tsx
 * @description 카드 성장 통계 패널
 */

import { useState, memo } from 'react';
import type { CSSProperties } from 'react';
import type { CardGrowthState } from '../../../../state/slices/types';
import { calculateGrowthStats } from './restConstants';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../../../../styles/theme';

interface GrowthStatsPanelProps {
  cardGrowth: Record<string, CardGrowthState>;
}

export const GrowthStatsPanel = memo(function GrowthStatsPanel({
  cardGrowth,
}: GrowthStatsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = calculateGrowthStats(cardGrowth);

  if (stats.totalCards === 0) {
    return null;
  }

  return (
    <div style={{
      marginBottom: '10px',
      padding: `${SPACING.md} 10px`,
      background: 'rgba(96, 165, 250, 0.08)',
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(96, 165, 250, 0.2)',
    }}>
      {/* 토글 버튼 */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: COLORS.text.primary,
        }}
      >
        <span style={{ fontSize: FONT_SIZE.lg, fontWeight: 600, color: COLORS.secondary }}>
          📊 성장 현황
        </span>
        <span style={{ fontSize: FONT_SIZE.md, color: COLORS.text.secondary }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* 요약 (항상 표시) */}
      <div style={{
        display: 'flex',
        gap: SPACING.lg,
        marginTop: SPACING.sm,
        fontSize: FONT_SIZE.md,
        color: COLORS.text.secondary,
      }}>
        <span>
          강화 <span style={{ color: COLORS.secondary, fontWeight: 600 }}>{stats.enhancedCards}</span>장
        </span>
        <span>
          특화 <span style={{ color: COLORS.success, fontWeight: 600 }}>{stats.specializedCards}</span>장
        </span>
        {stats.rarityBreakdown.legendary > 0 && (
          <span style={{ color: COLORS.primary }}>
            ★ 전설 {stats.rarityBreakdown.legendary}
          </span>
        )}
      </div>

      {/* 상세 정보 (확장 시) */}
      {expanded && (
        <ExpandedStats stats={stats} />
      )}
    </div>
  );
});

// ========================================
// 상세 통계 섹션
// ========================================
interface ExpandedStatsProps {
  stats: ReturnType<typeof calculateGrowthStats>;
}

const ExpandedStats = memo(function ExpandedStats({ stats }: ExpandedStatsProps) {
  return (
    <div style={{
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: '1px solid rgba(96, 165, 250, 0.15)',
    }}>
      {/* 강화 통계 */}
      <StatSection
        icon="⚔️"
        title="강화"
        color={COLORS.secondary}
      >
        <StatMini label="총 강화" value={`+${stats.totalEnhancementLevels}`} color={COLORS.secondary} />
        <StatMini label="최고 레벨" value={`+${stats.maxEnhancementLevel}`} color="#a78bfa" />
      </StatSection>

      {/* 특화 통계 */}
      <StatSection
        icon="✨"
        title="특화"
        color={COLORS.success}
      >
        <StatMini label="총 특화" value={`${stats.totalSpecializations}회`} color={COLORS.success} />
        <StatMini label="부여 특성" value={`${stats.totalTraits}개`} color="#34d399" />
      </StatSection>

      {/* 등급 분포 */}
      <StatSection
        icon="🏆"
        title="등급 분포"
        color={COLORS.primary}
        isLast
      >
        {stats.rarityBreakdown.legendary > 0 && (
          <StatMini label="전설" value={stats.rarityBreakdown.legendary.toString()} color={COLORS.primary} />
        )}
        {stats.rarityBreakdown.special > 0 && (
          <StatMini label="특별" value={stats.rarityBreakdown.special.toString()} color="#34d399" />
        )}
        {stats.rarityBreakdown.rare > 0 && (
          <StatMini label="희귀" value={stats.rarityBreakdown.rare.toString()} color={COLORS.secondary} />
        )}
        <StatMini label="일반" value={stats.rarityBreakdown.common.toString()} color={COLORS.text.secondary} />
      </StatSection>
    </div>
  );
});

// ========================================
// 통계 섹션 래퍼
// ========================================
interface StatSectionProps {
  icon: string;
  title: string;
  color: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const StatSection = memo(function StatSection({
  icon,
  title,
  color,
  children,
  isLast = false,
}: StatSectionProps) {
  return (
    <div style={{ marginBottom: isLast ? 0 : SPACING.md }}>
      <div style={{
        fontSize: FONT_SIZE.md,
        color,
        fontWeight: 600,
        marginBottom: SPACING.sm,
      }}>
        {icon} {title}
      </div>
      <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
});

// ========================================
// 미니 스탯 뱃지
// ========================================
interface StatMiniProps {
  label: string;
  value: string;
  color: string;
}

export const StatMini = memo(function StatMini({ label, value, color }: StatMiniProps) {
  const style: CSSProperties = {
    fontSize: FONT_SIZE.sm,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.md,
    background: `${color}15`,
    color: color,
    border: `1px solid ${color}30`,
  };

  return (
    <span style={style}>
      {label}: <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  );
});

export default GrowthStatsPanel;
