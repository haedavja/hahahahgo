/**
 * CharacterSheet.tsx
 *
 * 캐릭터 시트 컴포넌트
 * 분리된 모듈: CardManagementModal, useCharacterSheet
 * 최적화: React.memo + 스타일 상수 추출 + useCallback
 */

import { FC, useState, MouseEvent, memo, useCallback, useMemo, lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import { useCharacterSheet } from "./useCharacterSheet";

// Lazy loading for heavy modals
const CardManagementModal = lazy(() => import("./CardManagementModal").then(m => ({ default: m.CardManagementModal })));
const GrowthPyramidModal = lazy(() => import("../growth/GrowthPyramidModal").then(m => ({ default: m.GrowthPyramidModal })));
import { TRAITS } from "../battle/battleData";
import type { CharacterEgo as Ego, ReflectionInfo } from '../../types';

// =====================
// 스타일 상수
// =====================

const OVERLAY_STYLE: CSSProperties = {
  zIndex: 9999,
  pointerEvents: "auto"
};

const MODAL_CONTAINER_STYLE: CSSProperties = {
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
  color: "#9fb6ff"
};

const HEADER_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  marginBottom: "16px"
};

const TITLE_STYLE: CSSProperties = {
  fontSize: "24px",
  margin: 0,
  color: "#fff"
};

const SUBTITLE_STYLE: CSSProperties = {
  fontSize: "13px",
  opacity: 0.75,
  marginTop: "4px",
  color: "#9fb6ff"
};

const BUTTON_GROUP_STYLE: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center"
};

const OWNED_CARD_BUTTON_STYLE: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  borderRadius: "8px",
  border: "1px solid #22c55e",
  background: "rgba(34, 197, 94, 0.2)",
  color: "#22c55e",
  cursor: "pointer",
  fontWeight: 600
};

const GROWTH_BUTTON_STYLE: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  borderRadius: "8px",
  border: "1px solid #a78bfa",
  background: "rgba(167, 139, 250, 0.2)",
  color: "#a78bfa",
  cursor: "pointer",
  fontWeight: 600
};

const CLOSE_BUTTON_STYLE: CSSProperties = {
  padding: "6px 12px",
  fontSize: "13px",
  borderRadius: "8px",
  border: "1px solid rgba(118, 134, 185, 0.5)",
  background: "rgba(8, 11, 19, 0.95)",
  color: "#fca5a5",
  cursor: "pointer"
};

const PANEL_STYLE: CSSProperties = {
  borderRadius: "12px",
  padding: "12px 16px",
  marginBottom: "16px",
  background: "rgba(5, 8, 13, 0.92)",
  border: "1px solid rgba(118, 134, 185, 0.4)"
};

const PANEL_NO_MARGIN_STYLE: CSSProperties = {
  borderRadius: "12px",
  padding: "12px 16px",
  background: "rgba(5, 8, 13, 0.92)",
  border: "1px solid rgba(118, 134, 185, 0.4)"
};

const STAT_ROW_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
  fontSize: "14px"
};

const STAT_ROW_LAST_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "14px"
};

const LABEL_STYLE: CSSProperties = {
  opacity: 0.8
};

const TRAIT_LIST_STYLE: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  lineHeight: 1.4,
  color: "#fbbf24"
};

const EGO_LIST_STYLE: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  lineHeight: 1.6,
  color: "#fde68a"
};

const EMPTY_TEXT_STYLE: CSSProperties = {
  color: "#9ca3af",
  fontSize: "0.9rem"
};

const SLOT_STATUS_STYLE: CSSProperties = {
  fontSize: "14px",
  opacity: 0.9,
  color: "#9fb6ff",
  display: "flex",
  justifyContent: "space-between"
};

const EFFECT_TEXT_STYLE: CSSProperties = {
  color: "#86efac",
  fontSize: "12px",
  marginLeft: "8px"
};

const EGO_HOVER_HINT_STYLE: CSSProperties = {
  opacity: 0.5,
  fontSize: "12px"
};

// 추가 스타일 상수
const HP_VALUE_STYLE: CSSProperties = {
  fontWeight: 600,
  color: "#fff"
};

const ENERGY_VALUE_STYLE: CSSProperties = {
  fontWeight: 600,
  color: "#67e8f9"
};

const SPEED_VALUE_STYLE: CSSProperties = {
  fontWeight: 600,
  color: "#7dd3fc"
};

const INSIGHT_VALUE_STYLE: CSSProperties = {
  fontWeight: 700,
  color: "#a78bfa"
};

const STORED_TRAITS_HINT_STYLE: CSSProperties = {
  fontSize: '12px',
  color: '#86efac',
  opacity: 0.8
};

const TRAITS_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '8px'
};

