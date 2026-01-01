/**
 * EnemyHpBar.tsx
 *
 * 적 HP 바와 상태 표시 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { TokenDisplay } from './TokenDisplay';
import { calculateGraceSlots, PRAYERS } from '../../../data/monsterEther';
import type { MonsterGraceState } from '../../../data/monsterEther';
import type {
  PreviewDamage,
  TokenState,
  TokenEntity,
  HpBarEnemy as Enemy,
  GroupedEnemyMember,
  PhaseBattle as Battle
} from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginRight: '0',
  paddingRight: '0',
  gap: '40px',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none'
};

const INNER_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '0',
  margin: '0',
  borderRadius: '0',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  position: 'fixed',
  top: '530px',
  right: '640px',
  pointerEvents: 'none'
};

const HP_AREA_STYLE: CSSProperties = {
  textAlign: 'right',
  position: 'relative',
  paddingRight: '8px',
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '14px'
};

const HP_COLUMN_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '8px'
};

const HP_BAR_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
  minWidth: '200px'
};

const HP_TEXT_BASE: CSSProperties = {
  position: 'absolute',
  top: '-30px',
  right: '0',
  color: '#f87171',
  fontSize: '1.25rem',
  fontWeight: 'bold',
  textAlign: 'right',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '8px',
  whiteSpace: 'nowrap'
};

const HP_BAR_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  width: '200px',
  paddingTop: '4px'
};

const HP_BAR_STYLE: CSSProperties = {
  width: '200px',
  height: '12px',
  position: 'relative',
  overflow: 'hidden'
};

const TOKEN_CONTAINER_STYLE: CSSProperties = {
  minHeight: '40px'
};

const FROZEN_BADGE_STYLE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  background: 'rgba(100, 200, 255, 0.2)',
  border: '1px solid rgba(100, 200, 255, 0.6)',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#7dd3fc',
  fontWeight: 600,
  animation: 'frozenPulse 1.5s ease-in-out infinite',
  cursor: 'help',
  width: 'fit-content'
};

const FROZEN_COUNT_STYLE: CSSProperties = {
  padding: '0 4px',
  background: 'rgba(100, 200, 255, 0.3)',
  borderRadius: '3px',
  fontSize: '11px'
};

const FROZEN_TOOLTIP_STYLE: CSSProperties = {
  position: 'absolute',
  left: '100%',
  top: '50%',
  transform: 'translateY(-50%)',
  marginLeft: '8px',
  padding: '12px 16px',
  background: 'rgba(15, 23, 42, 0.98)',
  border: '1px solid rgba(100, 200, 255, 0.5)',
  borderRadius: '6px',
  fontSize: '15px',
  color: '#e2e8f0',
  whiteSpace: 'nowrap',
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 0.15s, visibility 0.15s',
  zIndex: 1000,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
};

const ENEMY_MEMBERS_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '8px',
  marginTop: '-88px'
};

const ENEMY_NAME_STYLE: CSSProperties = {
  fontSize: '0.95rem',
  color: '#e2e8f0',
  fontWeight: 600,
  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  background: 'rgba(0,0,0,0.3)',
  padding: '2px 8px',
  borderRadius: '4px',
  transform: 'translateX(220px)'
};

const SOUL_ORB_STYLE: CSSProperties = {
  position: 'fixed',
  top: '470px',
  right: '300px'
};

const GRACE_ORB_STYLE: CSSProperties = {
  position: 'fixed',
  top: '470px',
  right: '200px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px'
};

const GRACE_ORB_SHELL_STYLE: CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b, #d97706)',
  boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.3s ease'
};

const GRACE_ORB_VALUE_STYLE: CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 'bold',
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.5)'
};

const GRACE_ORB_LABEL_STYLE: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: '#fbbf24',
  textTransform: 'uppercase',
  letterSpacing: '0.1em'
};

const GRACE_STATUS_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  marginTop: '4px'
};

const GRACE_BADGE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 6px',
  background: 'rgba(251, 191, 36, 0.2)',
  border: '1px solid rgba(251, 191, 36, 0.5)',
  borderRadius: '4px',
  fontSize: '11px',
  color: '#fbbf24'
};

/**
 * 적 HP 바 컴포넌트 Props
 *
 * 적의 체력, 방어력, 에테르, 토큰 상태를 표시합니다.
 * 피격/방어/소울 쉐터/오버드라이브 시 애니메이션 효과가 적용됩니다.
 */
