/**
 * @file EnhancePreviewPanel.tsx
 * @description 카드 강화 미리보기 패널
 */

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  getNextEnhancementPreview,
  getAllEnhancementLevels,
  getEnhancementColor,
  getEnhancementLabel,
  isEnhanceable,
  calculateEnhancedStats,
} from '../../../../lib/cardEnhancementUtils';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../../../../styles/theme';

interface EnhancePreviewPanelProps {
  cardId: string;
  cardName: string;
  currentLevel: number;
  gold: number;
  cost: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EnhancePreviewPanel = memo(function EnhancePreviewPanel({
  cardId,
  cardName,
  currentLevel,
  gold,
  cost,
  onConfirm,
  onCancel,
}: EnhancePreviewPanelProps) {
  const nextPreview = useMemo(() => getNextEnhancementPreview(cardId, currentLevel), [cardId, currentLevel]);
  const allLevels = useMemo(() => getAllEnhancementLevels(cardId), [cardId]);
  const canEnhance = useMemo(() => isEnhanceable(cardId) && currentLevel < 5, [cardId, currentLevel]);
  const canAfford = gold >= cost;

  const currentStats = useMemo(
    () => currentLevel > 0 ? calculateEnhancedStats(cardId, currentLevel) : null,
    [cardId, currentLevel]
  );
  const nextStats = useMemo(
    () => canEnhance ? calculateEnhancedStats(cardId, currentLevel + 1) : null,
    [canEnhance, cardId, currentLevel]
  );

  return (
    <div style={{
      padding: SPACING.lg,
      background: 'rgba(96, 165, 250, 0.1)',
      borderRadius: BORDER_RADIUS.xl,
      border: '1px solid rgba(96, 165, 250, 0.3)',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
      }}>
        <div style={{ fontWeight: 700, color: COLORS.secondary }}>⚔️ 강화</div>
        {currentLevel > 0 && (
          <span style={{
            fontSize: FONT_SIZE.lg,
            padding: `${SPACING.xs} ${SPACING.md}`,
            borderRadius: BORDER_RADIUS.md,
            background: getEnhancementColor(currentLevel),
            color: '#0f172a',
            fontWeight: 700,
          }}>
            현재 {getEnhancementLabel(currentLevel)}
          </span>
        )}
      </div>

      {/* 강화 가능한 경우 */}
      {canEnhance && nextPreview ? (
        <>
          <NextEnhancementPreview
            cardName={cardName}
            preview={nextPreview}
          />

          {nextStats && <AccumulatedStats stats={nextStats} />}

          <EnhancementProgress
            levels={allLevels}
            currentLevel={currentLevel}
          />
        </>
      ) : (
        <div style={{ fontSize: '13px', color: COLORS.text.secondary, marginBottom: '10px' }}>
          {currentLevel >= 5 ? '최대 강화에 도달했습니다.' : '이 카드는 강화할 수 없습니다.'}
        </div>
      )}

      {/* 비용 표시 */}
      {canEnhance && (
        <CostDisplay gold={gold} cost={cost} canAfford={canAfford} />
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: SPACING.md }}>
        <button
          className="btn"
          onClick={onConfirm}
          disabled={!canEnhance || !canAfford}
          style={{
            background: canEnhance && canAfford ? 'rgba(96, 165, 250, 0.2)' : undefined,
            opacity: !canAfford ? 0.5 : 1,
          }}
        >
          {canAfford ? '강화 확정' : '골드 부족'}
        </button>
        <button className="btn" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
});

// ========================================
// 다음 강화 효과 미리보기
// ========================================
interface NextEnhancementPreviewProps {
  cardName: string;
  preview: ReturnType<typeof getNextEnhancementPreview>;
}

const NextEnhancementPreview = memo(function NextEnhancementPreview({
  cardName,
  preview,
}: NextEnhancementPreviewProps) {
  if (!preview) return null;

  const getMilestoneStyle = (level: number) => {
    if (level === 5) return { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' };
    if (level === 3) return { bg: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', border: 'rgba(167, 139, 250, 0.4)' };
    return { bg: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' };
  };

  const isMilestone = preview.level === 1 || preview.level === 3 || preview.level === 5;
  const milestoneStyle = getMilestoneStyle(preview.level);

  return (
    <div style={{
      padding: '10px',
      background: 'rgba(15, 23, 42, 0.8)',
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: '10px',
      border: preview.isMilestone ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(71, 85, 105, 0.5)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
      }}>
        <span style={{ fontSize: '13px', color: COLORS.text.secondary }}>
          {cardName} → {getEnhancementLabel(preview.level)}
        </span>
        {isMilestone && (
          <span style={{
            fontSize: FONT_SIZE.md,
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            background: milestoneStyle.bg,
            color: milestoneStyle.color,
            border: `1px solid ${milestoneStyle.border}`,
          }}>
            {preview.level === 1 ? '희귀 등급' : preview.level === 3 ? '특별 등급' : '전설 등급'}
          </span>
        )}
      </div>
      <div style={{
        fontSize: '14px',
        color: getEnhancementColor(preview.level),
        fontWeight: 600,
      }}>
        {preview.description}
      </div>
    </div>
  );
});

// ========================================
// 누적 스탯 표시
// ========================================
interface AccumulatedStatsProps {
  stats: ReturnType<typeof calculateEnhancedStats>;
}

const AccumulatedStats = memo(function AccumulatedStats({ stats }: AccumulatedStatsProps) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: FONT_SIZE.lg, color: COLORS.text.secondary, marginBottom: SPACING.sm }}>
        총 누적 효과:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
        {stats.damageBonus > 0 && (
          <StatBadge label="피해" value={`+${stats.damageBonus}`} color="#f87171" />
        )}
        {stats.blockBonus > 0 && (
          <StatBadge label="방어" value={`+${stats.blockBonus}`} color={COLORS.secondary} />
        )}
        {stats.speedCostReduction > 0 && (
          <StatBadge label="속도" value={`-${stats.speedCostReduction}`} color="#4ade80" />
        )}
        {stats.actionCostReduction > 0 && (
          <StatBadge label="행동력" value={`-${stats.actionCostReduction}`} color={COLORS.primary} />
        )}
        {stats.hitsBonus > 0 && (
          <StatBadge label="타격" value={`+${stats.hitsBonus}`} color="#f472b6" />
        )}
        {stats.specialEffects.length > 0 && (
          <span style={{
            fontSize: FONT_SIZE.md,
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            background: 'rgba(167, 139, 250, 0.2)',
            color: '#a78bfa',
            border: '1px solid rgba(167, 139, 250, 0.4)',
          }}>
            ✨ 특수효과 {stats.specialEffects.length}개
          </span>
        )}
      </div>
    </div>
  );
});

// ========================================
// 강화 진행도
// ========================================
interface EnhancementProgressProps {
  levels: ReturnType<typeof getAllEnhancementLevels>;
  currentLevel: number;
}

const EnhancementProgress = memo(function EnhancementProgress({
  levels,
  currentLevel,
}: EnhancementProgressProps) {
  return (
    <div style={{ marginBottom: SPACING.lg }}>
      <div style={{ fontSize: FONT_SIZE.lg, color: COLORS.text.secondary, marginBottom: SPACING.sm }}>
        강화 진행:
      </div>
      <div style={{ display: 'flex', gap: SPACING.sm }}>
        {levels.map((level) => (
          <div
            key={level.level}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: BORDER_RADIUS.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: FONT_SIZE.lg,
              fontWeight: 700,
              background: level.level <= currentLevel
                ? getEnhancementColor(level.level)
                : level.level === currentLevel + 1
                  ? 'rgba(96, 165, 250, 0.3)'
                  : 'rgba(71, 85, 105, 0.3)',
              color: level.level <= currentLevel ? '#0f172a' : COLORS.text.secondary,
              border: level.isMilestone
                ? '2px solid rgba(251, 191, 36, 0.6)'
                : '1px solid rgba(71, 85, 105, 0.5)',
            }}
            title={level.description}
          >
            {level.level}
          </div>
        ))}
      </div>
    </div>
  );
});

// ========================================
// 비용 표시
// ========================================
interface CostDisplayProps {
  gold: number;
  cost: number;
  canAfford: boolean;
}

const CostDisplay = memo(function CostDisplay({ gold, cost, canAfford }: CostDisplayProps) {
  return (
    <div style={{
      marginBottom: '10px',
      padding: SPACING.md,
      background: canAfford ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      borderRadius: BORDER_RADIUS.lg,
      border: canAfford ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: '13px', color: COLORS.text.secondary }}>강화 비용:</span>
      <span style={{
        fontSize: '14px',
        fontWeight: 700,
        color: canAfford ? COLORS.primary : COLORS.danger,
      }}>
        💰 {cost} (보유: {gold})
      </span>
    </div>
  );
});

// ========================================
// 스탯 뱃지
// ========================================
interface StatBadgeProps {
  label: string;
  value: string;
  color: string;
}

export const StatBadge = memo(function StatBadge({ label, value, color }: StatBadgeProps) {
  const style: CSSProperties = {
    fontSize: FONT_SIZE.md,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.md,
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}40`,
  };

  return (
    <span style={style}>
      {label} {value}
    </span>
  );
});

export default EnhancePreviewPanel;
