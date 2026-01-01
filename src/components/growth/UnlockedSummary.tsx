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
      {/* 헤더 - 노드 스타일 박스 */}
      <div
        style={{
          display: 'inline-block',
          padding: `${SPACING.sm} ${SPACING.md}`,
          background: 'rgba(30, 41, 59, 0.8)',
          border: `1px solid ${COLORS.text.secondary}`,
          borderRadius: BORDER_RADIUS.lg,
          marginBottom: SPACING.lg,
        }}
      >
        <span style={{ color: COLORS.text.primary, fontWeight: 'bold', fontSize: FONT_SIZE.md }}>
          해금 현황: 에토스 {unlockedEthos.length}개 / 파토스 {unlockedPathos.length}개
        </span>
      </div>

      {/* 상세 내용 - 노드와 같은 세로축 정렬 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'center' }}>
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
    <div style={{
      width: '200px',
      flex: '0 0 200px',
      padding: SPACING.md,
      background: '#1a2433',
      border: `1px solid ${COLORS.success}`,
      borderRadius: BORDER_RADIUS.lg,
    }}>
      <div style={{
        fontSize: FONT_SIZE.md,
        color: COLORS.success,
        marginBottom: SPACING.sm,
        fontWeight: 'bold',
        textAlign: 'center',
      }}>
        에토스 (패시브)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
        {ethosList.map(ethos => (
          <span
            key={ethos.id}
            title={ethos.description}
            style={{
              padding: `${SPACING.xs} ${SPACING.sm}`,
              background: 'rgba(134, 239, 172, 0.15)',
              border: '1px solid rgba(134, 239, 172, 0.3)',
              borderRadius: BORDER_RADIUS.sm,
              fontSize: FONT_SIZE.sm,
              color: COLORS.success,
              textAlign: 'center',
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
    <div style={{
      width: '200px',
      flex: '0 0 200px',
      padding: SPACING.md,
      background: '#1f2a2a',
      border: `1px solid ${COLORS.tier[2].border}`,
      borderRadius: BORDER_RADIUS.lg,
    }}>
      <div style={{
        fontSize: FONT_SIZE.md,
        color: COLORS.tier[2].text,
        marginBottom: SPACING.sm,
        fontWeight: 'bold',
        textAlign: 'center',
      }}>
        파토스 ({equippedPathos.length}/{MAX_EQUIPPED_PATHOS})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
        {pathosList.map(pathos => {
          const isEquipped = equippedPathos.includes(pathos.id);
          return (
            <span
              key={pathos.id}
              title={pathos.description}
              onClick={() => handleToggleEquip(pathos.id, isEquipped)}
              style={{
                padding: `${SPACING.xs} ${SPACING.sm}`,
                background: isEquipped
                  ? 'rgba(244, 114, 182, 0.3)'
                  : 'rgba(244, 114, 182, 0.1)',
                border: isEquipped
                  ? `2px solid ${COLORS.tier[2].border}`
                  : `1px solid rgba(244, 114, 182, 0.3)`,
                borderRadius: BORDER_RADIUS.sm,
                fontSize: FONT_SIZE.sm,
                color: COLORS.tier[2].text,
                cursor: 'pointer',
                textAlign: 'center',
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
