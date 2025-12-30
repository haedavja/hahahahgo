import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useShallow } from 'zustand/react/shallow';
import type { Resources, MapNode } from "../../types";
import { useMapState } from "./hooks/useMapState";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { DungeonExploration } from "../dungeon/DungeonExploration";
import { BattleScreen } from "../battle/BattleScreen";
import { ShopModal } from "../shop/ShopModal";
import type { MerchantTypeKey } from "../../data/shop";
import { EtherBar } from "../battle/ui/EtherBar";
import { DevTools } from "../dev/DevTools";
import { RelicsBar, RestModal, EventModal } from "./ui";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  MAP_WIDTH,
  MAP_LAYERS,
  V_SPACING,
  ICON_MAP,
  LEGEND,
  STAT_LABELS,
  PATCH_VERSION_TAG,
  formatApplied,
  formatBattleLogEntry,
} from "./utils/mapConfig";

export function MapDemo() {
  // 맵 상태 셀렉터 (그룹화)
  const { map, mapRisk, resources } = useGameStore(
    useShallow((state) => ({
      map: state.map,
      mapRisk: state.mapRisk,
      resources: (state.resources || {}) as Resources,
    }))
  );
  const prevEtherRef = useRef(resources.etherPts ?? 0);

  // 모달/이벤트 상태 셀렉터 (그룹화)
  const { activeEvent, activeBattle, activeDungeon, lastBattleResult, activeRest, activeShop, relics, items } = useGameStore(
    useShallow((state) => ({
      activeEvent: state.activeEvent,
      activeBattle: state.activeBattle,
      activeDungeon: state.activeDungeon,
      lastBattleResult: state.lastBattleResult,
      activeRest: state.activeRest,
      activeShop: state.activeShop,
      relics: state.relics,
      items: state.items || [null, null, null],
    }))
  );
  const mergeRelicOrder = useCallback((relicList: string[] = [], saved: string[] = []) => {
    const savedSet = new Set(saved);
    const merged: string[] = [];
    saved.forEach((id: any) => { if (relicList?.includes(id)) merged.push(id); });
    (relicList || []).forEach((id: any) => { if (!savedSet.has(id)) merged.push(id); });
    return merged;
  }, []);

  // orderedRelics 초기값 계산 (localStorage 복원)
  const initialOrderedRelics = useMemo(() => {
    try {
      const saved = localStorage.getItem("relicOrder");
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics || [], ids);
      }
    } catch { /* ignore */ }
    return relics || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map UI 상태 (useReducer 기반)
  const { mapUI, actions } = useMapState({
    orderedRelics: initialOrderedRelics,
  });

  // Destructure map UI state
  const showCharacterSheet = mapUI.showCharacterSheet;
  const isDungeonExploring = mapUI.isDungeonExploring;
  const devToolsOpen = mapUI.devToolsOpen;
  const hoveredRelic = mapUI.hoveredRelic;
  const orderedRelics = mapUI.orderedRelics;
  const relicActivated = mapUI.relicActivated;

  // 전체 카드 표시 (개발자 모드)
  const [showAllCards, setShowAllCards] = useState(() => {
    try {
      return localStorage.getItem('showAllCards') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    // 새 상징 추가/제거 시 순서를 유지하면서 병합
    actions.setOrderedRelics((prev: any) => {
      return mergeRelicOrder(relics || [], prev);
    });
  }, [relics, mergeRelicOrder, actions]);
  useEffect(() => {
    try {
      localStorage.setItem("relicOrder", JSON.stringify(orderedRelics));
    } catch { /* ignore */ }
  }, [orderedRelics]);

  // 플레이어 스탯 셀렉터 (그룹화)
  const { playerHp, maxHp, playerStrength, playerAgility, playerInsight, playerTraits, cardUpgrades, itemBuffs } = useGameStore(
    useShallow((state) => ({
      playerHp: state.playerHp,
      maxHp: state.maxHp,
      playerStrength: state.playerStrength || 0,
      playerAgility: state.playerAgility || 0,
      playerInsight: state.playerInsight || 0,
      playerTraits: state.playerTraits || [],
      cardUpgrades: state.cardUpgrades || {},
      itemBuffs: state.itemBuffs || {},
    }))
  );

  // 액션 셀렉터 (그룹화)
  const {
    selectNode, chooseEvent, closeEvent, clearBattleResult,
    skipDungeon, confirmDungeon, bypassDungeon,
    awakenAtRest, closeRest, closeShop, healAtRest,
    formEgo, upgradeCardRarity, useItem
  } = useGameStore(
    useShallow((state) => ({
      selectNode: state.selectNode,
      chooseEvent: state.chooseEvent,
      closeEvent: state.closeEvent,
      clearBattleResult: state.clearBattleResult,
      skipDungeon: state.skipDungeon,
      confirmDungeon: state.confirmDungeon,
      bypassDungeon: state.bypassDungeon,
      awakenAtRest: state.awakenAtRest,
      closeRest: state.closeRest,
      closeShop: state.closeShop,
      healAtRest: state.healAtRest,
      formEgo: state.formEgo,
      upgradeCardRarity: state.upgradeCardRarity,
      useItem: state.useItem,
    }))
  );

  // 아이템 버프를 포함한 유효 스탯 계산
  const effectiveStrength = playerStrength + (itemBuffs.strength || 0);
  const effectiveAgility = playerAgility + (itemBuffs.agility || 0);
  const effectiveInsight = playerInsight + (itemBuffs.insight || 0);

  // 스탯 요구사항 충족 여부 체크 (아이템 버프 포함)
  const meetsStatRequirement = useCallback((statRequirement: any) => {
    if (!statRequirement) return true;
    const playerStats = {
      insight: effectiveInsight,
      strength: effectiveStrength,
      agility: effectiveAgility,
    };
    return Object.entries(statRequirement).every(
      ([stat, required]) => (playerStats[stat as keyof typeof playerStats] ?? 0) >= (required as number)
    );
  }, [effectiveInsight, effectiveStrength, effectiveAgility]);

  // Alt+D 핫키로 DevTools 토글
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        actions.setDevToolsOpen((prev: any) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const nodes = (map?.nodes ?? []) as MapNode[];
  const mapViewRef = useRef(null);
  const riskDisplay = Number.isFinite(mapRisk) ? mapRisk.toFixed(1) : "-";
  const memoryValue = resources.memory ?? 0;
  const canAwaken = memoryValue >= 100;

  // 자아 형성용 상태
  const [egoFormMode, setEgoFormMode] = useState(false);
  const [selectedTraitsForEgo, setSelectedTraitsForEgo] = useState([]);
  const canFormEgo = playerTraits.length >= 5;
  const aetherValue = resources.etherPts ?? 0;
  const aetherSlots = calculateEtherSlots(aetherValue); // 인플레이션 적용
  const aetherCurrentPts = getCurrentSlotPts(aetherValue); // 현재 슬롯 내의 pt (슬롯마다 0으로 리셋)
  const aetherNextSlotCost = getNextSlotCost(aetherValue); // 다음 슬롯을 채우는데 필요한 총 pt
  const aetherProgress = getSlotProgress(aetherValue); // 다음 슬롯까지의 진행률 (0-1)
  const aetherRatio = Math.max(0, Math.min(1, aetherProgress)); // 시각적 바 높이
  const aetherTier = `x${aetherSlots}`;
  const hpRatio = Math.max(0, Math.min(1, playerHp / maxHp)); // HP 비율
  const hpColor = hpRatio > 0.5 ? "#86efac" : hpRatio > 0.25 ? "#fde047" : "#fca5a5";

  // 황금 나침반 발동 표시: 에테르가 증가했고 상징이 있을 때 배지/사운드
  useEffect(() => {
    const prev = prevEtherRef.current ?? 0;
    const curr = resources.etherPts ?? 0;
    const delta = curr - prev;
    prevEtherRef.current = curr;
    if (delta > 0 && relics?.includes('redCompass')) {
      actions.setRelicActivated('redCompass');
      const t = setTimeout(() => actions.setRelicActivated(null), 700);
      return () => clearTimeout(t);
    }
  }, [resources.etherPts, relics, actions]);

  const mapHeight = useMemo(() => {
    if (!nodes.length) return 800;
    const maxY = Math.max(...nodes.map((node: MapNode) => node.y ?? 0), 0);
    return maxY + NODE_HEIGHT + 200;
  }, [nodes]);

  const edges = useMemo(
    () =>
      nodes
        .map((node: MapNode) =>
          node.connections
            .map((targetId: string) => {
              const target = nodes.find((candidate: MapNode) => candidate.id === targetId);
              return target ? { from: node, to: target } : null;
            })
            .filter(Boolean),
        )
        .flat(),
    [nodes],
  );

  const activeDungeonNode = useMemo(() => {
    if (!activeDungeon) return null;
    return nodes.find((node: MapNode) => node.id === activeDungeon.nodeId) ?? null;
  }, [activeDungeon, nodes]);

  useEffect(() => {
    if (!mapViewRef.current || !map?.currentNodeId) return;
    const container = mapViewRef.current as HTMLDivElement;
    const target = container.querySelector(`[data-node-id="${map.currentNodeId}"]`);
    if (!target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const centerX = targetRect.left - containerRect.left + container.scrollLeft + targetRect.width / 2;
    const centerY = targetRect.top - containerRect.top + container.scrollTop + targetRect.height / 2;
    container.scrollTo({
      left: Math.max(0, centerX - container.clientWidth / 2),
      top: Math.max(0, centerY - container.clientHeight / 2),
      behavior: "smooth",
    });
  }, [map?.currentNodeId]);

  // C 키로 캐릭터 창 열기
  useEffect(() => {
    const handleKeyPress = (e: any) => {
      if (e.key === "c" || e.key === "C") {
        actions.setShowCharacterSheet((prev: any) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [actions]);

  // 던전 탐험 상태 관리
  useEffect(() => {
    if (activeDungeon?.confirmed) {
      // 던전 진입 확정 시 탐험 시작
      actions.setIsDungeonExploring(true);
    } else if (!activeDungeon) {
      // activeDungeon이 사라졌을 때
      if (!activeBattle) {
        // 전투 중이 아니면 즉시 탐험 종료 (탈출/완료)
        actions.setIsDungeonExploring(false);
      }
      // 전투 중이면 그대로 유지 (던전 내 전투)
    }
  }, [activeDungeon, activeBattle, actions]);

  const handleNodeClick = (node: MapNode) => {
    if (!node || node.cleared || !node.selectable) return;
    selectNode(node.id);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>로그라이크 경로 지도</h1>
        <small>속도 시스템 기준 · React + Vite 시연</small>
      </header>

      {/* 상징 표시 */}
      <RelicsBar
        orderedRelics={orderedRelics}
        hoveredRelic={hoveredRelic}
        relicActivated={relicActivated}
        actions={actions}
      />

      <div className="legend">
        {LEGEND.map((item: any) => (
          <span key={item.label}>
            {item.icon} {item.label}
          </span>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 120, left: 20, zIndex: 9999 }}>
        <button
          onClick={() => {
            useGameStore.setState({
              activeBattle: {
                nodeId: "test-mixed",
                kind: "battle",
                label: "Mixed Mob",
                simulation: { initialState: { enemy: { hp: 1 } } }
              }
            });
          }}
          style={{
            padding: '8px 12px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            cursor: 'pointer'
          }}
        >
          ⚔️ Test Mixed Battle
        </button>
      </div>

      <div className="main-layout">
        <div className="map-container">
          <div className="map-view" ref={mapViewRef} style={{ marginLeft: '400px' }}>
            <section className="map" style={{ minHeight: mapHeight, width: MAP_WIDTH, margin: "0 auto", padding: "40px 0 60px" }}>
              <svg className="edge-layer" width={MAP_WIDTH} height={MAP_LAYERS * V_SPACING + 200}>
                {edges.map((edge: any) => {
                  if (!edge) return null;
                  const { from, to } = edge;
                  return <line key={`${from.id}-${to.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
                })}
              </svg>

              {nodes.map((node: MapNode) => (
                <button
                  key={node.id}
                  data-node-id={node.id}
                  type="button"
                  className={[
                    "node",
                    node.type,
                    node.selectable ? "selectable" : "",
                    node.cleared ? "cleared" : "",
                    node.isStart ? "start" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    left: (node.x ?? 0) - NODE_WIDTH / 2,
                    top: (node.y ?? 0) - NODE_HEIGHT / 2,
                  }}
                  onClick={() => handleNodeClick(node)}
                >
                  {!node.isStart && <span className="icon">{(ICON_MAP as any)[node.type] ?? "?"}</span>}
                  <span>{node.isStart ? "START" : node.type === "event" ? "?" : node.displayLabel}</span>
                  {node.cleared && <strong>CLEAR</strong>}
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>

      <div className="aether-column">
        <EtherBar pts={aetherValue} label="AETHER" />
      </div>

      <div className="hp-column">
        <div className="hp-title">HP</div>
        <div className="hp-bar">
          <div className="hp-fill" style={{ height: `${hpRatio * 100}%`, backgroundColor: hpColor }} />
        </div>
        <div className="hp-remaining">
          <div>{playerHp}/{maxHp}</div>
        </div>
      </div>

      <div className="risk-indicator">위험도 {riskDisplay}%</div>

      {/* 아이템 슬롯 3개 */}
      <div className="item-slots">
        {items.map((item: { usableIn?: string; icon?: string; name?: string; description?: string } | null, idx: number) => {
          const inBattle = !!activeBattle;
          const canUse = item && (item.usableIn === 'any' || (item.usableIn === 'combat' && inBattle));
          return (
            <div
              key={idx}
              className={`item-slot ${item ? 'filled' : 'empty'} ${canUse ? 'usable' : ''}`}
              onClick={() => canUse && useItem(idx)}
              style={{ cursor: canUse ? 'pointer' : 'default' }}
            >
              {item ? (
                <>
                  <span className="item-icon">{item.icon || '?'}</span>
                  {item.usableIn === 'combat' && !inBattle && (
                    <span className="item-combat-only">⚔</span>
                  )}
                  {/* 아이템 툴팁 */}
                  <div className="item-tooltip">
                    <div className="item-tooltip-name">{item.name}</div>
                    <div className="item-tooltip-desc">{item.description}</div>
                    {item.usableIn === 'combat' && (
                      <div className="item-tooltip-usage">
                        {inBattle ? '✓ 선택/대응 단계에서 사용' : '⚔ 전투 선택/대응 단계에서만 사용 가능'}
                      </div>
                    )}
                    {item.usableIn === 'any' && (
                      <div className="item-tooltip-usage" style={{ color: '#86efac' }}>✓ 언제든 사용 가능</div>
                    )}
                  </div>
                </>
              ) : (
                <span className="item-empty">-</span>
              )}
            </div>
          );
        })}
        {/* 아이템 버프 표시 */}
        {Object.keys(itemBuffs).length > 0 && (
          <div className="item-buffs">
            {Object.entries(itemBuffs).map(([stat, value]: [string, number]) => (
              <span key={stat} className="item-buff">
                {(STAT_LABELS as Record<string, string>)[stat] || stat} +{value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="resources-display">
        <div style={{ color: "#ffd700", fontSize: "13px" }}>금: {resources.gold}</div>
        <div style={{ color: "#9da9d6", fontSize: "13px" }}>정보: {resources.intel}</div>
        <div style={{ color: "#ff6b6b", fontSize: "13px" }}>전리품: {resources.loot}</div>
        <div style={{ color: "#a0e9ff", fontSize: "13px" }}>원자재: {resources.material}</div>
        <div style={{ color: canAwaken ? "#fb7185" : "#cbd5e1", fontSize: "13px", fontWeight: 700 }}>
          기억: {memoryValue}{canAwaken ? " · 각성 가능" : ""}
        </div>
      </div>

      <div className="map-version-tag">{PATCH_VERSION_TAG}</div>

      <EventModal
        activeEvent={activeEvent}
        resources={resources}
        meetsStatRequirement={meetsStatRequirement}
        chooseEvent={chooseEvent}
        closeEvent={closeEvent}
      />

      {activeRest && (
        <RestModal
          memoryValue={memoryValue}
          playerHp={playerHp}
          maxHp={maxHp}
          canAwaken={canAwaken}
          playerTraits={playerTraits}
          canFormEgo={canFormEgo}
          cardUpgrades={cardUpgrades}
          closeRest={closeRest}
          awakenAtRest={awakenAtRest}
          healAtRest={healAtRest}
          upgradeCardRarity={upgradeCardRarity}
          formEgo={formEgo}
        />
      )}

      {activeBattle && <BattleScreen />}

      {activeDungeon && !activeDungeon.confirmed && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <header>
              <h3>⚠️ 던전 진입</h3>
            </header>
            <p style={{ marginBottom: "20px", lineHeight: "1.6" }}>
              위험한 던전이 앞에 있습니다. 던전 내부는 위험하지만 보상도 있습니다.
              <br />
              진입하시겠습니까?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={confirmDungeon}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "2px solid #3498db",
                  background: "rgba(52, 152, 219, 0.2)",
                  color: "#3498db",
                  cursor: "pointer",
                }}
              >
                진입한다
              </button>
              <button
                type="button"
                onClick={bypassDungeon}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "2px solid #95a5a6",
                  background: "rgba(149, 165, 166, 0.2)",
                  color: "#95a5a6",
                  cursor: "pointer",
                }}
              >
                지나친다
              </button>
            </div>
          </div>
        </div>
      )}

      {isDungeonExploring && (
        <div style={{ display: activeBattle ? 'none' : 'block' }}>
          <DungeonExploration />
        </div>
      )}

      {lastBattleResult && !lastBattleResult.nodeId.startsWith('dungeon-') && (
        <div className="battle-modal-overlay">
          <div className="battle-modal result">
            <h3>전투 결과</h3>
            <p>
              {lastBattleResult.label} / {lastBattleResult.kind.toUpperCase()}
            </p>
            <strong>{lastBattleResult.result === "victory" ? "승리" : "패배"}</strong>
            <p>보상: {formatApplied(lastBattleResult.rewards)}</p>
            {lastBattleResult.log?.length ? (
              <div className="timeline-preview">
                <strong>로그</strong>
                <ul>
                  {lastBattleResult.log.slice(0, 6).map((entry: any, index: any) => (
                    <li key={`log-${index}`}>{formatBattleLogEntry(entry)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button type="button" className="close-btn" onClick={clearBattleResult}>
              확인
            </button>
          </div>
        </div>
      )}

      {showCharacterSheet && <CharacterSheet onClose={() => actions.setShowCharacterSheet(false)} showAllCards={showAllCards} />}

      {activeShop && <ShopModal merchantType={(activeShop.merchantType || 'shop') as MerchantTypeKey} onClose={closeShop} />}

      {/* 개발자 도구 오버레이 */}
      <DevTools
        isOpen={devToolsOpen}
        onClose={() => actions.setDevToolsOpen(false)}
        showAllCards={showAllCards}
        setShowAllCards={(value) => {
          setShowAllCards(value);
          try {
            localStorage.setItem('showAllCards', value.toString());
          } catch {}
        }}
      />
    </div>
  );
}
