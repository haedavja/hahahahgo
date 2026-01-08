/**
 * @file UnlockedSummary.tsx
 * @description 해금된 에토스/파토스 요약 섹션
 */

import { memo, useMemo, useCallback, type CSSProperties } from 'react';
import { MAX_EQUIPPED_PATHOS } from '../../data/growth/pathosData';
import { getUnlockedEthos, getUnlockedPathos, type initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../styles/theme';

// ========================================
// 스타일 상수
// ========================================
const CONTAINER_STYLE: CSSProperties = {
  marginTop: SPACING.xxl,
  borderTop: '1px solid #475569',
  paddingTop: SPACING.xl,
};

const CONTENT_WRAPPER_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: SPACING.md,
  justifyContent: 'center',
};

const HEADER_ROW_STYLE: CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const HEADER_BOX_STYLE: CSSProperties = {
  display: 'inline-block',
  padding: `${SPACING.sm} ${SPACING.md}`,
  background: 'rgba(30, 41, 59, 0.8)',
  border: `1px solid ${COLORS.text.secondary}`,
  borderRadius: BORDER_RADIUS.lg,
};

const HEADER_TEXT_STYLE: CSSProperties = {
  color: COLORS.text.primary,
  fontWeight: 'bold',
  fontSize: FONT_SIZE.md,
};

const ETHOS_CONTAINER_STYLE: CSSProperties = {
  width: '200px',
  flex: '0 0 200px',
  padding: SPACING.md,
  background: '#1a2433',
  border: `1px solid ${COLORS.success}`,
  borderRadius: BORDER_RADIUS.lg,
};

const ETHOS_HEADER_STYLE: CSSProperties = {
  fontSize: FONT_SIZE.md,
  color: COLORS.success,
  marginBottom: SPACING.sm,
  fontWeight: 'bold',
  textAlign: 'center',
};

const ETHOS_LIST_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xs,
};

const ETHOS_ITEM_STYLE: CSSProperties = {
  padding: `${SPACING.xs} ${SPACING.sm}`,
  background: 'rgba(134, 239, 172, 0.15)',
  border: '1px solid rgba(134, 239, 172, 0.3)',
  borderRadius: BORDER_RADIUS.sm,
  fontSize: FONT_SIZE.sm,
  color: COLORS.success,
  textAlign: 'center',
};

const PATHOS_CONTAINER_STYLE: CSSProperties = {
  width: '200px',
  flex: '0 0 200px',
  padding: SPACING.md,
  background: '#1f2a2a',
  border: `1px solid ${COLORS.tier[2].border}`,
  borderRadius: BORDER_RADIUS.lg,
};

const PATHOS_HEADER_STYLE: CSSProperties = {
  fontSize: FONT_SIZE.md,
  color: COLORS.tier[2].text,
  marginBottom: SPACING.sm,
  fontWeight: 'bold',
  textAlign: 'center',
};

const PATHOS_LIST_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xs,
};

const PATHOS_ITEM_BASE: CSSProperties = {
  padding: `${SPACING.xs} ${SPACING.sm}`,
  borderRadius: BORDER_RADIUS.sm,
  fontSize: FONT_SIZE.sm,
  color: COLORS.tier[2].text,
  cursor: 'pointer',
  textAlign: 'center',
};

const getPathosItemStyle = (isEquipped: boolean): CSSProperties => ({
  ...PATHOS_ITEM_BASE,
  background: isEquipped ? 'rgba(244, 114, 182, 0.3)' : 'rgba(244, 114, 182, 0.1)',
  border: isEquipped ? `2px solid ${COLORS.tier[2].border}` : '1px solid rgba(244, 114, 182, 0.3)',
});

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
    <div style={CONTAINER_STYLE}>
      {/* 노드와 같은 정렬 영역 */}
      <div style={CONTENT_WRAPPER_STYLE}>
        {/* 헤더 - 중앙 정렬 */}
        <div style={HEADER_ROW_STYLE}>
          <div style={HEADER_BOX_STYLE}>
            <span style={HEADER_TEXT_STYLE}>
              해금 현황: 에토스 {unlockedEthos.length}개 / 파토스 {unlockedPathos.length}개
            </span>
          </div>
        </div>

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
    <div style={ETHOS_CONTAINER_STYLE}>
      <div style={ETHOS_HEADER_STYLE}>
        에토스 (패시브)
      </div>
      <div style={ETHOS_LIST_STYLE}>
        {ethosList.map(ethos => (
          <span
            key={ethos.id}
            title={ethos.description}
            style={ETHOS_ITEM_STYLE}
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
  const handleToggleEquip = useCallback((pathosId: string, isEquipped: boolean) => {
    if (isEquipped) {
      onEquipPathos(equippedPathos.filter(id => id !== pathosId));
    } else if (equippedPathos.length < MAX_EQUIPPED_PATHOS) {
      onEquipPathos([...equippedPathos, pathosId]);
    }
  }, [equippedPathos, onEquipPathos]);

  return (
    <div style={PATHOS_CONTAINER_STYLE}>
      <div style={PATHOS_HEADER_STYLE}>
        파토스 ({equippedPathos.length}/{MAX_EQUIPPED_PATHOS})
      </div>
      <div style={PATHOS_LIST_STYLE}>
        {pathosList.map(pathos => {
          const isEquipped = equippedPathos.includes(pathos.id);
          return (
            <span
              key={pathos.id}
              title={pathos.description}
              onClick={() => handleToggleEquip(pathos.id, isEquipped)}
              style={getPathosItemStyle(isEquipped)}
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
