/**
 * @file LogosSection.tsx
 * @description 로고스 섹션 컴포넌트 (피라미드 정점)
 */

import { memo } from 'react';
import { LOGOS, getLogosLevelFromPyramid, type LogosType } from '../../data/growth/logosData';
import type { initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../styles/theme';

interface LogosSectionProps {
  pyramidLevel: number;
  skillPoints: number;
  growth: typeof initialGrowthState;
  onUnlockLogos: (logosType: LogosType) => void;
}

export const LogosSection = memo(function LogosSection({
  pyramidLevel,
  skillPoints,
  growth,
  onUnlockLogos,
}: LogosSectionProps) {
  const maxUnlockableLevel = getLogosLevelFromPyramid(pyramidLevel);
  const hasSwordsman = growth.identities.includes('swordsman');
  const hasGunslinger = growth.identities.includes('gunslinger');
  const hasAnyIdentity = growth.identities.length > 0;

  return (
    <div style={{
      padding: SPACING.lg,
      background: 'rgba(251, 191, 36, 0.05)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      borderRadius: BORDER_RADIUS.xl,
      marginBottom: SPACING.xl,
    }}>
      <div style={{
        fontSize: FONT_SIZE.lg,
        color: COLORS.primary,
        marginBottom: '10px',
        fontWeight: 'bold',
      }}>
        ⬆ 로고스 {maxUnlockableLevel > 0
          ? `(최대 해금 가능: Lv${maxUnlockableLevel})`
          : <span style={{ color: COLORS.text.secondary, fontSize: FONT_SIZE.sm, marginLeft: SPACING.md }}>
              피라미드 Lv3 이상에서 레벨업 가능
            </span>
        }
      </div>

      <div style={{ display: 'flex', gap: SPACING.lg, flexWrap: 'wrap' }}>
        <LogosCard
          logos={LOGOS.battleWaltz}
          logosType="battleWaltz"
          currentLevel={growth.logosLevels.battleWaltz}
          maxUnlockableLevel={maxUnlockableLevel}
          skillPoints={skillPoints}
          locked={!hasSwordsman}
          lockReason="검사 자아 필요"
          onUnlock={onUnlockLogos}
        />

        <LogosCard
          logos={LOGOS.common}
          logosType="common"
          currentLevel={growth.logosLevels.common}
          maxUnlockableLevel={maxUnlockableLevel}
          skillPoints={skillPoints}
          locked={!hasAnyIdentity}
          lockReason="자아 1개 이상 필요"
          onUnlock={onUnlockLogos}
        />

        <LogosCard
          logos={LOGOS.gunkata}
          logosType="gunkata"
          currentLevel={growth.logosLevels.gunkata}
          maxUnlockableLevel={maxUnlockableLevel}
          skillPoints={skillPoints}
          locked={!hasGunslinger}
          lockReason="총잡이 자아 필요"
          onUnlock={onUnlockLogos}
        />
      </div>
    </div>
  );
});

// ========================================
// LogosCard 컴포넌트
// ========================================
interface LogosCardProps {
  logos: typeof LOGOS.common;
  logosType: LogosType;
  currentLevel: number;
  maxUnlockableLevel: number;
  skillPoints: number;
  locked: boolean;
  lockReason?: string;
  onUnlock: (logosType: LogosType) => void;
}

const LogosCard = memo(function LogosCard({
  logos,
  logosType,
  currentLevel,
  maxUnlockableLevel,
  skillPoints,
  locked,
  lockReason,
  onUnlock,
}: LogosCardProps) {
  const canUnlockNext = !locked && currentLevel < maxUnlockableLevel && skillPoints >= 1;

  return (
    <div style={{
      flex: 1,
      minWidth: '150px',
      padding: SPACING.md,
      background: locked ? 'rgba(71, 85, 105, 0.3)' : 'rgba(30, 41, 59, 0.5)',
      border: locked ? '1px dashed #6b7280' : '1px solid rgba(251, 191, 36, 0.3)',
      borderRadius: BORDER_RADIUS.lg,
    }}>
      {/* 헤더 */}
      <div style={{
        fontWeight: 'bold',
        color: locked ? COLORS.text.secondary : COLORS.primary,
        fontSize: FONT_SIZE.lg,
        marginBottom: SPACING.sm,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{logos.name} (Lv{currentLevel})</span>

        {locked && (
          <span style={{
            fontSize: FONT_SIZE.sm,
            color: COLORS.danger,
            background: 'rgba(239, 68, 68, 0.15)',
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
          }}>
            🔒 {lockReason || '자아 필요'}
          </span>
        )}

        {canUnlockNext && (
          <button
            onClick={() => onUnlock(logosType)}
            style={{
              padding: `${SPACING.xs} ${SPACING.sm}`,
              background: 'rgba(96, 165, 250, 0.2)',
              border: `1px solid ${COLORS.secondary}`,
              borderRadius: BORDER_RADIUS.md,
              color: COLORS.secondary,
              fontSize: FONT_SIZE.sm,
              cursor: 'pointer',
            }}
          >
            +1 [1P]
          </button>
        )}
      </div>

      {/* 레벨 목록 */}
      {logos.levels.map(level => (
        <LogosLevelItem
          key={level.level}
          level={level}
          isUnlocked={currentLevel >= level.level}
          isNextToUnlock={!locked && currentLevel + 1 === level.level && canUnlockNext}
          locked={locked}
          onUnlock={() => onUnlock(logosType)}
        />
      ))}
    </div>
  );
});

// ========================================
// LogosLevelItem 컴포넌트
// ========================================
interface LogosLevelItemProps {
  level: typeof LOGOS.common.levels[0];
  isUnlocked: boolean;
  isNextToUnlock: boolean;
  locked: boolean;
  onUnlock: () => void;
}

const LogosLevelItem = memo(function LogosLevelItem({
  level,
  isUnlocked,
  isNextToUnlock,
  locked,
  onUnlock,
}: LogosLevelItemProps) {
  const getStatusColor = () => {
    if (isUnlocked) return COLORS.success;
    if (isNextToUnlock) return COLORS.secondary;
    if (locked) return COLORS.text.secondary;
    return COLORS.text.muted;
  };

  const getNameColor = () => {
    if (isUnlocked) return COLORS.text.primary;
    if (locked) return '#cbd5e1';
    return COLORS.text.secondary;
  };

  return (
    <div
      onClick={() => isNextToUnlock && onUnlock()}
      style={{
        padding: `${SPACING.sm} ${SPACING.sm}`,
        marginBottom: SPACING.sm,
        background: isUnlocked
          ? 'rgba(251, 191, 36, 0.15)'
          : isNextToUnlock
            ? 'rgba(96, 165, 250, 0.1)'
            : 'transparent',
        border: isNextToUnlock ? '1px dashed #60a5fa' : '1px solid transparent',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZE.md,
        cursor: isNextToUnlock ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: getStatusColor() }}>
        {isUnlocked ? '✓' : isNextToUnlock ? '▷' : '○'} Lv{level.level}
      </span>
      <span style={{ color: getNameColor(), marginLeft: SPACING.sm }}>
        {level.name}
      </span>
      {isNextToUnlock && (
        <span style={{ color: COLORS.secondary, marginLeft: SPACING.sm, fontSize: FONT_SIZE.sm }}>
          [1P로 해금]
        </span>
      )}
      <div style={{
        color: isUnlocked ? COLORS.text.secondary : locked ? '#94a3b8' : COLORS.text.muted,
        fontSize: FONT_SIZE.sm,
        marginTop: SPACING.xs,
      }}>
        {level.effect.description}
      </div>
    </div>
  );
});

export default LogosSection;
