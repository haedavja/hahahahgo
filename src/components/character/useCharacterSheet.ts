/**
 * @file useCharacterSheet.js
 * @description 캐릭터 시트 상태 관리 훅
 *
 * ## 기능
 * - 덱/카드 관리
 * - 개성 효과 계산
 * - 성찰 시스템 연동
 */

import { useState, useEffect, useMemo } from "react";
import { useGameStore } from "../../state/gameStore";
import { CARDS } from "../battle/battleData";
import { calculatePassiveEffects } from "../../lib/relicEffects";
import { getReflectionsByEgos, getTraitCountBonus } from "../../data/reflections";
import type { Card } from "../../types/core";
import type { PlayerEgo } from "../../state/slices/types";
import type { ReflectionInfo } from "../../types/ui";

/** 훅 파라미터 타입 */
interface UseCharacterSheetProps {
  showAllCards?: boolean;
}

/** 표시용 카드 (UI 확장 속성 포함) */
interface DisplayCard extends Card {
  _displayKey: string;
  _type?: 'main' | 'sub' | 'owned';
}

const TRAIT_EFFECTS: Record<string, { label: string; value: number }> = {
  용맹함: { label: "힘", value: 1 },
  굳건함: { label: "최대 체력", value: 10 },
  냉철함: { label: "통찰", value: 1 },
  철저함: { label: "보조 슬롯", value: 1 },
  열정적: { label: "최대 속도", value: 5 },
  활력적: { label: "행동력", value: 1 },
};

// 모든 카드를 사용 가능하도록 변경
const availableCards = CARDS.map((card, index) => ({
  id: card.id,
  slot: index + 1,
  name: card.name,
  type: card.type,
  speed: card.speedCost,
  ap: card.actionCost,
  desc: `${card.damage ? `공격력 ${card.damage}${card.hits ? ` x${card.hits}` : ''}` : ''}${card.block ? `방어력 ${card.block}` : ''}${'counter' in card && card.counter !== undefined ? ` 반격 ${card.counter}` : ''}`,
  traits: card.traits || [],
  description: card.description,
}));