interface EnemyHpBarProps {
  /** 현재 전투 상태 */
  battle: Battle;
  /** 데미지 미리보기 정보 */
  previewDamage: PreviewDamage;
  /** 둔화 레벨 (체력/에테르 숨김 조건) */
  dulledLevel: number;
  /** 적 상태 (hp, maxHp, block, tokens 등) */
  enemy: Enemy;
  /** 피격 애니메이션 활성화 여부 */
  enemyHit: boolean;
  /** 방어 애니메이션 활성화 여부 */
  enemyBlockAnim: boolean;
  /** 소울 쉐터 효과 활성화 여부 (에테르 탈취) */
  soulShatter: boolean;
  /** 그룹화된 적 구성원 목록 */
  groupedEnemyMembers: GroupedEnemyMember[];
  /** 오버드라이브 플래시 효과 활성화 여부 */
  enemyOverdriveFlash: boolean;
  /** 적 에테르 수치 */
  enemyEtherValue: number;
  /** 에테르 전송 펄스 효과 활성화 여부 */
  enemyTransferPulse: boolean;
  /** 소울 이미지 스케일 (크기 변화) */
  enemySoulScale: number;
  /** 숫자 축약 포맷 함수 (예: 1000 → 1K) */
  formatCompactValue: (value: number) => string;
  /** 빙결된 순서 */
  frozenOrder: number;
  /** 몬스터 우아함 상태 (특수 상태) */
  graceState?: MonsterGraceState;
}

