import { useGameStore } from "../../../state/gameStore";

const STAT_LABELS = {
  strength: "힘",
  agility: "민첩",
  insight: "통찰",
};

/**
 * 전투 화면용 아이템 슬롯 컴포넌트
 * phase가 'select' 또는 'respond'일 때만 전투용 아이템 사용 가능
 * @param {string} phase - 현재 전투 단계
 * @param {object} battleActions - 전투 상태 액션 (setPlayer, setEnemy, addLog, setEnemyPlan)
 * @param {object} player - 현재 플레이어 상태
 * @param {object} enemy - 현재 적 상태
 * @param {object} enemyPlan - 적의 행동 계획 { actions: [], mode: string }
 */
export function ItemSlots({ phase, battleActions, player, enemy, enemyPlan }) {
  const items = useGameStore((state) => state.items || [null, null, null]);
  const useItem = useGameStore((state) => state.useItem);
  const removeItem = useGameStore((state) => state.removeItem);
  const itemBuffs = useGameStore((state) => state.itemBuffs || {});

  // 전투용 아이템은 select/respond 단계에서만 사용 가능
  const canUseCombatItem = phase === 'select' || phase === 'respond';

  // 전투용 아이템 효과 직접 적용
  const applyCombatItemEffect = (item, slotIdx) => {
    if (!item.effect || !battleActions) return;

    const effect = item.effect;
    let newPlayer = { ...player };
    let newEnemy = { ...enemy };
    let logMsg = '';

    switch (effect.type) {
      case 'damage':
        newEnemy.hp = Math.max(0, newEnemy.hp - effect.value);
        logMsg = `💥 ${item.name}: 적에게 ${effect.value} 피해!`;
        break;
      case 'defense':
        newPlayer.block = (newPlayer.block || 0) + effect.value;
        logMsg = `🛡️ ${item.name}: 방어력 ${effect.value} 획득!`;
        break;
      case 'turnEnergy':
        newPlayer.energy = Math.min(newPlayer.maxEnergy || 10, (newPlayer.energy || 0) + effect.value);
        logMsg = `⚡ ${item.name}: 에너지 ${effect.value} 회복!`;
        break;
      case 'maxEnergy':
        newPlayer.maxEnergy = (newPlayer.maxEnergy || 6) + effect.value;
        newPlayer.energy = (newPlayer.energy || 0) + effect.value;
        logMsg = `📦 ${item.name}: 최대 에너지 +${effect.value}!`;
        break;
      case 'attackBoost':
        newPlayer.strength = (newPlayer.strength || 0) + effect.value;
        logMsg = `⚔️ ${item.name}: 힘 +${effect.value}!`;
        break;
      case 'etherMultiplier':
        newPlayer.etherMultiplier = effect.value;
        logMsg = `💎 ${item.name}: 에테르 획득 ${effect.value}배!`;
        break;
      case 'etherSteal': {
        const steal = Math.min(effect.value, newEnemy.etherPts || 0);
        newEnemy.etherPts = Math.max(0, (newEnemy.etherPts || 0) - steal);
        newPlayer.etherPts = (newPlayer.etherPts || 0) + steal;
        logMsg = `🔮 ${item.name}: 적 에테르 ${steal} 흡수!`;
        break;
      }
      case 'cardDestroy': {
        // 적 카드 파괴 - enemyPlan.actions에서 N장 제거
        if (!enemyPlan?.actions || enemyPlan.actions.length === 0) {
          logMsg = `💨 ${item.name}: 파괴할 적 카드가 없습니다!`;
          break;
        }
        const destroyCount = Math.min(effect.value, enemyPlan.actions.length);
        // 뒤에서부터 파괴할 카드 인덱스 계산
        const startIdx = enemyPlan.actions.length - destroyCount;
        const destroyedIndices = [];
        for (let i = startIdx; i < enemyPlan.actions.length; i++) {
          destroyedIndices.push(i);
        }

        // 파괴 애니메이션용 인덱스 설정
        battleActions.setDestroyingEnemyCards(destroyedIndices);

        // 즉시 카드 제거 (manuallyModified로 재생성 방지)
        const newActions = enemyPlan.actions.slice(0, -destroyCount);
        battleActions.setEnemyPlan({ ...enemyPlan, actions: newActions, manuallyModified: true });

        // respond 단계면 fixedOrder에서도 파괴된 적 카드 제거
        if (phase === 'respond' && battleActions.setFixedOrder) {
          // fixedOrder 업데이트는 LegacyBattleApp에서 enemyPlan.actions 변경을 감지해서 처리
          // 여기서는 setEnemyPlan 호출로 충분
        }

        // 0.6초 후 애니메이션 상태 정리
        setTimeout(() => {
          battleActions.setDestroyingEnemyCards([]);
        }, 600);

        logMsg = `💥 ${item.name}: 적 카드 ${destroyCount}장 파괴!`;
        removeItem(slotIdx);
        if (logMsg) battleActions.addLog(logMsg);
        return;
      }
      case 'cardFreeze': {
        // 적 카드 빙결 - 플레이어 카드가 모두 먼저 발동
        newPlayer.enemyFrozen = true;
        logMsg = `❄️ ${item.name}: 적 카드 빙결! (플레이어 카드 우선 발동)`;
        break;
      }
      default:
        console.log(`[아이템] 미구현 효과: ${effect.type}`);
        return;
    }

    // 상태 업데이트
    battleActions.setPlayer(newPlayer);
    battleActions.setEnemy(newEnemy);
    if (logMsg) battleActions.addLog(logMsg);

    // 아이템 제거
    removeItem(slotIdx);
  };

  const handleUseItem = (idx) => {
    const item = items[idx];
    if (!item) return;

    // 범용 아이템은 항상 사용 가능 (치유, 스탯 버프)
    if (item.usableIn === 'any') {
      useItem(idx);
      return;
    }

    // 전투용 아이템은 select/respond 단계에서만 - 직접 효과 적용
    if (item.usableIn === 'combat' && canUseCombatItem) {
      applyCombatItemEffect(item, idx);
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
