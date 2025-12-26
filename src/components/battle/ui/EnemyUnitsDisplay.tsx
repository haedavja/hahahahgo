/**
 * EnemyUnitsDisplay.tsx
 *
 * 다중 적 유닛 표시 및 타겟팅 UI
 * 각 유닛은 개별 HP/방어력을 가지며 클릭으로 타겟 선택 가능
 */

import { FC } from 'react';
import { TokenDisplay } from './TokenDisplay';
import type { PreviewDamage, EnemyUnitUI as Unit } from '../../../types';

interface UnitPreviewDamage extends PreviewDamage {}

interface EnemyUnitsDisplayProps {
  units?: Unit[];
  selectedTargetUnit: number | null;
  onSelectUnit: (unitId: number) => void;
  previewDamage: PreviewDamage;
  perUnitPreviewDamage?: Record<number, UnitPreviewDamage>;
  dulledLevel?: number;
  phase: string;
  enemyHit: boolean;
  enemyBlockAnim: boolean;
  soulShatter: boolean;
  enemyEtherValue?: number;
  enemyEtherCapacity?: number;
  enemyTransferPulse?: boolean;
  formatCompactValue?: (value: number) => string;
  enemyBlock?: number;
  enemyDef?: boolean;
  distributionMode?: boolean;
  damageDistribution?: Record<number, boolean>;
  totalDistributableDamage?: number;
  onUpdateDistribution?: (unitId: number, isTargeted: boolean) => void;
  onConfirmDistribution?: () => void;
  onCancelDistribution?: () => void;
}