export const EnemyHpBar: FC<EnemyHpBarProps> = memo(({
  battle,
  previewDamage,
  dulledLevel,
  enemy,
  enemyHit,
  enemyBlockAnim,
  soulShatter,
  groupedEnemyMembers,
  enemyOverdriveFlash,
  enemyEtherValue,
  enemyTransferPulse,
  enemySoulScale,
  formatCompactValue,
  frozenOrder,
  graceState
}) => {
  // HP 텍스트 계산 메모이제이션
  const { hpText, blockText, showDamage, hideEnemyVitals } = useMemo(() => {
    const hide = dulledLevel >= 3;
    return {
      hideEnemyVitals: hide,
      hpText: hide ? '??' : `${enemy.hp}/${enemy.maxHp}`,
      blockText: hide ? '??' : (enemy.block > 0 ? `${enemy.block}` : null),
      showDamage: (battle.phase === 'select' || battle.phase === 'respond') && previewDamage.value > 0
    };
  }, [dulledLevel, enemy.hp, enemy.maxHp, enemy.block, battle.phase, previewDamage.value]);

  // HP 텍스트 스타일
  const hpTextStyle = useMemo((): CSSProperties => ({
    ...HP_TEXT_BASE,
    transition: 'opacity 0.4s ease, transform 0.4s ease',
    opacity: soulShatter ? 0 : 1,
    transform: soulShatter ? 'scale(0.9)' : 'scale(1)'
  }), [soulShatter]);

  // 블록 오버레이 스타일
  const blockOverlayStyle = useMemo((): CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${Math.min((enemy.block / enemy.maxHp) * 100, 100)}%`,
    background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
    borderRight: '2px solid #60a5fa'
  }), [enemy.block, enemy.maxHp]);

  const soulOrbTitle = useMemo(() => {
    return dulledLevel >= 3 ? '?? / ??' : `${(enemyEtherValue || 0).toLocaleString()} / ${((enemy?.etherCapacity ?? enemyEtherValue) || 0).toLocaleString()}`;
  }, [dulledLevel, enemyEtherValue, enemy?.etherCapacity]);

  return (
    <div style={CONTAINER_STYLE} data-testid="enemy-hp-bar-container">
      <div style={INNER_CONTAINER_STYLE}>
        <div style={HP_AREA_STYLE} data-testid="enemy-hp-area">
          <div style={HP_COLUMN_STYLE}>
            <div style={HP_BAR_WRAPPER_STYLE}>
              {/* HP/방어력 텍스트 */}
              <div className={enemyHit ? 'hit-animation' : ''} style={hpTextStyle} data-testid="enemy-hp-text">
                {showDamage && (
                  <span className={`${previewDamage.lethal ? 'lethal' : ''} ${previewDamage.overkill ? 'overkill' : ''}`} style={{ color: '#fbbf24' }}>
                    🗡️-{previewDamage.value}{previewDamage.lethal && (previewDamage.overkill ? '☠️' : '💀')}
                  </span>
                )}
                {blockText && <span className={enemyBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa' }}>🛡️{blockText}</span>}
                <span>❤️ {hpText}</span>
              </div>
              <div style={HP_BAR_CONTAINER_STYLE}>
                <div className="hp-bar-enhanced mb-1" style={HP_BAR_STYLE}>
                  <div className="hp-fill" style={{ width: `${hideEnemyVitals ? 0 : (enemy.hp / enemy.maxHp) * 100}%` }}></div>
                  {enemy.block > 0 && !hideEnemyVitals && (
                    <div style={blockOverlayStyle}></div>
                  )}
                </div>
                {/* 토큰 표시 */}
                <div style={TOKEN_CONTAINER_STYLE}>
                  <TokenDisplay entity={enemy} position="enemy" />
                </div>
                {/* 빙결 상태이상 표시 */}
                {frozenOrder > 0 && (
                  <div className="enemy-status-frozen" style={FROZEN_BADGE_STYLE}>
                    <span>❄️</span>
                    <span style={FROZEN_COUNT_STYLE}>x{frozenOrder}</span>
                    {/* 툴팁 */}
                    <div className="status-tooltip" style={FROZEN_TOOLTIP_STYLE}>
                      <div style={{ fontWeight: 700, color: '#7dd3fc', marginBottom: '8px', fontSize: '16px' }}>❄️ 빙결 (x{frozenOrder})</div>
                      <div style={{ lineHeight: 1.5 }}>{frozenOrder}턴 동안 플레이어 카드가<br/>모두 먼저 발동합니다.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={ENEMY_MEMBERS_STYLE}>
              {groupedEnemyMembers.map((member, idx) => {
                const rawName = member.name || '몬스터';
                const displayName = member.count > 1 ? `${rawName} x${member.count}` : rawName;
                return (
                  <div key={`${rawName}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={ENEMY_NAME_STYLE}>
                      {displayName}
                    </span>
                    <div
                      className={`character-display ${soulShatter ? 'soul-shatter-target' : ''} ${enemyOverdriveFlash ? 'overdrive-burst' : ''}`}
                      style={{
                        fontSize: idx === 0 ? '64px' : '56px',
                        filter: idx === 0 ? 'none' : 'brightness(0.95)',
                        transform: 'translateX(220px)'
                      }}
                    >
                      {member.emoji || '👹'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div
        className={`soul-orb ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
        title={soulOrbTitle}
        style={SOUL_ORB_STYLE}>
        <div className={`soul-orb-shell ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`} style={{ transform: `scale(${enemySoulScale})` }} />
        <div className="soul-orb-content">
          <div className="soul-orb-value">{dulledLevel >= 3 ? '??' : formatCompactValue(enemyEtherValue)}</div>
          <div className="soul-orb-label">SOUL</div>
        </div>
      </div>
      {/* 은총 오브 */}
      {graceState && graceState.gracePts > 0 && (
        <div style={GRACE_ORB_STYLE}>
          <div style={GRACE_ORB_SHELL_STYLE}>
            <span style={GRACE_ORB_VALUE_STYLE}>
              {dulledLevel >= 3 ? '?' : calculateGraceSlots(graceState.gracePts)}
            </span>
          </div>
          <div style={GRACE_ORB_LABEL_STYLE}>GRACE</div>
          {/* 상태 표시 */}
          <div style={GRACE_STATUS_STYLE}>
            {graceState.soulShield > 0 && (
              <div style={GRACE_BADGE_STYLE} title="영혼 보호막">
                🛡️ x{graceState.soulShield}
              </div>
            )}
            {graceState.blessingTurns > 0 && (
              <div style={GRACE_BADGE_STYLE} title={`가호: ${graceState.blessingBonus}% 추가 은총`}>
                ✨ {graceState.blessingTurns}턴
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
