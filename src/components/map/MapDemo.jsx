import { useEffect, useMemo, useRef } from "react";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";

const NODE_WIDTH = 96;
const NODE_HEIGHT = 100;
const MAP_WIDTH = 960;
const MAP_LAYERS = 11;
const V_SPACING = 360;
const PRAYER_COSTS = [1, 3, 5];

const ICON_MAP = {
  battle: "⚔️",
  elite: "⛧",
  shop: "🛒",
  event: "?",
  rest: "⛺",
  boss: "👑",
  dungeon: "☠️",
};

const LEGEND = [
  { icon: "⚔️", label: "전투" },
  { icon: "⛧", label: "정예" },
  { icon: "🛒", label: "상점" },
  { icon: "⛺", label: "야영" },
  { icon: "?", label: "이벤트" },
  { icon: "☠️", label: "던전" },
  { icon: "👑", label: "보스" },
];

const RESOURCE_LABELS = {
  gold: "금",
  intel: "정보",
  loot: "전리품",
  material: "원자재",
  etherPts: "에테르",
};

const describeAmount = (value) => {
  if (value == null) return "0";
  if (typeof value === "number") return `${value}`;
  const min = value.min ?? 0;
  const max = value.max ?? min;
  return min === max ? `${min}` : `${min}~${max}`;
};

const describeBundle = (bundle = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "없음";
  return entries.map(([key, amount]) => `${RESOURCE_LABELS[key] ?? key} ${describeAmount(amount)}`).join(", ");
};

const describeCost = (cost = {}) => {
  const entries = Object.entries(cost || {});
  if (!entries.length) return "없음";
  return entries.map(([key, amount]) => `${RESOURCE_LABELS[key] ?? key} ${amount}`).join(", ");
};

const formatApplied = (bundle = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "없음";
  return entries
    .map(([key, amount]) => {
      const numeric = typeof amount === "number" ? amount : 0;
      const prefix = numeric > 0 ? "+" : "";
      return `${RESOURCE_LABELS[key] ?? key} ${prefix}${numeric}`;
    })
    .join(", ");
};

const canAfford = (resources, cost = {}) =>
  Object.entries(cost).every(([key, value]) => (resources[key] ?? 0) >= value);

const formatBattleLogEntry = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  const actorLabel =
    entry.actor === "player" ? "플레이어" : entry.actor === "enemy" ? "적" : entry.actor ?? "";
  const cardLabel = entry.name ?? entry.cardId ?? "행동";
  const detail = entry.detail ?? {};

  if (detail.type === "attack") {
    const dmg = detail.hpDamage ?? 0;
    const blocked = detail.blocked ?? 0;
    return `${actorLabel} ${cardLabel} 공격: 피해 ${dmg}, 차단 ${blocked}`;
  }
  if (detail.type === "block") {
    return `${actorLabel} ${cardLabel} 방어 +${detail.block ?? 0}`;
  }
  if (detail.type === "support") {
    return `${actorLabel} ${cardLabel} 보조 효과 발동`;
  }
  if (entry.events && Array.isArray(entry.events)) {
    return entry.events.map(formatBattleLogEntry).join(", ");
  }
  return `${actorLabel} ${cardLabel}`;
};

const friendlyPercent = (chance) => {
  if (typeof chance !== "number") return null;
  return `${Math.round(chance * 100)}%`;
};

const PATCH_VERSION_TAG = "11-16-17:05"; // 다음 패치마다 여기를 최신 시간(월-일-시:분, KST)으로 갱신하세요.

/* v11-16-14:45 갱신 내역
 * - 카드 스탯 폰트 크기 일원화 및 확대:
 *   - 선택/대응 단계 모두 text-sm → text-lg (14px → 18px)
 *   - 속도: 0.75rem/text-xs → 1.125rem/text-lg (12px → 18px)
 *   - 공격력, 방어력, 속도 숫자 모두 동일한 크기로 통일
 * - 속도/선택 텍스트 색상 변경: #94a3b8 → #7dd3fc (옅은 하늘색)
 * - 제출 버튼 아이콘 크기 조정: 20 → 18 (리드로우 버튼과 동일한 높이)
 */

