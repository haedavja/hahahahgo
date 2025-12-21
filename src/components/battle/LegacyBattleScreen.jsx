import { useMemo, useCallback, useState, useEffect } from "react";
import { useGameStore } from "../../state/gameStore";
import { LegacyBattleApp } from "./LegacyBattleApp";
import { DevTools } from "../dev/DevTools";
import { calculatePassiveEffects, applyCombatStartEffects } from "../../lib/relicEffects";
import { ENEMIES } from "./battleData";

const buildBattlePayload = (battle, etherPts, relics, maxHp, playerInsight, playerEnergyBonus = 0, playerStrength = 0, playerMaxSpeedBonus = 0) => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;
  const enemyEtherCapacity = battle.enemyEtherCapacity ?? 300; // 기본 몬스터 에테르 소지량

  let enemyCount = battle.enemyCount ?? 1;
  let enemyName = battle.label ?? "Enemy";
  let enemyHp = initialEnemy?.hp ? Math.round(initialEnemy.hp) : 30;
  let enemyDeck = initialEnemy?.deck || [];

  let enemyComposition = [];

  // mixedEnemies: 새 ENEMY_GROUPS 시스템에서 제공하는 적 상세 정보
  // 같은 종류의 적을 유닛으로 묶어서 관리 (약탈자 x3 = 1유닛, 탈영병 x1 = 1유닛)
  let enemyUnits = [];

  if (battle.mixedEnemies && Array.isArray(battle.mixedEnemies) && battle.mixedEnemies.length > 0) {
    const mixedEnemies = battle.mixedEnemies;

    // 같은 종류의 적을 유닛으로 그룹화
    const unitMap = new Map();
    mixedEnemies.forEach(e => {
      const key = e.id || e.name;
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          id: e.id,
          name: e.name,
          emoji: e.emoji || "👾",
          count: 0,
          hp: 0,
          maxHp: 0,
          individualHp: e.hp || 40,
          individualMaxHp: e.maxHp || e.hp || 40,
          ether: 0,
          individualEther: e.ether || 100,
          deck: e.deck || [],
          cardsPerTurn: 0,
          individualCardsPerTurn: e.cardsPerTurn || 2,
          passives: e.passives || {},
          tier: e.tier || 1,
          isBoss: e.isBoss || false,
        });
      }
      const unit = unitMap.get(key);
      unit.count += 1;
      unit.hp += e.hp || 40;
      unit.maxHp += e.maxHp || e.hp || 40;
      unit.ether += e.ether || 100;
      unit.cardsPerTurn += e.cardsPerTurn || 2;
    });

    // Map을 배열로 변환하고 unitId 부여
    enemyUnits = Array.from(unitMap.values()).map((unit, idx) => ({
      ...unit,
      unitId: idx,
      block: 0,
      tokens: { permanent: [], turn: [], usage: [] },
    }));

    // 기존 호환성을 위한 값들
    enemyName = enemyUnits.map(u => u.count > 1 ? `${u.name}×${u.count}` : u.name).join(' ');
    enemyHp = enemyUnits.reduce((sum, u) => sum + u.hp, 0);
    enemyDeck = mixedEnemies.flatMap(e => e.deck || []);
    enemyCount = mixedEnemies.length;
    enemyComposition = enemyUnits.map(u => ({
      name: u.name,
      emoji: u.emoji,
      hp: u.hp,
      maxHp: u.maxHp,
      ether: u.ether,
      cardsPerTurn: u.cardsPerTurn,
      passives: u.passives,
      count: u.count,
    }));
  } else if (battle.enemies && Array.isArray(battle.enemies)) {
    // 레거시: enemies가 ID 배열인 경우
    const mixedEnemies = battle.enemies.map(id => ENEMIES.find(e => e.id === id)).filter(Boolean);
    if (mixedEnemies.length > 0) {
      // 같은 종류의 적을 유닛으로 그룹화
      const unitMap = new Map();
      mixedEnemies.forEach(e => {
        const key = e.id || e.name;
        if (!unitMap.has(key)) {
          unitMap.set(key, {
            id: e.id,
            name: e.name,
            emoji: e.emoji || "👾",
            count: 0,
            hp: 0,
            maxHp: 0,
            individualHp: e.hp || 40,
            deck: e.deck || [],
            cardsPerTurn: 0,
            individualCardsPerTurn: e.cardsPerTurn || 2,
            passives: e.passives || {},
            tier: e.tier || 1,
          });
        }
        const unit = unitMap.get(key);
        unit.count += 1;
        unit.hp += e.hp || 40;
        unit.maxHp += e.hp || 40;
        unit.cardsPerTurn += e.cardsPerTurn || 2;
      });

      enemyUnits = Array.from(unitMap.values()).map((unit, idx) => ({
        ...unit,
        unitId: idx,
        block: 0,
        tokens: { permanent: [], turn: [], usage: [] },
      }));

      enemyName = enemyUnits.map(u => u.count > 1 ? `${u.name}×${u.count}` : u.name).join(' ');
      enemyHp = enemyUnits.reduce((sum, u) => sum + u.hp, 0);
      enemyDeck = mixedEnemies.flatMap(e => e.deck);
      enemyCount = mixedEnemies.length;
      enemyComposition = enemyUnits.map(u => ({
        name: u.name,
        emoji: u.emoji,
        hp: u.hp,
        maxHp: u.maxHp,
        count: u.count,
      }));
    }
  } else {
    // 기본 폴백: 단일 유닛
    const baseEmoji = "👾";
    const singleName = battle.label ?? "Enemy";
    const singleHp = initialEnemy?.hp ?? 40;

    enemyUnits = [{
      unitId: 0,
      id: 'default',
      name: singleName,
      emoji: baseEmoji,
      count: enemyCount,
      hp: singleHp * enemyCount,
      maxHp: singleHp * enemyCount,
      individualHp: singleHp,
      deck: enemyDeck,
      cardsPerTurn: 2 * enemyCount,
      passives: {},
      tier: 1,
      block: 0,
      tokens: { permanent: [], turn: [], usage: [] },
    }];

    enemyName = enemyCount > 1 ? `${singleName} x${enemyCount}` : singleName;
    enemyComposition = [{ name: singleName, emoji: baseEmoji, hp: singleHp * enemyCount, maxHp: singleHp * enemyCount, count: enemyCount }];
  }

  // 상징 패시브 효과 계산
  const passiveEffects = calculatePassiveEffects(relics);
  // 행동력: 기본 6 + 활력 보너스 + 상징 패시브
  const baseEnergy = 6 + (playerEnergyBonus || 0) + (passiveEffects.maxEnergy || 0);
  const maxEnergy = baseEnergy;

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
  // 힘: 스토어 값 + 전투 시작 보너스 (패시브는 스토어에 반영된다고 가정)
  const startingStrength = (playerStrength || 0) + (combatStartEffects.strength || 0);
  const startingMaxSpeed = 30 + (playerMaxSpeedBonus || 0);

  return {
    player: {
      hp: startingHp,
      maxHp: maxHp, // gameStore의 maxHp 사용 (상징 효과가 이미 적용됨)
      energy: maxEnergy + combatStartEffects.energy, // 시작 에너지 = maxEnergy + 전투 시작 보너스
      maxEnergy: maxEnergy + combatStartEffects.energy,
      block: combatStartEffects.block, // 시작 방어력
      strength: startingStrength, // 시작 힘
      insight: playerInsight ?? 0, // 통찰
      maxSpeed: startingMaxSpeed,
      etherPts,
    },
    enemy: {
      name: enemyName,
      hp: enemyHp,
      maxHp: enemyHp,
      deck: enemyDeck,
      composition: enemyComposition,
      etherPts: enemyEtherCapacity,
      etherCapacity: enemyEtherCapacity,
      enemyCount: enemyCount,
      // 패시브는 첫 번째 적 기준, cardsPerTurn은 모든 유닛 합계
      passives: enemyComposition[0]?.passives || {},
      cardsPerTurn: enemyUnits.reduce((sum, u) => sum + (u.cardsPerTurn || 2), 0),
      ether: enemyComposition[0]?.ether || enemyEtherCapacity,
      // 다중 유닛 시스템: 같은 종류 적을 묶은 유닛 배열
      units: enemyUnits,
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
  const playerInsight = useGameStore((state) => state.playerInsight ?? 0);
  const playerEnergyBonus = useGameStore((state) => state.playerEnergyBonus ?? 0);
  const playerStrength = useGameStore((state) => state.playerStrength ?? 0);
  const playerMaxSpeedBonus = useGameStore((state) => state.playerMaxSpeedBonus ?? 0);
  const itemBuffs = useGameStore((state) => state.itemBuffs || {});

  // 아이템 버프 적용한 유효 스탯
  const effectiveStrength = playerStrength + (itemBuffs.strength || 0);
  const effectiveInsight = playerInsight + (itemBuffs.insight || 0);

  // 전투 시작 시의 통찰 값을 고정해 payload를 재생성하지 않도록 저장
  const [battleInsight, setBattleInsight] = useState(effectiveInsight || 0);
  useEffect(() => {
    if (activeBattle) {
      setBattleInsight(effectiveInsight || 0);
    }
  }, [activeBattle]);

  const payload = useMemo(() => {
    return buildBattlePayload(
      activeBattle,
      playerEther,
      relics,
      maxHp,
      battleInsight,
      playerEnergyBonus,
      effectiveStrength,
      playerMaxSpeedBonus
    );
  }, [activeBattle, playerEther, relics, maxHp, battleInsight, playerEnergyBonus, effectiveStrength, playerMaxSpeedBonus]);
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
        // 몬스터는 플레이어 에테르를 빼앗을 수 없음 - 음수 델타 무시
        if (deltaEther > 0) {
          applyEtherDelta(deltaEther);
        }
      } else if (typeof playerEther === "number") {
        const current = useGameStore.getState().resources.etherPts ?? 0;
        const diff = playerEther - current;
        // 몬스터는 플레이어 에테르를 빼앗을 수 없음 - 음수 diff 무시
        if (diff > 0) applyEtherDelta(diff);
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
    <div className="battle-fullscreen">
      <LegacyBattleApp
        initialPlayer={payload?.player}
        initialEnemy={payload?.enemy}
        playerEther={playerEther}
        liveInsight={effectiveInsight}
        onBattleResult={handleBattleResult}
      />

      <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
    </div>
  );
}