export const EnemyUnitsDisplay: FC<EnemyUnitsDisplayProps> = ({
  units = [],
  selectedTargetUnit,
  onSelectUnit,
  previewDamage,
  perUnitPreviewDamage = {},
  dulledLevel = 0,
  phase,
  enemyHit,
  enemyBlockAnim,
  soulShatter,
  enemyEtherValue = 0,
  enemyEtherCapacity = 300,
  enemyTransferPulse = false,
  formatCompactValue,
  enemyBlock = 0,
  enemyDef = false,
  distributionMode = false,
  damageDistribution = {},
  totalDistributableDamage = 0,
  onUpdateDistribution,
  onConfirmDistribution,
  onCancelDistribution,
}) => {
  if (!units || units.length === 0) return null;

  // 살아있는 유닛만 표시
  const aliveUnits = units.filter(u => u.hp > 0);

  if (aliveUnits.length === 0) return null;

  // 유닛이 1개면 기존 방식 유지 (선택 불필요)
  const showTargeting = aliveUnits.length > 1;

  // 선택된 타겟 수
  const selectedTargetCount = Object.values(damageDistribution).filter(v => v === true).length;

  // 에테르 스케일 계산
  const enemySoulScale = Math.max(0.4, Math.min(1.3, enemyEtherCapacity > 0 ? enemyEtherValue / enemyEtherCapacity : 1));

  return (
    <>
      {/* 유닛 목록 - 에테르 구슬 왼쪽 */}
      <div className="enemy-units-container" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'fixed',
        top: '420px',
        right: '550px',
        zIndex: 100,
        maxWidth: '320px',
      }}>
      {aliveUnits.map((unit, idx) => {
        const isSelected = unit.unitId === selectedTargetUnit;
        const isTargetable = phase === 'select' || phase === 'respond';
        // 유닛별 예상 피해량 조회 (perUnitPreviewDamage가 있으면 사용, 없으면 선택된 유닛에만 표시)
        const unitPreview = perUnitPreviewDamage[unit.unitId];
        const showDamage = isTargetable && unitPreview && unitPreview.value > 0;
        const hideVitals = dulledLevel >= 3;

        return (
          <div
            key={unit.unitId}
            className={`enemy-unit ${isSelected ? 'selected' : ''} ${showTargeting && isTargetable ? 'targetable' : ''}`}
            onClick={() => showTargeting && isTargetable && onSelectUnit(unit.unitId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              background: isSelected
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(30, 41, 59, 0.8)',
              border: isSelected
                ? '2px solid #ef4444'
                : '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '12px',
              cursor: showTargeting && isTargetable ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              boxShadow: isSelected
                ? '0 0 20px rgba(239, 68, 68, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              transform: soulShatter && isSelected ? 'scale(0.95)' : 'scale(1)',
              opacity: soulShatter && isSelected ? 0.7 : 1,
            }}
          >
            {/* 유닛 이모지 */}
            <div
              className={`unit-emoji ${enemyHit && isSelected ? 'hit-animation' : ''}`}
              style={{
                fontSize: '48px',
                filter: unit.hp <= 0 ? 'grayscale(1)' : 'none',
              }}
            >
              {unit.emoji || '👾'}
            </div>

            {/* 유닛 정보 */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              {/* 이름 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#e2e8f0',
                }}>
                  {unit.name}
                  {(unit.count ?? 0) > 1 && (
                    <span style={{
                      marginLeft: '6px',
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                    }}>
                      ×{unit.count}
                    </span>
                  )}
                </span>
                {isSelected && showTargeting && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    🎯 TARGET
                  </span>
                )}
              </div>

              {/* HP/방어력 텍스트 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
                fontSize: '0.9rem',
              }}>
                {showDamage && (
                  <span
                    className={`${unitPreview.lethal ? 'lethal' : ''} ${unitPreview.overkill ? 'overkill' : ''}`}
                    style={{ color: '#fbbf24', fontWeight: '600' }}
                  >
                    🗡️-{unitPreview.value}
                    {unitPreview.lethal && (unitPreview.overkill ? '☠️' : '💀')}
                  </span>
                )}
                {/* 개별 유닛 방어력 표시 (다중 유닛 시), 공유 방어력 fallback (단일 유닛 시) */}
                {!hideVitals && ((unit.block || 0) > 0 || (showTargeting === false && enemyBlock > 0)) && (
                  <span
                    className={enemyBlockAnim && isSelected ? 'block-animation' : ''}
                    style={{ color: '#60a5fa', fontWeight: '600' }}
                  >
                    🛡️{showTargeting ? (unit.block || 0) : (unit.block || enemyBlock || 0)}
                  </span>
                )}
                <span style={{ color: '#f87171', fontWeight: '600' }}>
                  ❤️ {hideVitals ? '??' : `${unit.hp}/${unit.maxHp}`}
                </span>
              </div>

              {/* HP 바 */}
              <div
                className="hp-bar-enhanced"
                style={{
                  width: '100%',
                  height: '10px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '5px',
                }}
              >
                <div
                  className="hp-fill"
                  style={{
                    width: hideVitals ? '0%' : `${(unit.hp / unit.maxHp) * 100}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
                {/* 개별 유닛 방어력 표시 (HP바에 오버레이) */}
                {!hideVitals && (() => {
                  const displayBlock = showTargeting ? (unit.block || 0) : (unit.block || enemyBlock || 0);
                  return displayBlock > 0 && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${Math.min((displayBlock / unit.maxHp) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                      borderRight: '2px solid #60a5fa',
                      transition: 'width 0.3s ease',
                    }} />
                  );
                })()}
              </div>

              {/* 토큰 표시 */}
              <div style={{ marginTop: '6px', minHeight: '24px' }}>
                <TokenDisplay entity={unit} position="enemy" />
              </div>

              {/* 타겟 선택 UI */}
              {distributionMode && (() => {
                const isTargeted = damageDistribution[unit.unitId] === true;
                return (
                  <div style={{
                    marginTop: '8px',
                  }}>
                    <button
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onUpdateDistribution?.(unit.unitId, !isTargeted);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: isTargeted ? '2px solid #fbbf24' : '1px solid #94a3b8',
                        borderRadius: '8px',
                        background: isTargeted ? 'rgba(251, 191, 36, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                        color: isTargeted ? '#fbbf24' : '#94a3b8',
                        fontSize: '0.9rem',
                        fontWeight: isTargeted ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isTargeted ? '🎯 타겟 지정됨' : '⬜ 타겟 지정'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })}

        {/* 타겟팅 힌트 */}
        {!distributionMode && showTargeting && (phase === 'select' || phase === 'respond') && (
          <div style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '4px 8px',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '6px',
          }}>
            💡 클릭하여 공격 대상 선택
          </div>
        )}

        {/* 타겟 선택 컨트롤 패널 */}
        {distributionMode && (
          <div style={{
            padding: '12px',
            background: 'rgba(30, 41, 59, 0.9)',
            borderRadius: '8px',
            border: '1px solid rgba(251, 191, 36, 0.5)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                🎯 타겟 선택
              </span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: selectedTargetCount > 0 ? '#22c55e' : '#fbbf24',
              }}>
                선택됨: {selectedTargetCount}개
              </span>
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={onCancelDistribution}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #94a3b8',
                  borderRadius: '6px',
                  background: 'rgba(100, 116, 139, 0.3)',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={onConfirmDistribution}
                disabled={selectedTargetCount === 0}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #22c55e',
                  borderRadius: '6px',
                  background: selectedTargetCount > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.2)',
                  color: selectedTargetCount > 0 ? '#22c55e' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: selectedTargetCount > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                확인 ✓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 에테르 구슬 (영혼) - 단일 유닛과 같은 위치 */}
      <div
        className={`soul-orb ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
        title={dulledLevel >= 3 ? '?? / ??' : `${enemyEtherValue.toLocaleString()} / ${enemyEtherCapacity.toLocaleString()}`}
        style={{
          position: 'fixed',
          top: '470px',
          right: '300px',
        }}
      >
        <div
          className={`soul-orb-shell ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
          style={{ transform: `scale(${enemySoulScale})` }}
        />
        <div className="soul-orb-content">
          <div className="soul-orb-value">
            {dulledLevel >= 3 ? '??' : (formatCompactValue ? formatCompactValue(enemyEtherValue) : enemyEtherValue)}
          </div>
          <div className="soul-orb-label">SOUL</div>
        </div>
      </div>
    </>
  );
};