export function MapDemo() {
  const map = useGameStore((state) => state.map);
  const resources = useGameStore((state) => state.resources);
  const mapRisk = useGameStore((state) => state.mapRisk);
  const activeEvent = useGameStore((state) => state.activeEvent);
  const activeDungeon = useGameStore((state) => state.activeDungeon);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const selectNode = useGameStore((state) => state.selectNode);
  const chooseEvent = useGameStore((state) => state.chooseEvent);
  const closeEvent = useGameStore((state) => state.closeEvent);
  const invokePrayer = useGameStore((state) => state.invokePrayer);
  const enterDungeon = useGameStore((state) => state.enterDungeon);
  const skipDungeon = useGameStore((state) => state.skipDungeon);
  const revealDungeonInfo = useGameStore((state) => state.revealDungeonInfo);
  const clearBattleResult = useGameStore((state) => state.clearBattleResult);

  const nodes = map?.nodes ?? [];
  const mapViewRef = useRef(null);
  const riskDisplay = Number.isFinite(mapRisk) ? mapRisk.toFixed(1) : "-";
  const aetherValue = resources.etherPts ?? 0;
  const aetherSlots = calculateEtherSlots(aetherValue); // 인플레이션 적용
  const aetherCurrentPts = getCurrentSlotPts(aetherValue); // 현재 슬롯 내의 pt (슬롯마다 0으로 리셋)
  const aetherNextSlotCost = getNextSlotCost(aetherValue); // 다음 슬롯을 채우는데 필요한 총 pt
  const aetherProgress = getSlotProgress(aetherValue); // 다음 슬롯까지의 진행률 (0-1)
  const aetherRatio = Math.max(0, Math.min(1, aetherProgress)); // 시각적 바 높이
  const aetherTier = `x${aetherSlots}`;

  const mapHeight = useMemo(() => {
    if (!nodes.length) return 800;
    const maxY = Math.max(...nodes.map((node) => node.y), 0);
    return maxY + NODE_HEIGHT + 200;
  }, [nodes]);

  const edges = useMemo(
    () =>
      nodes
        .map((node) =>
          node.connections
            .map((targetId) => {
              const target = nodes.find((candidate) => candidate.id === targetId);
              return target ? { from: node, to: target } : null;
            })
            .filter(Boolean),
        )
        .flat(),
    [nodes],
  );

  const activeDungeonNode = useMemo(() => {
    if (!activeDungeon) return null;
    return nodes.find((node) => node.id === activeDungeon.nodeId) ?? null;
  }, [activeDungeon, nodes]);

  useEffect(() => {
    if (!mapViewRef.current || !map?.currentNodeId) return;
    const container = mapViewRef.current;
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
  }, [map?.currentNodeId, nodes]);

  const availablePrayers = useMemo(
    () => PRAYER_COSTS.filter((cost) => (resources.etherPts ?? 0) >= cost),
    [resources.etherPts],
  );

  const handleNodeClick = (node) => {
    if (!node || node.cleared || !node.selectable) return;
    selectNode(node.id);
  };

  const asideItems = [
    "조합 감지 결과 로그에 '>>> 반환된 조합' 필드 추가",
    "선택 단계 vs 대응 단계 조합 차이 디버깅",
    "브라우저 캐시 문제 해결을 위한 버전 강제 업데이트",
  ];

  return (
    <div className="app-shell">
      <header>
        <h1>로그라이크 경로 지도</h1>
        <small>속도 시스템 기준 · React + Vite 시연</small>
      </header>

      <div className="legend">
        {LEGEND.map((item) => (
          <span key={item.label}>
            {item.icon} {item.label}
          </span>
        ))}
      </div>

      <div className="main-layout">
        <div className="map-container">
          <div className="map-view" ref={mapViewRef}>
            <section className="map" style={{ minHeight: mapHeight, width: MAP_WIDTH, margin: "0 auto", padding: "160px 0 240px" }}>
              <svg className="edge-layer" width={MAP_WIDTH} height={MAP_LAYERS * V_SPACING + 200}>
                {edges.map(({ from, to }) => (
                  <line key={`${from.id}-${to.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                ))}
              </svg>

              {nodes.map((node) => (
                <button
                  key={node.id}
                  data-node-id={node.id}
                  type="button"
                  className={[
                    "node",
                    node.type,
                    node.selectable && !node.cleared ? "selectable" : "",
                    node.cleared ? "cleared" : "",
                    node.isStart ? "start" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    left: node.x - NODE_WIDTH / 2,
                    top: node.y - NODE_HEIGHT / 2,
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

      <aside className="legacy-pane">
        <div className="legacy-pane-header">
          <strong className="version-badge" style={{ fontSize: "1.55rem" }}>{PATCH_VERSION_TAG}</strong>
          <button type="button">문서 링크</button>
        </div>
        <ol>
          {asideItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </aside>

      <div className="resource-hud">
        {Object.entries(resources)
          .filter(([key]) => key !== "etherPts")
          .map(([key, value]) => (
            <span key={key} className="resource-tag">
              {RESOURCE_LABELS[key] ?? key}: {value}
            </span>
          ))}
      </div>

      <div className="aether-column">
        <div className="aether-title">AETHER</div>
        <div className="aether-bar">
          <div className="aether-fill" style={{ height: `${aetherRatio * 100}%` }} />
        </div>
        <div className="aether-remaining">
          <div>{aetherCurrentPts}/{aetherNextSlotCost}</div>
          <div>{aetherTier}</div>
        </div>
      </div>

      <div className="risk-indicator">위험도 {riskDisplay}%</div>

      {activeEvent && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <header>
              <h3>{activeEvent.definition?.title ?? "미확인 사건"}</h3>
              <small>우호 확률 {friendlyPercent(activeEvent.friendlyChance) ?? "정보 없음"}</small>
            </header>
            <p>{activeEvent.definition?.description}</p>

            {!activeEvent.resolved && (
              <>
                <div className="event-choices">
                  {activeEvent.definition?.choices?.map((choice) => {
                    const affordable = canAfford(resources, choice.cost || {});
                    return (
                      <div key={choice.id} className="choice-card">
                        <strong>{choice.label}</strong>
                        <p>{choice.detail}</p>
                        <small>비용: {describeCost(choice.cost)}</small>
                        <small>보상: {describeBundle(choice.rewards)}</small>
                        <small>패널티: {describeBundle(choice.penalty)}</small>
                        <button type="button" disabled={!affordable} onClick={() => chooseEvent(choice.id)}>
                          선택
                        </button>
                      </div>
                    );
                  })}
                </div>

                {availablePrayers.length > 0 && (
                  <div className="event-choices">
                    <strong>기도 (에테르 사용)</strong>
                    {availablePrayers.map((cost) => (
                      <div key={`prayer-${cost}`} className="choice-card">
                        <strong>기도 x{cost}</strong>
                        <p>에테르를 소모해 우호적 결과를 강제합니다.</p>
                        <small>비용: 에테르 {cost}</small>
                        <small>보상: 정보 획득 + 안정화</small>
                        <button type="button" onClick={() => invokePrayer(cost)}>
                          기도한다
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeEvent.resolved && activeEvent.outcome && (
              <div className="event-result">
                <strong>{activeEvent.outcome.choice}</strong>
                <p>{activeEvent.outcome.success ? "우호적 처리" : "비우호적 처리"}</p>
                <p>{activeEvent.outcome.text}</p>
                <p>소모: {formatApplied(Object.fromEntries(Object.entries(activeEvent.outcome.cost || {}).map(([k, v]) => [k, -v])))}</p>
                <p>획득: {formatApplied(activeEvent.outcome.rewards)}</p>
                <p>손실: {formatApplied(activeEvent.outcome.penalty)}</p>
                <button type="button" className="close-btn" onClick={closeEvent}>
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeDungeon && (
        <div className="dungeon-modal-overlay">
          <div className="dungeon-modal">
            <h3>던전 경고</h3>
            <p className="dungeon-warning">이곳에서는 짙은 죽음의 냄새가 납니다. 던전은 입장은 자유롭지만 나가는 것은 어렵습니다.</p>
            <p className="dungeon-warning">던전에서 원정이 실패로 끝날 수 있음을 명심하세요.</p>

            <div className="dungeon-info">
              <strong>규모 · 유형</strong>
              {activeDungeon.revealed ? (
                <>
                  <p>규모: {activeDungeonNode?.dungeonData?.size ?? "미확인"}</p>
                  <p>유형: {activeDungeonNode?.dungeonData?.type ?? "미확인"}</p>
                </>
              ) : (
                <>
                  <p>정보를 지불하면 구조를 파악할 수 있습니다.</p>
                  <button type="button" onClick={revealDungeonInfo} disabled={(resources.intel ?? 0) < 2}>
                    정보 해금 (정보 2)
                  </button>
                </>
              )}
            </div>

            <div className="dungeon-actions">
              <button type="button" className="skip" onClick={skipDungeon}>
                그냥 지나친다
              </button>
              <button type="button" className="enter" onClick={enterDungeon}>
                입장한다
              </button>
            </div>
          </div>
        </div>
      )}

      {lastBattleResult && (
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
                  {lastBattleResult.log.slice(0, 6).map((entry, index) => (
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
    </div>
  );
}


