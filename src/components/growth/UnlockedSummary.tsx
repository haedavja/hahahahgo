/**
 * @file UnlockedSummary.tsx
 * @description 해금된 에토스/파토스 요약 섹션
 */

import { memo } from 'react';
import { MAX_EQUIPPED_PATHOS } from '../../data/growth/pathosData';
import { getUnlockedEthos, getUnlockedPathos, type initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../styles/theme';

interface UnlockedSummaryProps {
  growth: typeof initialGrowthState;
  onEquipPathos: (ids: string[]) => void;
}

export const UnlockedSummary = memo(function UnlockedSummary({
  growth,
  onEquipPathos,
}: UnlockedSummaryProps) {
  const unlockedEthos = getUnlockedEthos(growth);
  const unlockedPathos = getUnlockedPathos(growth);

  if (unlockedEthos.length === 0 && unlockedPathos.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: SPACING.xxl,
      borderTop: '1px solid #475569',
      paddingTop: SPACING.xl,
    }}>
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: SPACING.md,
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: BORDER_RADIUS.lg,
        }}
      >
        <span style={{ color: COLORS.text.primary, fontWeight: 'bold' }}>
          해금 현황: 에토스 {unlockedEthos.length}개 / 파토스 {unlockedPathos.length}개
        </span>
      </div>

      {/* 상세 내용 */}
      <div style={{ marginTop: SPACING.lg }}>
        {/* 에토스 목록 */}
        {unlockedEthos.length > 0 && (
          <EthosList ethosList={unlockedEthos} />
        )}

        {/* 파토스 목록 */}
        {unlockedPathos.length > 0 && (
          <PathosList
            pathosList={unlockedPathos}
            equippedPathos={growth.equippedPathos}
            onEquipPathos={onEquipPathos}
          />
        )}
      </div>
    </div>
  );
});

// ========================================
// EthosList 컴포넌트
// ========================================
interface EthosListProps {
  ethosList: ReturnType<typeof getUnlockedEthos>;
}

const EthosList = memo(function EthosList({ ethosList }: EthosListProps) {
  return (
    <div style={{ marginBottom: SPACING.lg }}>
      <div style={{
        fontSize: FONT_SIZE.lg,
        color: COLORS.success,
        marginBottom: SPACING.sm,
      }}>
        에토스 (패시브)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
        {ethosList.map(ethos => (
          <span
            key={ethos.id}
            title={ethos.description}
            style={{
              padding: `${SPACING.sm} ${SPACING.md}`,
              background: 'rgba(134, 239, 172, 0.15)',
              border: '1px solid rgba(134, 239, 172, 0.3)',
              borderRadius: BORDER_RADIUS.md,
              fontSize: FONT_SIZE.md,
              color: COLORS.success,
            }}
          >
            {ethos.name}
          </span>
        ))}
      </div>
    </div>
  );
});

// ========================================
// PathosList 컴포넌트
// ========================================
interface PathosListProps {
  pathosList: ReturnType<typeof getUnlockedPathos>;
  equippedPathos: string[];
  onEquipPathos: (ids: string[]) => void;
}

const PathosList = memo(function PathosList({
  pathosList,
  equippedPathos,
  onEquipPathos,
}: PathosListProps) {
  const handleToggleEquip = (pathosId: string, isEquipped: boolean) => {
    if (isEquipped) {
      onEquipPathos(equippedPathos.filter(id => id !== pathosId));
    } else if (equippedPathos.length < MAX_EQUIPPED_PATHOS) {
      onEquipPathos([...equippedPathos, pathosId]);
    }
  };

  return (
    <div>
      <div style={{
        fontSize: FONT_SIZE.lg,
        color: COLORS.tier[2].text,
        marginBottom: SPACING.sm,
      }}>
        파토스 (액티브) - 장착: {equippedPathos.length}/{MAX_EQUIPPED_PATHOS}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
        {pathosList.map(pathos => {
          const isEquipped = equippedPathos.includes(pathos.id);
          return (
            <span
              key={pathos.id}
              title={pathos.description}
              onClick={() => handleToggleEquip(pathos.id, isEquipped)}
              style={{
                padding: `${SPACING.sm} ${SPACING.md}`,
                background: isEquipped
                  ? 'rgba(244, 114, 182, 0.3)'
                  : 'rgba(244, 114, 182, 0.1)',
                border: isEquipped
                  ? `2px solid ${COLORS.tier[2].border}`
                  : `1px solid rgba(244, 114, 182, 0.3)`,
                borderRadius: BORDER_RADIUS.md,
                fontSize: FONT_SIZE.md,
                color: COLORS.tier[2].text,
                cursor: 'pointer',
              }}
            >
              {isEquipped && '✓ '}{pathos.name}
            </span>
          );
        })}
      </div>
    </div>
  );
});

export default UnlockedSummary;
