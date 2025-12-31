/**
 * @file GrowthPyramidModal.tsx
 * @description 피라미드 성장 시스템 메인 UI
 *
 * 구조: 개성 → 에토스/파토스(번갈아) → 자아 → 로고스
 */

import { useState, memo, useCallback } from 'react';
import { useGameStore } from '../../state/gameStore';
import { useShallow } from 'zustand/shallow';
import { ETHOS, type Ethos } from '../../data/growth/ethosData';
import { PATHOS, MAX_EQUIPPED_PATHOS, type Pathos } from '../../data/growth/pathosData';
import { LOGOS, type LogosType } from '../../data/growth/logosData';
import { IDENTITIES, type IdentityType } from '../../data/growth/identityData';
import { getPyramidLevelFromTraits, PERSONALITY_TRAITS, TRAIT_EFFECT_DESC } from '../../data/reflections';
import { initialGrowthState, getAvailableEthos, getAvailablePathos, canSelectIdentity } from '../../state/slices/growthSlice';

interface GrowthPyramidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrowthPyramidModal = memo(function GrowthPyramidModal({
  isOpen,
  onClose,
}: GrowthPyramidModalProps) {
  const {
    playerTraits,
    growth,
    selectEthos,
    selectPathos,
    selectIdentity,
    equipPathos,
    updatePyramidLevel,
  } = useGameStore(
    useShallow((state) => ({
      playerTraits: state.playerTraits || [],
      growth: state.growth || initialGrowthState,
      selectEthos: state.selectEthos,
      selectPathos: state.selectPathos,
      selectIdentity: state.selectIdentity,
      equipPathos: state.equipPathos,
      updatePyramidLevel: state.updatePyramidLevel,
    }))
  );

  const [activeTab, setActiveTab] = useState<'pyramid' | 'ethos' | 'pathos' | 'identity' | 'logos'>('pyramid');

  if (!isOpen) return null;

  const pyramidLevel = growth.pyramidLevel;
  const pendingSelection = growth.pendingSelection;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }}
      >
        <header>
          <h3>피라미드 성장</h3>
          <small>개성을 모아 에토스/파토스를 해금하고, 자아와 로고스에 도달하세요</small>
        </header>

        {/* 탭 네비게이션 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {(['pyramid', 'ethos', 'pathos', 'identity', 'logos'] as const).map((tab) => (
            <button
              key={tab}
              className="btn"
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'rgba(96, 165, 250, 0.3)' : undefined,
                border: activeTab === tab ? '1px solid rgba(96, 165, 250, 0.5)' : undefined,
              }}
            >
              {tab === 'pyramid' && '피라미드'}
              {tab === 'ethos' && '에토스'}
              {tab === 'pathos' && '파토스'}
              {tab === 'identity' && '자아'}
              {tab === 'logos' && '로고스'}
            </button>
          ))}
        </div>

        {/* 현재 상태 요약 */}
        <div style={{
          padding: '10px',
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span>개성: <strong style={{ color: '#fde68a' }}>{playerTraits.length}개</strong></span>
            <span>피라미드 Lv: <strong style={{ color: '#60a5fa' }}>{pyramidLevel}</strong></span>
            <span>에토스: <strong style={{ color: '#86efac' }}>{growth.unlockedEthos.length}개</strong></span>
            <span>파토스: <strong style={{ color: '#f472b6' }}>{growth.unlockedPathos.length}개</strong></span>
            {growth.identities.length > 0 && (
              <span>자아: <strong style={{ color: '#fbbf24' }}>
                {growth.identities.map(id => IDENTITIES[id].name).join(', ')}
              </strong></span>
            )}
          </div>
          {pendingSelection && (
            <div style={{ marginTop: '8px', color: '#fbbf24' }}>
              선택 대기: {pendingSelection === 'ethos' ? '에토스' : '파토스'} 선택 필요!
            </div>
          )}
        </div>

        {/* 탭 내용 */}
        {activeTab === 'pyramid' && (
          <PyramidView
            pyramidLevel={pyramidLevel}
            playerTraits={playerTraits}
            growth={growth}
          />
        )}
        {activeTab === 'ethos' && (
          <EthosView
            growth={growth}
            onSelect={selectEthos}
            canSelect={pendingSelection === 'ethos'}
          />
        )}
        {activeTab === 'pathos' && (
          <PathosView
            growth={growth}
            onSelect={selectPathos}
            onEquip={equipPathos}
            canSelect={pendingSelection === 'pathos'}
          />
        )}
        {activeTab === 'identity' && (
          <IdentityView
            growth={growth}
            onSelect={selectIdentity}
          />
        )}
        {activeTab === 'logos' && (
          <LogosView growth={growth} />
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
});

// 피라미드 뷰
function PyramidView({
  pyramidLevel,
  playerTraits,
  growth,
}: {
  pyramidLevel: number;
  playerTraits: string[];
  growth: typeof initialGrowthState;
}) {
  const maxDisplayLevel = Math.max(7, pyramidLevel + 2);

  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#e2e8f0' }}>피라미드 진행 상황</h4>

      {/* 피라미드 시각화 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        marginBottom: '16px',
      }}>
        {/* 로고스 (정점) */}
        <div style={{
          padding: '8px 16px',
          background: pyramidLevel >= 7 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(71, 85, 105, 0.3)',
          border: pyramidLevel >= 7 ? '2px solid #fbbf24' : '1px solid #475569',
          borderRadius: '6px',
          fontSize: '12px',
          color: pyramidLevel >= 7 ? '#fbbf24' : '#9ca3af',
        }}>
          로고스 (Lv7+)
        </div>

        {/* 자아 */}
        <div style={{
          padding: '8px 24px',
          background: pyramidLevel >= 5 ? 'rgba(244, 114, 182, 0.3)' : 'rgba(71, 85, 105, 0.3)',
          border: pyramidLevel >= 5 ? '2px solid #f472b6' : '1px solid #475569',
          borderRadius: '6px',
          fontSize: '12px',
          color: pyramidLevel >= 5 ? '#f472b6' : '#9ca3af',
        }}>
          자아 (Lv5+) - {growth.identities.length > 0 ? growth.identities.map(id => IDENTITIES[id].name).join('/') : '미선택'}
        </div>

        {/* 피라미드 레벨들 */}
        {Array.from({ length: maxDisplayLevel }, (_, i) => maxDisplayLevel - i).map((level) => {
          const isEthos = level % 2 === 1;
          const isUnlocked = pyramidLevel >= level;
          const isCurrent = pyramidLevel === level - 1;

          return (
            <div
              key={level}
              style={{
                padding: '6px',
                width: `${100 + level * 30}px`,
                textAlign: 'center',
                background: isUnlocked
                  ? isEthos ? 'rgba(134, 239, 172, 0.2)' : 'rgba(244, 114, 182, 0.2)'
                  : 'rgba(71, 85, 105, 0.2)',
                border: isCurrent
                  ? '2px dashed #fbbf24'
                  : isUnlocked
                    ? `1px solid ${isEthos ? '#86efac' : '#f472b6'}`
                    : '1px solid #475569',
                borderRadius: '4px',
                fontSize: '11px',
                color: isUnlocked ? (isEthos ? '#86efac' : '#f472b6') : '#6b7280',
              }}
            >
              Lv{level} - {isEthos ? '에토스' : '파토스'}
              {isCurrent && ' (다음)'}
            </div>
          );
        })}

        {/* 개성 (기반) */}
        <div style={{
          padding: '8px',
          width: `${100 + (maxDisplayLevel + 1) * 30}px`,
          textAlign: 'center',
          background: 'rgba(253, 230, 138, 0.2)',
          border: '1px solid #fde68a',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#fde68a',
        }}>
          개성: {playerTraits.length}개 (다음 레벨: {(pyramidLevel + 1) * 2}개 필요)
        </div>
      </div>

      {/* 보유 개성 목록 */}
      <div>
        <h5 style={{ marginBottom: '8px', color: '#9ca3af' }}>보유 개성</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {playerTraits.length === 0 ? (
            <span style={{ color: '#6b7280', fontSize: '13px' }}>개성이 없습니다. 휴식 노드에서 각성하세요.</span>
          ) : (
            playerTraits.map((trait, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(253, 230, 138, 0.2)',
                  border: '1px solid rgba(253, 230, 138, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#fde68a',
                }}
              >
                {trait}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 에토스 뷰
function EthosView({
  growth,
  onSelect,
  canSelect,
}: {
  growth: typeof initialGrowthState;
  onSelect: (id: string) => void;
  canSelect: boolean;
}) {
  const availableEthos = getAvailableEthos(growth);
  const unlockedEthos = growth.unlockedEthos.map(id => ETHOS[id]).filter(Boolean);

  return (
    <div>
      <h4 style={{ marginBottom: '8px', color: '#86efac' }}>에토스 (패시브 스킬)</h4>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        해금된 에토스는 상시 적용됩니다.
      </p>

      {canSelect && availableEthos.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ marginBottom: '8px', color: '#fbbf24' }}>선택 가능한 에토스</h5>
          <div style={{ display: 'grid', gap: '8px' }}>
            {availableEthos.map((ethos) => (
              <EthosCard key={ethos.id} ethos={ethos} onSelect={onSelect} selectable />
            ))}
          </div>
        </div>
      )}

      <h5 style={{ marginBottom: '8px', color: '#9ca3af' }}>해금된 에토스 ({unlockedEthos.length})</h5>
      {unlockedEthos.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '13px' }}>아직 해금된 에토스가 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {unlockedEthos.map((ethos) => (
            <EthosCard key={ethos.id} ethos={ethos} selectable={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function EthosCard({
  ethos,
  onSelect,
  selectable,
}: {
  ethos: Ethos;
  onSelect?: (id: string) => void;
  selectable: boolean;
}) {
  const typeColor = ethos.type === 'gun' ? '#f472b6' : ethos.type === 'sword' ? '#60a5fa' : '#9ca3af';
  const typeLabel = ethos.type === 'gun' ? '총기' : ethos.type === 'sword' ? '검술' : '공용';

  return (
    <div
      onClick={() => selectable && onSelect?.(ethos.id)}
      style={{
        padding: '10px',
        background: selectable ? 'rgba(134, 239, 172, 0.1)' : 'rgba(30, 41, 59, 0.8)',
        border: selectable ? '1px solid rgba(134, 239, 172, 0.4)' : '1px solid rgba(71, 85, 105, 0.5)',
        borderRadius: '6px',
        cursor: selectable ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{ethos.name}</span>
        <span style={{ fontSize: '11px', color: typeColor }}>{typeLabel}</span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{ethos.description}</p>
    </div>
  );
}

// 파토스 뷰
function PathosView({
  growth,
  onSelect,
  onEquip,
  canSelect,
}: {
  growth: typeof initialGrowthState;
  onSelect: (id: string) => void;
  onEquip: (ids: string[]) => void;
  canSelect: boolean;
}) {
  const [selectedForEquip, setSelectedForEquip] = useState<string[]>(growth.equippedPathos);
  const availablePathos = getAvailablePathos(growth);
  const unlockedPathos = growth.unlockedPathos.map(id => PATHOS[id]).filter(Boolean);

  const handleToggleEquip = (id: string) => {
    if (selectedForEquip.includes(id)) {
      setSelectedForEquip(prev => prev.filter(x => x !== id));
    } else if (selectedForEquip.length < MAX_EQUIPPED_PATHOS) {
      setSelectedForEquip(prev => [...prev, id]);
    }
  };

  const handleSaveEquip = () => {
    onEquip(selectedForEquip);
  };

  return (
    <div>
      <h4 style={{ marginBottom: '8px', color: '#f472b6' }}>파토스 (액티브 스킬)</h4>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        전투 전 최대 {MAX_EQUIPPED_PATHOS}개를 장착하여 사용할 수 있습니다.
      </p>

      {canSelect && availablePathos.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ marginBottom: '8px', color: '#fbbf24' }}>선택 가능한 파토스</h5>
          <div style={{ display: 'grid', gap: '8px' }}>
            {availablePathos.map((pathos) => (
              <PathosCard key={pathos.id} pathos={pathos} onSelect={onSelect} selectable />
            ))}
          </div>
        </div>
      )}

      <h5 style={{ marginBottom: '8px', color: '#9ca3af' }}>
        해금된 파토스 ({unlockedPathos.length}) - 장착: {selectedForEquip.length}/{MAX_EQUIPPED_PATHOS}
      </h5>
      {unlockedPathos.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '13px' }}>아직 해금된 파토스가 없습니다.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
            {unlockedPathos.map((pathos) => (
              <PathosCard
                key={pathos.id}
                pathos={pathos}
                selectable={false}
                equipped={selectedForEquip.includes(pathos.id)}
                onToggleEquip={handleToggleEquip}
              />
            ))}
          </div>
          <button className="btn" onClick={handleSaveEquip}>
            장착 저장
          </button>
        </>
      )}
    </div>
  );
}

function PathosCard({
  pathos,
  onSelect,
  selectable,
  equipped,
  onToggleEquip,
}: {
  pathos: Pathos;
  onSelect?: (id: string) => void;
  selectable: boolean;
  equipped?: boolean;
  onToggleEquip?: (id: string) => void;
}) {
  const typeColor = pathos.type === 'gun' ? '#f472b6' : pathos.type === 'sword' ? '#60a5fa' : '#9ca3af';
  const typeLabel = pathos.type === 'gun' ? '총기' : pathos.type === 'sword' ? '검술' : '공용';

  return (
    <div
      onClick={() => {
        if (selectable) onSelect?.(pathos.id);
        else if (onToggleEquip) onToggleEquip(pathos.id);
      }}
      style={{
        padding: '10px',
        background: equipped
          ? 'rgba(244, 114, 182, 0.2)'
          : selectable
            ? 'rgba(244, 114, 182, 0.1)'
            : 'rgba(30, 41, 59, 0.8)',
        border: equipped
          ? '2px solid #f472b6'
          : selectable
            ? '1px solid rgba(244, 114, 182, 0.4)'
            : '1px solid rgba(71, 85, 105, 0.5)',
        borderRadius: '6px',
        cursor: selectable || onToggleEquip ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
          {equipped && '[ 장착 ] '}{pathos.name}
        </span>
        <span style={{ fontSize: '11px', color: typeColor }}>
          {typeLabel} {pathos.cooldown && `(쿨다운 ${pathos.cooldown}턴)`}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{pathos.description}</p>
    </div>
  );
}

// 자아 뷰
function IdentityView({
  growth,
  onSelect,
}: {
  growth: typeof initialGrowthState;
  onSelect: (id: IdentityType) => void;
}) {
  const canSelect = canSelectIdentity(growth);

  return (
    <div>
      <h4 style={{ marginBottom: '8px', color: '#fbbf24' }}>자아 (총잡이 / 검잡이)</h4>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        피라미드 Lv3 이상에서 자아를 선택할 수 있습니다. 하이브리드 가능!
      </p>

      {!canSelect && (
        <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
          피라미드 Lv3 이상이 필요합니다. (현재: Lv{growth.pyramidLevel})
        </p>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {(Object.keys(IDENTITIES) as IdentityType[]).map((id) => {
          const identity = IDENTITIES[id];
          const isSelected = growth.identities.includes(id);

          return (
            <div
              key={id}
              onClick={() => canSelect && !isSelected && onSelect(id)}
              style={{
                padding: '12px',
                background: isSelected
                  ? 'rgba(251, 191, 36, 0.2)'
                  : canSelect
                    ? 'rgba(30, 41, 59, 0.8)'
                    : 'rgba(30, 41, 59, 0.5)',
                border: isSelected
                  ? '2px solid #fbbf24'
                  : '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '8px',
                cursor: canSelect && !isSelected ? 'pointer' : 'default',
                opacity: canSelect || isSelected ? 1 : 0.6,
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                {identity.emoji} <strong style={{ color: isSelected ? '#fbbf24' : '#e2e8f0' }}>{identity.name}</strong>
                {isSelected && <span style={{ marginLeft: '8px', color: '#86efac' }}>선택됨</span>}
              </div>
              <p style={{ fontSize: '13px', color: '#9ca3af' }}>{identity.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 로고스 뷰
function LogosView({ growth }: { growth: typeof initialGrowthState }) {
  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#fbbf24' }}>로고스 (피라미드 정점)</h4>

      {/* 공용 로고스 */}
      <LogosSection
        title="공용"
        logos={LOGOS.common}
        currentLevel={growth.logosLevels.common}
        available={growth.pyramidLevel >= 3}
      />

      {/* 건카타 */}
      <LogosSection
        title="건카타 (총잡이)"
        logos={LOGOS.gunkata}
        currentLevel={growth.logosLevels.gunkata}
        available={growth.identities.includes('gunslinger')}
        locked={!growth.identities.includes('gunslinger')}
      />

      {/* 배틀 왈츠 */}
      <LogosSection
        title="배틀 왈츠 (검잡이)"
        logos={LOGOS.battleWaltz}
        currentLevel={growth.logosLevels.battleWaltz}
        available={growth.identities.includes('swordsman')}
        locked={!growth.identities.includes('swordsman')}
      />
    </div>
  );
}

function LogosSection({
  title,
  logos,
  currentLevel,
  available,
  locked,
}: {
  title: string;
  logos: typeof LOGOS.common;
  currentLevel: number;
  available: boolean;
  locked?: boolean;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h5 style={{
        marginBottom: '8px',
        color: locked ? '#6b7280' : '#e2e8f0',
      }}>
        {title} {locked && '(자아 선택 필요)'}
      </h5>
      <div style={{ display: 'grid', gap: '8px' }}>
        {logos.levels.map((level) => {
          const isUnlocked = currentLevel >= level.level;

          return (
            <div
              key={level.level}
              style={{
                padding: '10px',
                background: isUnlocked
                  ? 'rgba(251, 191, 36, 0.2)'
                  : 'rgba(30, 41, 59, 0.5)',
                border: isUnlocked
                  ? '1px solid rgba(251, 191, 36, 0.5)'
                  : '1px solid rgba(71, 85, 105, 0.3)',
                borderRadius: '6px',
                opacity: locked ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: isUnlocked ? '#fbbf24' : '#6b7280',
                }}>
                  Lv{level.level} - {level.name}
                </span>
                {isUnlocked && <span style={{ fontSize: '11px', color: '#86efac' }}>해금</span>}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {level.effect.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GrowthPyramidModal;