export function useCharacterSheet({ showAllCards = false }: UseCharacterSheetProps) {
  const characterBuild = useGameStore((state) => state.characterBuild);
  const updateCharacterBuild = useGameStore((state) => state.updateCharacterBuild);
  const playerHp = useGameStore((state) => state.playerHp);
  const maxHp = useGameStore((state) => state.maxHp);
  const playerStrength = useGameStore((state) => state.playerStrength);
  const playerAgility = useGameStore((state) => state.playerAgility);
  const playerEnergyBonus = useGameStore((state) => state.playerEnergyBonus || 0);
  const playerMaxSpeedBonus = useGameStore((state) => state.playerMaxSpeedBonus || 0);
  const extraSubSpecialSlots = useGameStore((state) => state.extraSubSpecialSlots || 0);
  const playerInsight = useGameStore((state) => state.playerInsight || 0);
  const playerTraits = useGameStore((state) => state.playerTraits ?? []);
  const playerEgos = useGameStore((state) => state.playerEgos ?? []);
  const relics = useGameStore((state) => state.relics);

  // 상징 패시브 효과 계산
  const passiveEffects = useMemo(() => {
    return calculatePassiveEffects(relics || []);
  }, [relics]);

  // 활성화된 성찰 및 확률 계산 (획득한 자아 기준)
  const activeReflectionsInfo = useMemo(() => {
    if (!playerEgos || playerEgos.length === 0) return [];
    const activeReflections = getReflectionsByEgos(playerEgos);
    const probabilityBonus = getTraitCountBonus(playerTraits.length);

    return activeReflections.map(r => ({
      ...r,
      finalProbability: Math.min(1, (r.probability ?? 0) + probabilityBonus)
    }));
  }, [playerTraits, playerEgos]);

  // 현재 스탯
  const currentHp = playerHp;
  const baseEnergy = 6 + playerEnergyBonus;
  const currentEnergy = baseEnergy;
  const maxEnergy = baseEnergy + passiveEffects.maxEnergy;
  const speed = 30 + playerMaxSpeedBonus;
  const power = playerStrength || 0;
  const agility = playerAgility || 0;

  // 슬롯 제한 (상징 효과 반영)
  const maxMainSlots = 1 + passiveEffects.mainSpecialSlots;
  const maxSubSlots = 2 + passiveEffects.subSpecialSlots + extraSubSpecialSlots;

  const traitCounts = useMemo(() => {
    return (playerTraits || []).reduce((acc: Record<string, number>, t: string) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
  }, [playerTraits]);

  const formatTraitEffect = (traitId: string, count: number): string => {
    const effect = TRAIT_EFFECTS[traitId];
    if (!effect) return count > 1 ? `${traitId} (x${count})` : traitId;
    const total = effect.value * count;
    return `${traitId} ${count > 1 ? `(x${count})` : ""} (${effect.label} +${total})`;
  };

  const [specialMode, setSpecialMode] = useState<'main' | 'sub'>("main");
  const [mainSpecials, setMainSpecials] = useState<string[]>([]);
  const [subSpecials, setSubSpecials] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showOwnedCards, setShowOwnedCards] = useState(false);

  // 컴포넌트 마운트 시 한 번만 스토어에서 로드
  useEffect(() => {
    if (!initialized && characterBuild) {
      setMainSpecials(characterBuild.mainSpecials || []);
      setSubSpecials(characterBuild.subSpecials || []);
      setInitialized(true);
    }
  }, [initialized, characterBuild]);

  // 선택 사항이 변경될 때마다 게임 스토어에 저장
  useEffect(() => {
    if (initialized) {
      updateCharacterBuild(mainSpecials, subSpecials);
    }
  }, [mainSpecials, subSpecials, initialized, updateCharacterBuild]);

  // 카드 개수 카운트 헬퍼
  const getCardCount = (cardId: string, list: string[]) => list.filter((id: string) => id === cardId).length;

  // 대기 카드 (상점 구매 등)
  const ownedCards = characterBuild?.ownedCards || [];

  // 표시할 카드 목록
  const displayedCards = useMemo(() => {
    if (showAllCards) {
      return availableCards.map((card, idx) => ({ ...card, _displayKey: `all_${card.id}_${idx}` }));
    }
    const result: DisplayCard[] = [];
    mainSpecials.forEach((cardId: string, idx: number) => {
      const card = CARDS.find((c: Card) => c.id === cardId);
      if (card) result.push({ ...card, _displayKey: `main_${cardId}_${idx}`, _type: 'main' as const });
    });
    subSpecials.forEach((cardId: string, idx: number) => {
      const card = CARDS.find((c: Card) => c.id === cardId);
      if (card) result.push({ ...card, _displayKey: `sub_${cardId}_${idx}`, _type: 'sub' as const });
    });
    const usedCounts: Record<string, number> = {};
    [...mainSpecials, ...subSpecials].forEach((cardId: string) => {
      usedCounts[cardId] = (usedCounts[cardId] || 0) + 1;
    });
    const shownCounts: Record<string, number> = {};
    ownedCards.forEach((cardId: string, idx: number) => {
      shownCounts[cardId] = (shownCounts[cardId] || 0) + 1;
      const used = usedCounts[cardId] || 0;
      if (shownCounts[cardId] <= (ownedCards.filter((id: string) => id === cardId).length - used)) {
        const card = CARDS.find((c: Card) => c.id === cardId);
        if (card) result.push({ ...card, _displayKey: `owned_${cardId}_${idx}`, _type: 'owned' as const });
      }
    });
    return result;
  }, [showAllCards, mainSpecials, subSpecials, ownedCards]);

  // 좌클릭: 추가, 우클릭: 제거
  const handleCardClick = (cardId: string, isRightClick = false) => {
    const ownedCount = ownedCards.filter((id: string) => id === cardId).length;
    const usedInMain = mainSpecials.filter((id: string) => id === cardId).length;
    const usedInSub = subSpecials.filter((id: string) => id === cardId).length;
    const totalUsed = usedInMain + usedInSub;

    if (specialMode === "main") {
      setMainSpecials((prev) => {
        if (isRightClick) {
          const idx = prev.indexOf(cardId);
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        }
        if (prev.length >= maxMainSlots) return prev;
        if (totalUsed >= ownedCount) return prev;
        return [...prev, cardId];
      });
    } else {
      setSubSpecials((prev) => {
        if (isRightClick) {
          const idx = prev.indexOf(cardId);
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        }
        if (prev.length >= maxSubSlots) return prev;
        if (totalUsed >= ownedCount) return prev;
        return [...prev, cardId];
      });
    }
  };

  return {
    // 스탯
    currentHp,
    maxHp,
    currentEnergy,
    maxEnergy,
    speed,
    power,
    agility,
    playerInsight,
    // 개성/자아
    playerTraits,
    playerEgos,
    traitCounts,
    formatTraitEffect,
    activeReflectionsInfo,
    // 슬롯
    maxMainSlots,
    maxSubSlots,
    mainSpecials,
    subSpecials,
    // 모드
    specialMode,
    setSpecialMode,
    // 카드
    displayedCards,
    showOwnedCards,
    setShowOwnedCards,
    handleCardClick,
  };
}
