import { useEffect, useMemo, useRef, useState, useCallback, memo, lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import { useShallow } from 'zustand/react/shallow';
import type { Resources, MapNode } from "../../types";
import { useMapState } from "./hooks/useMapState";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import type { MerchantTypeKey } from "../../data/shop";
import { EtherBar } from "../battle/ui/EtherBar";

// Lazy loading for heavy components
const EventModal = lazy(() => import("./ui/EventModal").then(m => ({ default: m.EventModal })));
const CharacterSheet = lazy(() => import("../character/CharacterSheet").then(m => ({ default: m.CharacterSheet })));
const DungeonExploration = lazy(() => import("../dungeon/DungeonExploration").then(m => ({ default: m.DungeonExploration })));
const BattleScreen = lazy(() => import("../battle/BattleScreen").then(m => ({ default: m.BattleScreen })));
const ShopModal = lazy(() => import("../shop/ShopModal").then(m => ({ default: m.ShopModal })));
const RestModal = lazy(() => import("./ui/RestModal").then(m => ({ default: m.RestModal })));
const DevTools = lazy(() => import("../dev/DevTools").then(m => ({ default: m.DevTools })));
const StatsWidget = lazy(() => import("./ui/StatsWidget").then(m => ({ default: m.StatsWidget })));
const RelicsBar = lazy(() => import("./ui/RelicsBar").then(m => ({ default: m.RelicsBar })));
const PathosBar = lazy(() => import("./ui/PathosBar").then(m => ({ default: m.PathosBar })));
const MapLog = lazy(() => import("./ui/MapLog").then(m => ({ default: m.MapLog })));
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

// =====================
// 스타일 상수
// =====================

const MAP_VIEW_STYLE: CSSProperties = {
  marginLeft: '400px'
};

const DUNGEON_MODAL_PARAGRAPH_STYLE: CSSProperties = {
  marginBottom: '20px',
  lineHeight: '1.6'
};

const DUNGEON_BUTTON_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center'
};

const DUNGEON_CONFIRM_BUTTON_STYLE: CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '600',
  borderRadius: '8px',
  border: '2px solid #3498db',
  background: 'rgba(52, 152, 219, 0.2)',
  color: '#3498db',
  cursor: 'pointer'
};

const DUNGEON_BYPASS_BUTTON_STYLE: CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '600',
  borderRadius: '8px',
  border: '2px solid #95a5a6',
  background: 'rgba(149, 165, 166, 0.2)',
  color: '#95a5a6',
  cursor: 'pointer'
};

const RESOURCE_GOLD_STYLE: CSSProperties = {
  color: '#ffd700',
  fontSize: '13px'
};

const RESOURCE_INTEL_STYLE: CSSProperties = {
  color: '#9da9d6',
  fontSize: '13px'
};

const RESOURCE_LOOT_STYLE: CSSProperties = {
  color: '#ff6b6b',
  fontSize: '13px'
};

const RESOURCE_MATERIAL_STYLE: CSSProperties = {
  color: '#a0e9ff',
  fontSize: '13px'
};

const USAGE_SUCCESS_STYLE: CSSProperties = {
  color: '#86efac'
};

const TEMP_BUFF_CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  top: '10px',
  left: '10px',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '8px 12px',
  background: 'rgba(0, 0, 0, 0.75)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  fontSize: '13px',
  fontWeight: 600,
};

const TEMP_BUFF_ITEM_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const TEMP_BUFF_VALUE_STYLE: CSSProperties = {
  color: '#86efac',
  fontWeight: 700,
};

const TEMP_BUFF_REMAINING_STYLE: CSSProperties = {
  color: '#94a3b8',
  fontSize: '11px',
  marginLeft: '4px',
};

