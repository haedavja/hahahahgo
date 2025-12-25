/**
 * CharacterSheet.tsx
 *
 * 캐릭터 시트 컴포넌트
 * 분리된 모듈: CardManagementModal, useCharacterSheet
 */

import { FC, useState, MouseEvent } from "react";
import { useCharacterSheet } from "./useCharacterSheet";
import { CardManagementModal } from "./CardManagementModal";

interface Ego {
  name: string;
  effects?: Record<string, number>;
}

interface ReflectionInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  finalProbability: number;
}

interface CharacterSheetProps {
  onClose: () => void;
  showAllCards?: boolean;
}

export const CharacterSheet: FC<CharacterSheetProps> = ({ onClose, showAllCards = false }) => {
  const {
    currentHp,
    maxHp,
    currentEnergy,
    maxEnergy,
    speed,
    power,
    agility,
    playerInsight,
    playerTraits,
    playerEgos,
    traitCounts,
    formatTraitEffect,
    activeReflectionsInfo,
    maxMainSlots,
    maxSubSlots,
    mainSpecials,
    subSpecials,
    specialMode,
    setSpecialMode,
    displayedCards,
    showOwnedCards,
    setShowOwnedCards,
    handleCardClick,
  } = useCharacterSheet({ showAllCards });

  // 자아 툴팁 상태
  const [showEgoTooltip, setShowEgoTooltip] = useState(false);
  const [egoTooltipPosition, setEgoTooltipPosition] = useState({ x: 0, y: 0 });

  const effectLabels: Record<string, string | null> = {
    playerStrength: '힘',
    maxHp: '체력',
    playerHp: null,
    playerInsight: '통찰',
    extraSubSpecialSlots: '보조슬롯',
    playerMaxSpeedBonus: '속도',
    playerEnergyBonus: '행동력',
  };

  return (
    <div
      className="dungeon-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <div
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{
          width: "960px",
          maxHeight: "85vh",
          background: "rgba(8, 11, 19, 0.98)",
          borderRadius: "16px",
          border: "1px solid rgba(118, 134, 185, 0.5)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          padding: "24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          color: "#9fb6ff",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", margin: 0, color: "#fff" }}>캐릭터 창</h2>
            <div style={{ fontSize: "13px", opacity: 0.75, marginTop: "4px", color: "#9fb6ff" }}>
              주특기 / 보조특기 카드 선택
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setShowOwnedCards(true)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #22c55e",
                background: "rgba(34, 197, 94, 0.2)",
                color: "#22c55e",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              🃏 보유 카드
            </button>
            <button
              type="button"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                borderRadius: "8px",
                border: "1px solid rgba(118, 134, 185, 0.5)",
                background: "rgba(8, 11, 19, 0.95)",
                color: "#fca5a5",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>

        {/* 스탯 패널 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>체력</span>
            <span style={{ fontWeight: 600, color: "#fff" }}>{currentHp} / {maxHp}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>에너지</span>
            <span style={{ fontWeight: 600, color: "#67e8f9" }}>{currentEnergy} / {maxEnergy}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>속도</span>
            <span style={{ fontWeight: 600, color: "#7dd3fc" }}>{speed}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>힘</span>
            <span style={{ fontWeight: 600, color: power >= 0 ? "#fbbf24" : "#ef4444" }}>{power}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>민첩</span>
            <span style={{ fontWeight: 600, color: agility >= 0 ? "#34d399" : "#ef4444" }}>{agility}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>통찰</span>
            <span style={{ fontWeight: 700, color: "#a78bfa" }}>{playerInsight}</span>
          </div>
        </div>

        {/* 개성 목록 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>획득한 개성</span>
          </div>
          {playerTraits && playerTraits.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.4, color: "#fbbf24" }}>
              {Object.entries(traitCounts).map(([traitId, count]) => (
                <li key={traitId}>{formatTraitEffect(traitId, count as number)}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>아직 각성한 개성이 없습니다.</div>
          )}
        </div>

        {/* 자아 목록 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
            position: "relative",
          }}
          onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
            if (playerEgos && playerEgos.length > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              setEgoTooltipPosition({ x: rect.right + 10, y: rect.top });
              setShowEgoTooltip(true);
            }
          }}
          onMouseLeave={() => setShowEgoTooltip(false)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>자아</span>
            {playerEgos && playerEgos.length > 0 && (
              <span style={{ opacity: 0.5, fontSize: "12px" }}>hover로 성찰 확인</span>
            )}
          </div>
          {playerEgos && playerEgos.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.6, color: "#fde68a" }}>
              {playerEgos.map((ego: Ego | string, idx: number) => {
                const egoName = typeof ego === 'object' ? ego.name : ego;
                const egoKey = typeof ego === 'object' ? `${ego.name}-${idx}` : ego;
                const egoEffects = typeof ego === 'object' ? ego.effects : null;

                const effectText = egoEffects ? Object.entries(egoEffects)
                  .filter(([key]) => effectLabels[key])
                  .map(([key, value]) => `${effectLabels[key]}+${value}`)
                  .join(' ') : '';

                return (
                  <li key={egoKey}>
                    {egoName}
                    {effectText && (
                      <span style={{ color: "#86efac", fontSize: "12px", marginLeft: "8px" }}>
                        ({effectText})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>아직 자아가 없습니다.</div>
          )}
        </div>

        {/* 성찰 툴팁 */}
        {showEgoTooltip && activeReflectionsInfo.length > 0 && (
          <div
            style={{
              position: "fixed",
              left: egoTooltipPosition.x,
              top: egoTooltipPosition.y,
              background: "rgba(15, 20, 30, 0.98)",
              border: "1px solid rgba(253, 230, 138, 0.6)",
              borderRadius: "8px",
              padding: "16px 20px",
              zIndex: 9999,
              minWidth: "320px",
              maxWidth: "400px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fde68a", marginBottom: "12px", borderBottom: "1px solid rgba(253, 230, 138, 0.3)", paddingBottom: "8px" }}>
              ✨ 활성화된 성찰
            </div>
            <div style={{ fontSize: "16px", lineHeight: 1.8 }}>
              {activeReflectionsInfo.map((r: ReflectionInfo) => (
                <div key={r.id} style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#fde68a" }}>{r.emoji} {r.name}</span>
                  <span style={{ color: "#9ca3af", marginLeft: "8px" }}>
                    매 턴 {Math.round(r.finalProbability * 100)}% 확률로 {r.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 슬롯 현황 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
          }}
        >
          <div style={{ fontSize: "14px", opacity: 0.9, color: "#9fb6ff", display: "flex", justifyContent: "space-between" }}>
            <span>주특기: <b style={{ color: "#f5d76e" }}>{mainSpecials.length} / {maxMainSlots}</b></span>
            <span>보조특기: <b style={{ color: "#7dd3fc" }}>{subSpecials.length} / {maxSubSlots}</b></span>
          </div>
        </div>
      </div>

      {/* 카드 관리 모달 */}
      {showOwnedCards && (
        <CardManagementModal
          onClose={() => setShowOwnedCards(false)}
          specialMode={specialMode}
          setSpecialMode={setSpecialMode}
          mainSpecials={mainSpecials}
          subSpecials={subSpecials}
          maxMainSlots={maxMainSlots}
          maxSubSlots={maxSubSlots}
          displayedCards={displayedCards}
          showAllCards={showAllCards}
          onCardClick={handleCardClick}
        />
      )}
    </div>
  );
};
