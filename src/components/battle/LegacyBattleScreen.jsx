import { useMemo, useCallback, useState, useEffect } from "react";
import { useGameStore } from "../../state/gameStore";
import { LegacyBattleApp } from "./LegacyBattleApp";
import { DevTools } from "../dev/DevTools";
import { calculatePassiveEffects, applyCombatStartEffects } from "../../lib/relicEffects";

const buildBattlePayload = (battle, etherPts, relics, maxHp) => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;

  // 유물 패시브 효과 계산
  const passiveEffects = calculatePassiveEffects(relics);
  const baseEnergy = 6;
  const maxEnergy = baseEnergy + passiveEffects.maxEnergy;

  // 전투 시작 효과 계산
  const combatStartEffects = applyCombatStartEffects(relics, {});

  // 전투 시작 시 체력/방어력 보너스 적용
  // 피의 족쇄 등의 피해를 적용하고 회복 효과를 더함
  const startingHp = Math.max(
    1, // 최소 체력 1
    Math.min(
      maxHp,
      (initialPlayer?.hp ?? maxHp) - combatStartEffects.damage + combatStartEffects.heal
    )
  );

  // 피의 족쇄 등의 힘 보너스 계산
  const startingStrength = (passiveEffects.strength || 0) + (combatStartEffects.strength || 0);

  return {
    player: {
      hp: startingHp,
      maxHp: maxHp, // gameStore의 maxHp 사용 (유물 효과가 이미 적용됨)
      energy: maxEnergy + combatStartEffects.energy, // 시작 에너지 = maxEnergy + 전투 시작 보너스
      block: combatStartEffects.block, // 시작 방어력
      strength: startingStrength, // 시작 힘
      etherPts,
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
  const applyEtherDelta = useGameStore((state) => state.applyEtherDelta);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const playerEther = useGameStore((state) => state.resources.etherPts ?? 0);
  const relics = useGameStore((state) => state.relics);
  const maxHp = useGameStore((state) => state.maxHp);
  const payload = useMemo(() => buildBattlePayload(activeBattle, playerEther, relics, maxHp), [activeBattle, playerEther, relics, maxHp]);
  const frameKey = activeBattle ? `${activeBattle.nodeId}-${activeBattle.kind}` : "idle";

  const [devToolsOpen, setDevToolsOpen] = useState(false);

  // Alt+D 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setDevToolsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBattleResult = useCallback(
    ({ result, playerEther, deltaEther, playerHp, playerMaxHp }) => {
      const finalResult = result === "victory" ? "victory" : "defeat";

      if (typeof deltaEther === "number" && deltaEther !== 0) {
        applyEtherDelta(deltaEther);
      } else if (typeof playerEther === "number") {
        const current = useGameStore.getState().resources.etherPts ?? 0;
        const diff = playerEther - current;
        if (diff) applyEtherDelta(diff);
      }
      resolveBattle({
        result: finalResult,
        etherPts: playerEther,
        playerHp: playerHp, // 실제 전투 결과 체력 전달
        playerMaxHp: playerMaxHp
      });
    },
    [applyEtherDelta, resolveBattle],
  );

  if (!activeBattle) return null;

  return (
    <div className="battle-fullscreen" key={frameKey}>
      <LegacyBattleApp
        initialPlayer={payload?.player}
        initialEnemy={payload?.enemy}
        playerEther={playerEther}
        onBattleResult={handleBattleResult}
      />

      <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
    </div>
  );
}
