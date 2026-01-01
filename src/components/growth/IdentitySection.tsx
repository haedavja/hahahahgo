/**
 * @file IdentitySection.tsx
 * @description 자아 선택 섹션 (검사/총잡이)
 *
 * 해금 조건:
 * - 검사: 검(sword) 타입 에토스/파토스 5개 이상 선택
 * - 총잡이: 총(gun) 타입 에토스/파토스 5개 이상 선택
 */

import { memo } from 'react';
import { IDENTITIES, type IdentityType } from '../../data/growth/identityData';
import { ETHOS } from '../../data/growth/ethosData';
import { PATHOS } from '../../data/growth/pathosData';
import type { initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../../styles/theme';

interface IdentitySectionProps {
  pyramidLevel: number;
  selectedIdentities: IdentityType[];
  growth: typeof initialGrowthState;
  onSelectIdentity: (id: IdentityType) => void;
}

// 타입별 선택 개수 계산
function countTypeSelections(growth: typeof initialGrowthState, type: 'sword' | 'gun'): number {
  let count = 0;

  // 에토스 카운트
  for (const ethosId of growth.unlockedEthos) {
    const ethos = ETHOS[ethosId];
    if (ethos && ethos.type === type) {
      count++;
    }
  }

  // 파토스 카운트
  for (const pathosId of growth.unlockedPathos) {
    const pathos = PATHOS[pathosId];
    if (pathos && pathos.type === type) {
      count++;
    }
  }

  return count;
}

const REQUIRED_TYPE_COUNT = 5;

export const IdentitySection = memo(function IdentitySection({
  pyramidLevel,
  selectedIdentities,
  growth,
  onSelectIdentity,
}: IdentitySectionProps) {
  const swordCount = countTypeSelections(growth, 'sword');
  const gunCount = countTypeSelections(growth, 'gun');

  const canAccessSwordsman = swordCount >= REQUIRED_TYPE_COUNT;
  const canAccessGunslinger = gunCount >= REQUIRED_TYPE_COUNT;

  return (
    <div style={{ marginBottom: '80px' }}>
      {/* CSS Grid로 고정 레이아웃 - 피라미드 형태 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '110px repeat(2, 200px)', // 헤더(10% 확대) + 2개 카드 고정
        gap: SPACING.md,
        alignItems: 'stretch', // 모든 셀 높이 동일화
        marginLeft: '480px', // 피라미드 형태 유지 (6단계 360px + 120px)
      }}>
        {/* 7단계 자아 헤더 */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          padding: `${SPACING.sm} ${SPACING.md}`,
          background: (canAccessSwordsman || canAccessGunslinger) ? '#1e293b' : '#141a22', // 불투명 배경
          border: `1px solid ${(canAccessSwordsman || canAccessGunslinger) ? COLORS.tier.identity.text : '#334155'}`,
          borderRadius: BORDER_RADIUS.lg,
          fontSize: FONT_SIZE.md,
          color: (canAccessSwordsman || canAccessGunslinger) ? COLORS.tier.identity.text : COLORS.text.muted,
          fontWeight: 'bold',
          alignSelf: 'start', // Grid stretch 무시 - 헤더 크기 유지
        }}>
          {!(canAccessSwordsman || canAccessGunslinger) && '🔒 '}7단계 자아
        </div>

        {/* 검사 카드 */}
        <IdentityCard
          identity={IDENTITIES.swordsman}
          identityId="swordsman"
          isSelected={selectedIdentities.includes('swordsman')}
          canSelect={canAccessSwordsman && !selectedIdentities.includes('swordsman')}
          canAccess={canAccessSwordsman}
          typeCount={swordCount}
          requiredCount={REQUIRED_TYPE_COUNT}
          typeName="검"
          onSelect={onSelectIdentity}
        />

        {/* 총잡이 카드 */}
        <IdentityCard
          identity={IDENTITIES.gunslinger}
          identityId="gunslinger"
          isSelected={selectedIdentities.includes('gunslinger')}
          canSelect={canAccessGunslinger && !selectedIdentities.includes('gunslinger')}
          canAccess={canAccessGunslinger}
          typeCount={gunCount}
          requiredCount={REQUIRED_TYPE_COUNT}
          typeName="총"
          onSelect={onSelectIdentity}
        />
      </div>
    </div>
  );
});

// ========================================
// IdentityCard 컴포넌트
// ========================================
interface IdentityCardProps {
  identity: typeof IDENTITIES.swordsman;
  identityId: IdentityType;
  isSelected: boolean;
  canSelect: boolean;
  canAccess: boolean;
  typeCount: number;
  requiredCount: number;
  typeName: string;
  onSelect: (id: IdentityType) => void;
}

const IdentityCard = memo(function IdentityCard({
  identity,
  identityId,
  isSelected,
  canSelect,
  canAccess,
  typeCount,
  requiredCount,
  typeName,
  onSelect,
}: IdentityCardProps) {
  return (
    <div
      data-node-id={`identity-${identityId}`}
      onClick={() => canSelect && onSelect(identityId)}
      style={{
        position: 'relative',
        zIndex: 10, // 연결선 위에 표시
        // Grid가 크기 제어하므로 width/flex 속성 불필요
        padding: SPACING.md,
        boxSizing: 'border-box',
        background: isSelected ? '#2a1f2f' : (canAccess ? '#1e293b' : '#141a22'), // 1~6단계와 동일
        border: isSelected
          ? `2px solid ${COLORS.tier.identity.border}`
          : '1px solid #475569',
        borderRadius: BORDER_RADIUS.xl,
        minHeight: '120px', // 카드 최소 높이 고정 - 레이아웃 안정화
        cursor: canSelect ? 'pointer' : 'default',
        textAlign: 'center',
      }}
    >
      {/* 콘텐츠 wrapper - 1~6단계와 동일하게 콘텐츠만 opacity 적용 */}
      <div style={{ opacity: canAccess ? 1 : 0.5 }}>
      <span style={{ fontSize: '24px' }}>{identity.emoji}</span>
      <div style={{
        color: isSelected ? COLORS.tier.identity.text : COLORS.text.secondary,
        fontWeight: 'bold',
        marginTop: SPACING.sm,
      }}>
        {identity.name}
      </div>

      {/* 해금 불가 사유 표시 - 다른 노드와 동일한 형태 */}
      {!canAccess && (
        <div style={{
          fontSize: '11px', // FONT_SIZE.xs (9px)의 20% 확대
          color: COLORS.danger,
          padding: `${SPACING.xs} ${SPACING.sm}`,
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: BORDER_RADIUS.sm,
          marginTop: SPACING.sm,
        }}>
          🔒 {typeName} {typeCount}/{requiredCount} 필요
        </div>
      )}

      {/* 해금 조건 충족 시 진행도 표시 */}
      {canAccess && !isSelected && (
        <div style={{
          fontSize: FONT_SIZE.sm,
          color: COLORS.success,
          marginTop: SPACING.xs,
        }}>
          ✓ {typeName} {typeCount}/{requiredCount}
        </div>
      )}

      {isSelected && (
        <div style={{ fontSize: FONT_SIZE.sm, color: COLORS.success, marginTop: SPACING.xs }}>
          ✓ 선택됨
        </div>
      )}
      </div>
    </div>
  );
});

export default IdentitySection;