function MapDemoComponent() {
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
    saved.forEach((id: string) => { if (relicList?.includes(id)) merged.push(id); });
    (relicList || []).forEach((id: string) => { if (!savedSet.has(id)) merged.push(id); });
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
    actions.setOrderedRelics((prev: string[]) => {
      return mergeRelicOrder(relics || [], prev);
    });
  }, [relics, mergeRelicOrder, actions]);
  useEffect(() => {
    try {
      localStorage.setItem("relicOrder", JSON.stringify(orderedRelics));
    } catch { /* ignore */ }
  }, [orderedRelics]);

  // 플레이어 스탯 셀렉터 (그룹화)
  const { playerHp, maxHp, playerStrength, playerAgility, playerInsight, playerTraits, cardUpgrades, cardGrowth, itemBuffs, tempBuffs, characterBuild } = useGameStore(
    useShallow((state) => ({
      playerHp: state.playerHp,
      maxHp: state.maxHp,
      playerStrength: state.playerStrength || 0,
      playerAgility: state.playerAgility || 0,
      playerInsight: state.playerInsight || 0,
      playerTraits: state.playerTraits || [],
      cardUpgrades: state.cardUpgrades || {},
      cardGrowth: state.cardGrowth || {},
      itemBuffs: state.itemBuffs || {},
      tempBuffs: state.tempBuffs || [],
      characterBuild: state.characterBuild,
    }))
  );
  const ownedCards = characterBuild?.ownedCards || [];

  // 액션 셀렉터 (그룹화)
  const {
    selectNode, chooseEvent, closeEvent, clearBattleResult,
    skipDungeon, confirmDungeon, bypassDungeon,
    awakenAtRest, closeRest, closeShop, healAtRest,
    upgradeCardRarity, enhanceCard, specializeCard, useItem, setResources, applyTempBuff,
    startBattle
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
      upgradeCardRarity: state.upgradeCardRarity,
      enhanceCard: state.enhanceCard,
      specializeCard: state.specializeCard,
      useItem: state.useItem,
      setResources: state.setResources,
      applyTempBuff: state.applyTempBuff,
      startBattle: state.startBattle,
    }))
  );

  // 골드 소비 헬퍼
  const spendGold = useCallback((amount: number) => {
    const currentGold = resources.gold ?? 0;
    if (currentGold >= amount) {
      setResources({ gold: currentGold - amount });
    }
  }, [resources.gold, setResources]);

  // 은총화 소비 헬퍼
  const spendGrace = useCallback((amount: number) => {
    const currentGrace = resources.grace ?? 0;
    if (currentGrace >= amount) {
      setResources({ grace: currentGrace - amount });
    }
  }, [resources.grace, setResources]);

  // 기억 획득 헬퍼 (명상용)
  const gainMemory = useCallback((amount: number) => {
    const currentMemory = resources.memory ?? 0;
    setResources({ memory: currentMemory + amount });
  }, [resources.memory, setResources]);

  // tempBuffs를 스탯별로 합산
  const tempBuffTotals = useMemo(() => {
    const totals: Record<string, number> = { strength: 0, agility: 0, insight: 0 };
    for (const buff of tempBuffs) {
      totals[buff.stat] = (totals[buff.stat] || 0) + buff.value;
    }
    return totals;
  }, [tempBuffs]);

  // 아이템 버프 + 임시 버프를 포함한 유효 스탯 계산
  const effectiveStrength = playerStrength + (itemBuffs.strength || 0) + (tempBuffTotals.strength || 0);
  const effectiveAgility = playerAgility + (itemBuffs.agility || 0) + (tempBuffTotals.agility || 0);
  const effectiveInsight = playerInsight + (itemBuffs.insight || 0) + (tempBuffTotals.insight || 0);

  // 스탯 요구사항 충족 여부 체크 (아이템 버프 포함)
  const meetsStatRequirement = useCallback((statRequirement: Record<string, number> | undefined) => {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        actions.setDevToolsOpen((prev: boolean) => !prev);
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

  // 에테르 관련 값
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
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "C") {
        actions.setShowCharacterSheet((prev: boolean) => !prev);
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
      {/* 우측 상단 통계 위젯 */}
      <Suspense fallback={null}>
        <StatsWidget />
      </Suspense>

      {/* 우측 하단 활동 로그 */}
      <Suspense fallback={null}>
        <MapLog />
      </Suspense>

      {/* 좌측 상단 임시 버프 표시 */}
      {tempBuffs.length > 0 && (
        <div style={TEMP_BUFF_CONTAINER_STYLE} data-testid="temp-buffs-display">
          <div style={{ color: '#fbbf24', marginBottom: '4px', fontSize: '11px' }}>⏳ 임시 버프</div>
          {tempBuffs.map((buff, idx) => (
            <div key={`${buff.stat}-${idx}`} style={TEMP_BUFF_ITEM_STYLE}>
              <span>{(STAT_LABELS as Record<string, string>)[buff.stat] || buff.stat}</span>
              <span style={TEMP_BUFF_VALUE_STYLE}>+{buff.value}</span>
              <span style={TEMP_BUFF_REMAINING_STYLE}>({buff.remainingNodes}칸)</span>
            </div>
          ))}
        </div>
      )}

      {/* 상징 표시 */}
      <Suspense fallback={null}>
        <RelicsBar
          orderedRelics={orderedRelics}
          hoveredRelic={hoveredRelic}
          relicActivated={relicActivated}
          actions={{
            setHoveredRelic: actions.setHoveredRelic,
            setRelicActivated: actions.setRelicActivated,
            setOrderedRelics: actions.setOrderedRelics,
          }}
        />
      </Suspense>

      {/* 장착 파토스 표시 */}
      <Suspense fallback={null}>
        <PathosBar />
      </Suspense>

      <div className="legend">
        {LEGEND.map((item: { icon: string; label: string }) => (
          <span key={item.label}>
            {item.icon} {item.label}
          </span>
        ))}
      </div>

      <div className="main-layout">
        <div className="map-container" data-testid="map-container">
          <div className="map-view" data-testid="map-view" ref={mapViewRef} style={MAP_VIEW_STYLE}>
            <section className="map" style={{ minHeight: mapHeight, width: MAP_WIDTH, margin: "0 auto", padding: "40px 0 60px" }}>
              <svg className="edge-layer" width={MAP_WIDTH} height={MAP_LAYERS * V_SPACING + 200}>
                {edges.map((edge: { from: MapNode; to: MapNode } | null) => {
                  if (!edge) return null;
                  const { from, to } = edge;
                  return <line key={`${from.id}-${to.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
                })}
              </svg>

              {nodes.map((node: MapNode) => (
                <button
                  key={node.id}
                  data-node-id={node.id}
                  data-node-type={node.type}
                  data-testid={`map-node-${node.id}`}
                  data-node-selectable={node.selectable ? 'true' : 'false'}
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
                  {!node.isStart && <span className="icon">{ICON_MAP[node.type] ?? "?"}</span>}
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

      <div className="hp-column" data-testid="map-hp-column">
        <div className="hp-title">HP</div>
        <div className="hp-bar" data-testid="map-hp-bar">
          <div className="hp-fill" style={{ height: `${hpRatio * 100}%`, backgroundColor: hpColor }} />
        </div>
        <div className="hp-remaining" data-testid="player-hp">
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
                      <div className="item-tooltip-usage" style={USAGE_SUCCESS_STYLE}>✓ 언제든 사용 가능</div>
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

      <div className="resources-display" data-testid="resources-display">
        <div style={RESOURCE_GOLD_STYLE} data-testid="player-gold">금: {resources.gold}</div>
        <div style={RESOURCE_INTEL_STYLE} data-testid="player-intel">정보: {resources.intel}</div>
        <div style={RESOURCE_LOOT_STYLE} data-testid="player-loot">전리품: {resources.loot}</div>
        <div style={RESOURCE_MATERIAL_STYLE} data-testid="player-material">원자재: {resources.material}</div>
        <div style={{ color: canAwaken ? "#fb7185" : "#cbd5e1", fontSize: "13px", fontWeight: 700 }} data-testid="player-memory">
          기억: {memoryValue}{canAwaken ? " · 각성 가능" : ""}
        </div>
      </div>

      <div className="map-version-tag">{PATCH_VERSION_TAG}</div>

      {activeEvent && (
        <Suspense fallback={null}>
          <EventModal
            activeEvent={activeEvent}
            resources={resources}
            meetsStatRequirement={meetsStatRequirement}
            chooseEvent={chooseEvent}
            closeEvent={closeEvent}
            startBattle={startBattle}
          />
        </Suspense>
      )}

      {activeRest && (
        <Suspense fallback={null}>
          <RestModal
            memoryValue={memoryValue}
            playerHp={playerHp}
            maxHp={maxHp}
            canAwaken={canAwaken}
            playerTraits={playerTraits}
            cardUpgrades={cardUpgrades}
            cardGrowth={cardGrowth}
            gold={resources.gold ?? 0}
            grace={resources.grace ?? 0}
            ownedCards={ownedCards}
            closeRest={closeRest}
            awakenAtRest={awakenAtRest}
            healAtRest={healAtRest}
            upgradeCardRarity={upgradeCardRarity}
            enhanceCard={enhanceCard}
            specializeCard={specializeCard}
            spendGold={spendGold}
            spendGrace={spendGrace}
            gainMemory={gainMemory}
            applyTempBuff={applyTempBuff}
          />
        </Suspense>
      )}

      {activeBattle && (
        <Suspense fallback={null}>
          <BattleScreen />
        </Suspense>
      )}

      {activeDungeon && !activeDungeon.confirmed && (
        <div className="event-modal-overlay" data-testid="dungeon-modal-overlay">
          <div className="event-modal" data-testid="dungeon-modal">
            <header>
              <h3>⚠️ 던전 진입</h3>
            </header>
            <p style={DUNGEON_MODAL_PARAGRAPH_STYLE}>
              위험한 던전이 앞에 있습니다. 던전 내부는 위험하지만 보상도 있습니다.
              <br />
              진입하시겠습니까?
            </p>
            <div style={DUNGEON_BUTTON_CONTAINER_STYLE}>
              <button
                type="button"
                onClick={confirmDungeon}
                style={DUNGEON_CONFIRM_BUTTON_STYLE}
                data-testid="dungeon-confirm-btn"
              >
                진입한다
              </button>
              <button
                type="button"
                onClick={bypassDungeon}
                style={DUNGEON_BYPASS_BUTTON_STYLE}
                data-testid="dungeon-bypass-btn"
              >
                지나친다
              </button>
            </div>
          </div>
        </div>
      )}

      {isDungeonExploring && (
        <Suspense fallback={null}>
          <div style={{ display: activeBattle ? 'none' : 'block' }}>
            <DungeonExploration />
          </div>
        </Suspense>
      )}

      {lastBattleResult && !lastBattleResult.nodeId.startsWith('dungeon-') && (
        <div className="battle-modal-overlay" data-testid="battle-result-overlay">
          <div className="battle-modal result" data-testid="battle-result-modal">
            <h3>전투 결과</h3>
            <p>
              {lastBattleResult.label} / {lastBattleResult.kind.toUpperCase()}
            </p>
            <strong data-testid="battle-result">{lastBattleResult.result === "victory" ? "승리" : "패배"}</strong>
            <p data-testid="battle-rewards">보상: {formatApplied(lastBattleResult.rewards)}</p>
            {lastBattleResult.log?.length ? (
              <div className="timeline-preview">
                <strong>로그</strong>
                <ul>
                  {lastBattleResult.log.slice(0, 6).map((entry: string, index: number) => (
                    <li key={`log-${index}`}>{formatBattleLogEntry(entry)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button type="button" className="close-btn" onClick={clearBattleResult} data-testid="battle-result-close-btn">
              확인
            </button>
          </div>
        </div>
      )}

      {showCharacterSheet && (
        <Suspense fallback={null}>
          <CharacterSheet onClose={() => actions.setShowCharacterSheet(false)} showAllCards={showAllCards} />
        </Suspense>
      )}

      {activeShop && (
        <Suspense fallback={null}>
          <ShopModal merchantType={(activeShop.merchantType || 'shop') as MerchantTypeKey} onClose={closeShop} />
        </Suspense>
      )}

      {/* 개발자 도구 오버레이 */}
      {devToolsOpen && (
        <Suspense fallback={null}>
          <DevTools
            isOpen={devToolsOpen}
            onClose={() => actions.setDevToolsOpen(false)}
            showAllCards={showAllCards}
            setShowAllCards={(value) => {
              setShowAllCards(value);
              try {
                localStorage.setItem('showAllCards', value.toString());
              } catch { /* ignore localStorage write failure */ }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export const MapDemo = memo(MapDemoComponent);
