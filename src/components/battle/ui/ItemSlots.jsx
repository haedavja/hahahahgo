import { useGameStore } from "../../../state/gameStore";
import { playCardDestroySound, playFreezeSound } from "../../../lib/soundUtils";
import { addToken } from "../../../lib/tokenUtils";

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
 * @param {object} battleRef - 최신 battle 상태를 가진 ref (closure 문제 방지)
 */
export function ItemSlots({ phase, battleActions, player, enemy, enemyPlan, battleRef }) {
  const items = useGameStore((state) => state.items || [null, null, null]);
  const useItem = useGameStore((state) => state.useItem);
  const removeItem = useGameStore((state) => state.removeItem);
  const itemBuffs = useGameStore((state) => state.itemBuffs || {});

  // 전투용 아이템은 select/respond 단계에서만 사용 가능 (prop 기반, UI 표시용)
  const canUseCombatItem = phase === 'select' || phase === 'respond';

  // 최신 phase를 가져오는 헬퍼 함수 (실제 사용 시 검증용)
  const getLatestPhase = () => battleRef?.current?.phase || phase;

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
      case 'turnEnergy': {
        // 최대값 초과 허용
        const beforeEnergy = newPlayer.energy || 0;
        newPlayer.energy = beforeEnergy + effect.value;
        logMsg = `⚡ ${item.name}: 에너지 +${effect.value}! (현재: ${newPlayer.energy})`;
        break;
      }
      case 'maxEnergy':
        newPlayer.maxEnergy = (newPlayer.maxEnergy || 6) + effect.value;
        newPlayer.energy = (newPlayer.energy || 0) + effect.value;
        logMsg = `📦 ${item.name}: 최대 에너지 +${effect.value}!`;
        break;
      case 'attackBoost':
        newPlayer.strength = (newPlayer.strength || 0) + effect.value;
        logMsg = `⚔️ ${item.name}: 힘 +${effect.value}!`;
        break;
      case 'grantTokens': {
        // 여러 토큰을 부여 (effect.tokens: [{id, stacks}])
        const tokenLogs = [];
        for (const tokenGrant of effect.tokens) {
          const result = addToken(newPlayer, tokenGrant.id, tokenGrant.stacks || 1);
          newPlayer.tokens = result.tokens;
          tokenLogs.push(...result.logs);
        }
        const tokenNames = effect.tokens.map(t => t.id).join(', ');
        logMsg = `⚔️ ${item.name}: ${tokenNames} 상태 획득!`;
        break;
      }
      case 'etherMultiplier':
        newPlayer.etherMultiplier = (newPlayer.etherMultiplier || 1) * effect.value;
        logMsg = `💎 ${item.name}: 에테르 획득 ${effect.value}배! (총 ${newPlayer.etherMultiplier}배)`;
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

        // 파괴 사운드 재생
        playCardDestroySound();

        // battleRef에서 최신 enemyPlan 가져오기 (prop은 stale할 수 있음)
        const currentEnemyPlan = battleRef?.current?.enemyPlan || enemyPlan;
        const currentActions = currentEnemyPlan.actions || [];

        // 즉시 카드 제거 (manuallyModified로 재생성 방지)
        const actualDestroyCount = Math.min(destroyCount, currentActions.length);
        const newActions = currentActions.slice(0, -actualDestroyCount);

        // 명시적으로 새 enemyPlan 구성 (spread 대신 직접 설정)
        const newEnemyPlan = {
          mode: currentEnemyPlan.mode,
          actions: newActions,
          manuallyModified: true
        };
        battleActions.setEnemyPlan(newEnemyPlan);

        // battleRef를 즉시 동기적으로 업데이트 (useEffect 대기하지 않음)
        // 이렇게 해야 다른 코드가 battleRef.current를 읽을 때 즉시 최신 값을 얻음
        if (battleRef?.current) {
          battleRef.current.enemyPlan = newEnemyPlan;
        }

        // respond 단계면 fixedOrder에서도 파괴된 적 카드 제거
        if (phase === 'respond' && battleActions.setFixedOrder) {
          // fixedOrder 업데이트는 BattleApp에서 enemyPlan.actions 변경을 감지해서 처리
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

        // 빙결 사운드 재생
        playFreezeSound();

        // frozenOrder 카운터 설정 (effect.value = 지속 턴 수, 기본 1턴)
        const freezeTurns = effect.value || 1;
        const currentFrozenOrder = battleRef?.current?.frozenOrder || 0;
        const newFrozenOrder = currentFrozenOrder + freezeTurns;

        if (battleActions.setFrozenOrder) {
          battleActions.setFrozenOrder(newFrozenOrder);
          if (battleRef?.current) {
            battleRef.current.frozenOrder = newFrozenOrder;
          }
        }

        // 모든 적 카드에 빙결 애니메이션 적용
        const currentEnemyPlan = battleRef?.current?.enemyPlan || enemyPlan;
        const enemyCardCount = currentEnemyPlan?.actions?.length || 0;
        if (enemyCardCount > 0 && battleActions.setFreezingEnemyCards) {
          const allEnemyIndices = Array.from({ length: enemyCardCount }, (_, i) => i);
          battleActions.setFreezingEnemyCards(allEnemyIndices);

          // 0.7초 후 애니메이션 상태 정리
          setTimeout(() => {
            battleActions.setFreezingEnemyCards([]);
          }, 700);
        }

        // respond 단계에서 사용 시 fixedOrder를 즉시 재정렬
        const latestPhase = getLatestPhase();
        if (latestPhase === 'respond' && battleRef?.current?.fixedOrder && battleActions.setFixedOrder) {
          const currentFixedOrder = battleRef.current.fixedOrder;
          // 플레이어 카드를 먼저, 적 카드를 나중에
          const playerCards = currentFixedOrder.filter(x => x.actor === 'player');
          const enemyCards = currentFixedOrder.filter(x => x.actor === 'enemy');
          const frozenOrder = [...playerCards, ...enemyCards];

          battleActions.setFixedOrder(frozenOrder);

          // battleRef도 즉시 업데이트
          if (battleRef?.current) {
            battleRef.current.fixedOrder = frozenOrder;
          }
        }

        logMsg = `❄️ ${item.name}: 적 카드 빙결! (플레이어 카드 우선 발동)`;
        break;
      }
      default:
        return;
    }

    // 상태 업데이트
    battleActions.setPlayer(newPlayer);
    battleActions.setEnemy(newEnemy);

    // battleRef를 즉시 동기적으로 업데이트 (useEffect 대기하지 않음)
    if (battleRef?.current) {
      battleRef.current.player = newPlayer;
      battleRef.current.enemy = newEnemy;
    }

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

    // 전투용 아이템: 최신 phase를 확인하여 resolve 단계면 사용 불가
    // (prop phase는 stale할 수 있으므로 battleRef에서 최신 값을 확인)
    const latestPhase = getLatestPhase();
    const canUseNow = latestPhase === 'select' || latestPhase === 'respond';

    if (item.usableIn === 'combat' && canUseNow) {
      applyCombatItemEffect(item, idx);
    } else if (item.usableIn === 'combat' && !canUseNow) {
      battleActions.addLog('⚠️ 진행 중에는 아이템을 사용할 수 없습니다!');
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