const TRAIT_BADGE_STYLE: CSSProperties = {
  padding: '6px 12px',
  background: 'rgba(134, 239, 172, 0.15)',
  border: '1px solid #86efac',
  borderRadius: '6px',
  fontSize: '13px'
};

const TRAIT_NAME_STYLE: CSSProperties = {
  color: '#86efac',
  fontWeight: 600
};

const TOOLTIP_TITLE_STYLE: CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#fde68a",
  marginBottom: "12px",
  borderBottom: "1px solid rgba(253, 230, 138, 0.3)",
  paddingBottom: "8px"
};

const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.8
};

const TOOLTIP_ITEM_STYLE: CSSProperties = {
  marginBottom: "8px"
};

const TOOLTIP_NAME_STYLE: CSSProperties = {
  color: "#fde68a"
};

const TOOLTIP_DESC_STYLE: CSSProperties = {
  color: "#9ca3af",
  marginLeft: "8px"
};

// 효과 라벨 상수 (컴포넌트 외부)
const EFFECT_LABELS: Record<string, string | null> = {
  playerStrength: '힘',
  maxHp: '체력',
  playerHp: null,
  playerInsight: '통찰',
  extraSubSpecialSlots: '보조슬롯',
  playerMaxSpeedBonus: '속도',
  playerEnergyBonus: '행동력',
};

interface CharacterSheetProps {
  onClose: () => void;
  showAllCards?: boolean;
}

