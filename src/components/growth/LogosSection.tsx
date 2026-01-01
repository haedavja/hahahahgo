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
    <div style={{ marginBottom: '80px' }}>
      {/* CSS Grid로 고정 레이아웃 - 피라미드 형태 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '110px repeat(3, 200px)', // 헤더(10% 확대) + 3개 카드 고정
        gap: SPACING.md,
        alignItems: 'stretch', // 모든 셀 높이 동일화
        marginLeft: '362px', // 공용 로고스가 자아 중앙에 오도록 배치
      }}>
        {/* 8단계 로고스 헤더 */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          padding: `${SPACING.sm} ${SPACING.md}`,
          background: maxUnlockableLevel > 0 ? '#1e293b' : '#141a22', // 불투명 배경
          border: `1px solid ${maxUnlockableLevel > 0 ? COLORS.primary : '#334155'}`,
          borderRadius: BORDER_RADIUS.lg,
          fontSize: FONT_SIZE.md,
          color: maxUnlockableLevel > 0 ? COLORS.primary : COLORS.text.muted,
          fontWeight: 'bold',
          alignSelf: 'start', // Grid stretch 무시 - 헤더 크기 유지
        }}>
          {maxUnlockableLevel === 0 && '🔒 '}8단계 로고스
        </div>

        {/* 로고스 카드들 */}
        <LogosCard
          logos={LOGOS.battleWaltz}
          logosType="battleWaltz"
          nodeId="logos-battleWaltz"
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
          nodeId="logos-common"
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
          nodeId="logos-gunkata"
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
  nodeId: string;
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
  nodeId,
  currentLevel,
  maxUnlockableLevel,
  skillPoints,
  locked,
  lockReason,
  onUnlock,
}: LogosCardProps) {
  const canUnlockNext = !locked && currentLevel < maxUnlockableLevel && skillPoints >= 1;

  return (
    <div
      data-node-id={nodeId}
      style={{
        position: 'relative',
        zIndex: 10, // 연결선 위에 표시
        // Grid가 크기 제어하므로 width/flex 속성 불필요
        padding: SPACING.md,
        boxSizing: 'border-box',
        background: locked ? '#141a22' : '#1a2f2a', // 1~6단계와 동일 (잠금: #141a22)
        border: locked ? '1px dashed #6b7280' : '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: BORDER_RADIUS.lg,
        minHeight: '220px', // 카드 최소 높이 고정 - 레이아웃 안정화
      }}
    >
      {/* 콘텐츠 wrapper - 1~6단계와 동일하게 콘텐츠만 opacity 적용 */}
      <div style={{ opacity: locked ? 0.5 : 1 }}>
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
        fontSize: '12px', // FONT_SIZE.sm (10px)의 20% 확대
        marginTop: SPACING.xs,
      }}>
        {level.effect.description}
      </div>
    </div>
  );
});

export default LogosSection;
