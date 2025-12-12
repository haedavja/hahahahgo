import { useGameStore } from "../../../state/gameStore";

const STAT_LABELS = {
  strength: "힘",
  agility: "민첩",
  insight: "통찰",
};

/**
 * 전투 화면용 아이템 슬롯 컴포넌트
 * phase가 'select' 또는 'respond'일 때만 전투용 아이템 사용 가능
 */
export function ItemSlots({ phase }) {
  const items = useGameStore((state) => state.items || [null, null, null]);
  const useItem = useGameStore((state) => state.useItem);
  const itemBuffs = useGameStore((state) => state.itemBuffs || {});

  // 전투용 아이템은 select/respond 단계에서만 사용 가능
  const canUseCombatItem = phase === 'select' || phase === 'respond';

  const handleUseItem = (idx) => {
    const item = items[idx];
    if (!item) return;

    // 범용 아이템은 항상 사용 가능
    if (item.usableIn === 'any') {
      useItem(idx);
      return;
    }

    // 전투용 아이템은 select/respond 단계에서만
    if (item.usableIn === 'combat' && canUseCombatItem) {
      useItem(idx);
    }
  };

  const getItemUsability = (item) => {
    if (!item) return false;
    if (item.usableIn === 'any') return true;
    if (item.usableIn === 'combat') return canUseCombatItem;
    return false;
  };

  return (
    <div style={{
      position: 'fixed',
      left: '20px',
      top: '20px',
      display: 'flex',
      gap: '8px',
      zIndex: 100,
    }}>
      {items.map((item, idx) => {
        const canUse = getItemUsability(item);
        return (
          <div
            key={idx}
            onClick={() => canUse && handleUseItem(idx)}
            className="battle-item-slot"
            style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: `2px solid ${canUse ? 'rgba(100, 220, 150, 0.9)' : item ? 'rgba(120, 140, 180, 0.5)' : 'rgba(80, 90, 110, 0.5)'}`,
              background: 'rgba(12, 18, 32, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: canUse ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: canUse ? '0 0 8px rgba(100, 220, 150, 0.4)' : 'none',
              opacity: item && !canUse ? 0.6 : 1,
            }}
          >
            {item ? (
              <>
                <span style={{ fontSize: '24px' }}>{item.icon || '?'}</span>
                {item.usableIn === 'combat' && !canUseCombatItem && (
                  <span style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    fontSize: '10px',
                    color: 'rgba(255, 100, 100, 0.8)',
                  }}>⏸</span>
                )}
                {/* 아이템 툴팁 */}
                <div style={{
                  position: 'absolute',
                  left: '56px',
                  top: '0',
                  minWidth: '180px',
                  padding: '10px 12px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(100, 140, 200, 0.5)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                  opacity: 0,
                  visibility: 'hidden',
                  transition: 'opacity 0.15s, visibility 0.15s',
                  zIndex: 200,
                  pointerEvents: 'none',
                }}
                className="battle-item-tooltip"
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#fbbf24', marginBottom: '6px' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4, marginBottom: '6px' }}>
                    {item.description}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: canUseCombatItem ? '#86efac' : '#f87171',
                    paddingTop: '4px',
                    borderTop: '1px solid rgba(100, 120, 150, 0.3)',
                  }}>
                    {item.usableIn === 'combat'
                      ? (canUseCombatItem ? '✓ 지금 사용 가능 (선택/대응 단계)' : '⏸ 선택/대응 단계에서만 사용 가능')
                      : '✓ 언제든 사용 가능'
                    }
                  </div>
                </div>
              </>
            ) : (
              <span style={{ fontSize: '18px', color: 'rgba(100, 110, 130, 0.6)' }}>-</span>
            )}
          </div>
        );
      })}

      {/* 아이템 버프 표시 */}
      {Object.keys(itemBuffs).length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          marginLeft: '8px',
        }}>
          {Object.entries(itemBuffs).map(([stat, value]) => (
            <span key={stat} style={{
              padding: '4px 8px',
              background: 'rgba(100, 200, 150, 0.2)',
              border: '1px solid rgba(100, 200, 150, 0.5)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#86efac',
              whiteSpace: 'nowrap',
            }}>
              {STAT_LABELS[stat] || stat} +{value}
            </span>
          ))}
        </div>
      )}

      <style>{`
        .battle-item-slot:hover .battle-item-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>
    </div>
  );
}