export const CharacterSheet: FC<CharacterSheetProps> = memo(({ onClose, showAllCards = false }) => {
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
    storedTraits,
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

  // 성장 모달 상태
  const [showGrowthModal, setShowGrowthModal] = useState(false);

  // 이벤트 핸들러 메모이제이션
  const handleContainerClick = useCallback((e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
  }, []);

  const handleShowOwnedCards = useCallback(() => setShowOwnedCards(true), [setShowOwnedCards]);
  const handleShowGrowth = useCallback(() => setShowGrowthModal(true), []);
  const handleCloseGrowth = useCallback(() => setShowGrowthModal(false), []);

  const handleCloseClick = useCallback((e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handleCloseModal = useCallback(() => setShowOwnedCards(false), [setShowOwnedCards]);

  const handleEgoMouseEnter = useCallback((e: MouseEvent<HTMLDivElement>): void => {
    if (playerEgos && playerEgos.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      setEgoTooltipPosition({ x: rect.right + 10, y: rect.top });
      setShowEgoTooltip(true);
    }
  }, [playerEgos]);

  const handleEgoMouseLeave = useCallback(() => setShowEgoTooltip(false), []);

  // 동적 스타일 메모이제이션
  const powerStyle = useMemo((): CSSProperties => ({
    fontWeight: 600,
    color: power >= 0 ? "#fbbf24" : "#ef4444"
  }), [power]);

  const agilityStyle = useMemo((): CSSProperties => ({
    fontWeight: 600,
    color: agility >= 0 ? "#34d399" : "#ef4444"
  }), [agility]);

  const egoPanelStyle = useMemo((): CSSProperties => ({
    ...PANEL_STYLE,
    position: "relative"
  }), []);

  const tooltipStyle = useMemo((): CSSProperties => ({
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
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
  }), [egoTooltipPosition.x, egoTooltipPosition.y]);

  return (
    <div className="dungeon-modal-overlay" onClick={onClose} style={OVERLAY_STYLE}>
      <div onClick={handleContainerClick} style={MODAL_CONTAINER_STYLE}>
        {/* 헤더 */}
        <div style={HEADER_STYLE}>
          <div>
            <h2 style={TITLE_STYLE}>캐릭터 창</h2>
            <div style={SUBTITLE_STYLE}>주특기 / 보조특기 카드 선택</div>
          </div>
          <div style={BUTTON_GROUP_STYLE}>
            <button type="button" onClick={handleShowOwnedCards} style={OWNED_CARD_BUTTON_STYLE}>
              🃏 보유 카드
            </button>
            <button type="button" onClick={handleShowGrowth} style={GROWTH_BUTTON_STYLE}>
              🔺 성장
            </button>
            <button type="button" onClick={handleCloseClick} style={CLOSE_BUTTON_STYLE}>
              닫기
            </button>
          </div>
        </div>

        {/* 스탯 패널 */}
        <div style={PANEL_STYLE}>
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>체력</span>
            <span style={HP_VALUE_STYLE}>{currentHp} / {maxHp}</span>
          </div>
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>에너지</span>
            <span style={ENERGY_VALUE_STYLE}>{currentEnergy} / {maxEnergy}</span>
          </div>
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>속도</span>
            <span style={SPEED_VALUE_STYLE}>{speed}</span>
          </div>
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>힘</span>
            <span style={powerStyle}>{power}</span>
          </div>
          <div style={STAT_ROW_LAST_STYLE}>
            <span style={LABEL_STYLE}>민첩</span>
            <span style={agilityStyle}>{agility}</span>
          </div>
          <div style={STAT_ROW_LAST_STYLE}>
            <span style={LABEL_STYLE}>통찰</span>
            <span style={INSIGHT_VALUE_STYLE}>{playerInsight}</span>
          </div>
        </div>

        {/* 개성 목록 */}
        <div style={PANEL_STYLE}>
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>획득한 개성</span>
          </div>
          {playerTraits && playerTraits.length > 0 ? (
            <ul style={TRAIT_LIST_STYLE}>
              {Object.entries(traitCounts).map(([traitId, count]) => (
                <li key={traitId}>{formatTraitEffect(traitId, count as number)}</li>
              ))}
            </ul>
          ) : (
            <div style={EMPTY_TEXT_STYLE}>아직 각성한 개성이 없습니다.</div>
          )}
        </div>

        {/* 자아 목록 */}
        <div
          style={egoPanelStyle}
          onMouseEnter={handleEgoMouseEnter}
          onMouseLeave={handleEgoMouseLeave}
        >
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>자아</span>
            {playerEgos && playerEgos.length > 0 && (
              <span style={EGO_HOVER_HINT_STYLE}>hover로 성찰 확인</span>
            )}
          </div>
          {playerEgos && playerEgos.length > 0 ? (
            <ul style={EGO_LIST_STYLE}>
              {playerEgos.map((ego: Ego | string, idx: number) => {
                const egoName = typeof ego === 'object' ? ego.name : ego;
                const egoKey = typeof ego === 'object' ? `${ego.name}-${idx}` : ego;
                const egoEffects = typeof ego === 'object' ? ego.effects : null;

                const effectText = egoEffects ? Object.entries(egoEffects)
                  .filter(([key]) => EFFECT_LABELS[key])
                  .map(([key, value]) => `${EFFECT_LABELS[key]}+${value}`)
                  .join(' ') : '';

                return (
                  <li key={egoKey}>
                    {egoName}
                    {effectText && (
                      <span style={EFFECT_TEXT_STYLE}>({effectText})</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={EMPTY_TEXT_STYLE}>아직 자아가 없습니다.</div>
          )}
        </div>

        {/* 보유 특성 (카드 특화에 사용 가능) */}
        <div style={PANEL_STYLE}>
          <div style={STAT_ROW_STYLE}>
            <span style={LABEL_STYLE}>✨ 보유 특성</span>
            <span style={STORED_TRAITS_HINT_STYLE}>
              카드 특화에 사용 가능
            </span>
          </div>
          {storedTraits && storedTraits.length > 0 ? (
            <div style={TRAITS_CONTAINER_STYLE}>
              {storedTraits.map((traitId: string) => {
                const trait = TRAITS[traitId as keyof typeof TRAITS];
                return (
                  <div
                    key={traitId}
                    style={TRAIT_BADGE_STYLE}
                    title={trait?.description || ''}
                  >
                    <span style={TRAIT_NAME_STYLE}>+{trait?.name || traitId}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={EMPTY_TEXT_STYLE}>전투에서 특성을 획득하세요.</div>
          )}
        </div>

        {/* 성찰 툴팁 */}
        {showEgoTooltip && activeReflectionsInfo.length > 0 && (
          <div style={tooltipStyle}>
            <div style={TOOLTIP_TITLE_STYLE}>
              ✨ 활성화된 성찰
            </div>
            <div style={TOOLTIP_CONTENT_STYLE}>
              {activeReflectionsInfo.map((r: ReflectionInfo) => (
                <div key={r.id} style={TOOLTIP_ITEM_STYLE}>
                  <span style={TOOLTIP_NAME_STYLE}>{r.emoji} {r.name}</span>
                  <span style={TOOLTIP_DESC_STYLE}>
                    매 턴 {Math.round(r.finalProbability * 100)}% 확률로 {r.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 슬롯 현황 */}
        <div style={PANEL_NO_MARGIN_STYLE}>
          <div style={SLOT_STATUS_STYLE}>
            <span>주특기: <b style={{ color: "#f5d76e" }}>{mainSpecials.length} / {maxMainSlots}</b></span>
            <span>보조특기: <b style={{ color: "#7dd3fc" }}>{subSpecials.length} / {maxSubSlots}</b></span>
          </div>
        </div>
      </div>

      {/* 카드 관리 모달 */}
      {showOwnedCards && (
        <Suspense fallback={null}>
          <CardManagementModal
            onClose={handleCloseModal}
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
        </Suspense>
      )}

      {/* 성장 모달 */}
      {showGrowthModal && (
        <Suspense fallback={null}>
          <GrowthPyramidModal
            isOpen={showGrowthModal}
            onClose={handleCloseGrowth}
          />
        </Suspense>
      )}
    </div>
  );
});
