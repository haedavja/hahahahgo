import { useEffect, useMemo, useRef } from "react";
import { useGameStore } from "../../state/gameStore";

const buildBattlePayload = (battle) => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;
  return {
    player: {
      hp: initialPlayer?.hp ?? 30,
      maxHp: initialPlayer?.hp ?? 30,
      energy: 6,
    },
    enemy: {
      name: battle.label ?? "Enemy",
      hp: initialEnemy?.hp ?? 30,
    },
  };
};

export function LegacyBattleScreen() {
  const activeBattle = useGameStore((state) => state.activeBattle);
  const resolveBattle = useGameStore((state) => state.resolveBattle);
  const applyAetherDelta = useGameStore((state) => state.applyAetherDelta);
  const playerAether = useGameStore((state) => state.resources.aether ?? 0);
  const iframeRef = useRef(null);
  const payload = useMemo(() => {
    if (!activeBattle) return null;
    const initialPlayer = activeBattle.simulation?.initialState?.player;
    const initialEnemy = activeBattle.simulation?.initialState?.enemy;
    return {
      player: {
        hp: initialPlayer?.hp ?? 30,
        maxHp: initialPlayer?.hp ?? 30,
        energy: 6,
        etherPts: playerAether,
      },
      enemy: {
        name: activeBattle.label ?? "Enemy",
        hp: initialEnemy?.hp ?? 30,
      },
    };
  }, [activeBattle, playerAether]);
  const frameKey = activeBattle ? `${activeBattle.nodeId}-${activeBattle.kind}` : "idle";

  const postInit = () => {
    if (!payload) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    console.log("[LegacyBattleScreen] Sending payload to battle:", payload);
    target.postMessage({ type: "battleInit", payload }, "*");
  };

  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      console.log("[LegacyBattleScreen] Received message:", data);
      if (data.type === "battleReady") {
        console.log("[LegacyBattleScreen] Battle ready, sending init");
        postInit();
      }
      if (data.type === "battleResult") {
        console.log(
          "[LegacyBattleScreen] Battle result:",
          data.result,
          "etherPts:",
          data.etherPts,
          "deltaAether:",
          data.deltaAether,
        );
        const result = data.result === "victory" ? "victory" : "defeat";
        const delta = typeof data.deltaAether === "number" ? data.deltaAether : 0;
        if (delta) {
          applyAetherDelta(delta);
        } else if (typeof data.etherPts === "number") {
          const current = useGameStore.getState().resources.aether ?? 0;
          const fallbackDelta = Math.max(0, data.etherPts) - current;
          if (fallbackDelta) applyAetherDelta(fallbackDelta);
        }
        resolveBattle({ result, etherPts: data.etherPts });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [resolveBattle, payload, applyAetherDelta]);

  useEffect(() => {
    if (!payload) return;
    postInit();
  }, [payload]);

  if (!activeBattle) return null;

  return (
    <div className="battle-fullscreen">
      <iframe
        key={frameKey}
        ref={iframeRef}
        title="battle"
        src="/battle.html"
        className="battle-legacy-frame"
        onLoad={postInit}
      />
    </div>
  );
}
