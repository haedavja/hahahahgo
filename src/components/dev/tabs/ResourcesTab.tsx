/**
 * ResourcesTab.tsx
 * 자원 관리 탭
 */

import { useState, memo, useCallback, useMemo } from 'react';
import type { Resources } from '../../../types/core';

// 상수 정의
const PRESETS: Record<string, Resources> = {
  '풍족': { gold: 999, intel: 10, loot: 10, material: 10, etherPts: 50, memory: 200 },
  '초반': { gold: 50, intel: 2, loot: 1, material: 1, etherPts: 0, memory: 0 },
  '중반': { gold: 200, intel: 5, loot: 5, material: 3, etherPts: 10, memory: 50 },
  '후반': { gold: 500, intel: 8, loot: 8, material: 6, etherPts: 30, memory: 120 },
};

const STYLES = {
  header: { marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' } as const,
  currentBox: { padding: '12px', background: '#0f172a', borderRadius: '8px', marginBottom: '16px' } as const,
  currentLabel: { fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' } as const,
  currentRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' as const },
  resourceItem: { padding: '6px 12px', background: '#1e293b', borderRadius: '6px', border: '1px solid #334155' } as const,
  inputLabel: { display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#cbd5e1', textTransform: 'capitalize' as const } as const,
  input: { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.875rem' } as const,
  applyBtn: { width: '100%', padding: '12px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' } as const,
  subHeader: { color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' } as const,
  presetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } as const,
  presetBtn: { padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.875rem' } as const,
  restBtn: { background: 'rgba(253, 230, 138, 0.2)', border: '1px solid #fde68a' } as const,
} as const;

interface ResourcesTabProps {
  resources: Resources;
  setResources: (resources: Resources) => void;
  devOpenRest: () => void;
  awakenAtRest: (trait: string) => void;
  closeRest: () => void;
  devUnlockAllGrowth: () => void;
}

export const ResourcesTab = memo(function ResourcesTab({ resources, setResources, devOpenRest, awakenAtRest, closeRest, devUnlockAllGrowth }: ResourcesTabProps) {
  const [inputs, setInputs] = useState<Resources>(resources);

  // 핸들러 메모이제이션
  const applyResources = useCallback(() => {
    setResources(inputs);
  }, [inputs, setResources]);

  const handleInputChange = useCallback((key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  }, []);

  const handlePresetClick = useCallback((preset: Resources) => {
    setInputs(preset);
    setResources(preset);
  }, [setResources]);

  const handleAwakenBrave = useCallback(() => { devOpenRest(); awakenAtRest('brave'); }, [devOpenRest, awakenAtRest]);
  const handleAwakenSturdy = useCallback(() => { devOpenRest(); awakenAtRest('sturdy'); }, [devOpenRest, awakenAtRest]);
  const handleAwakenCold = useCallback(() => { devOpenRest(); awakenAtRest('cold'); }, [devOpenRest, awakenAtRest]);
  const handleAwakenThorough = useCallback(() => { devOpenRest(); awakenAtRest('thorough'); }, [devOpenRest, awakenAtRest]);
  const handleAwakenPassionate = useCallback(() => { devOpenRest(); awakenAtRest('passionate'); }, [devOpenRest, awakenAtRest]);
  const handleAwakenLively = useCallback(() => { devOpenRest(); awakenAtRest('lively'); }, [devOpenRest, awakenAtRest]);
  const handleAwakenRandom = useCallback(() => { devOpenRest(); awakenAtRest('random'); }, [devOpenRest, awakenAtRest]);

  // 리소스 키 메모이제이션
  const resourceKeys = useMemo(() => Object.keys(resources), [resources]);
  const resourceEntries = useMemo(() => Object.entries(resources), [resources]);
  const presetEntries = useMemo(() => Object.entries(PRESETS), []);

  return (
    <div>
      <h3 style={STYLES.header}>자원 직접 수정</h3>

      {/* 현재 자원 표시 */}
      <div style={STYLES.currentBox}>
        <div style={STYLES.currentLabel}>현재 자원:</div>
        <div style={STYLES.currentRow}>
          {resourceEntries.map(([key, value]: [string, number]) => (
            <div key={key} style={STYLES.resourceItem}>
              <span style={{ color: '#64748b' }}>{key}:</span>{' '}
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 폼 */}
      {resourceKeys.map((key: string) => (
        <div key={key} style={{ marginBottom: '12px' }}>
          <label style={STYLES.inputLabel}>
            {key}:
          </label>
          <input
            type="number"
            value={(inputs as unknown as Record<string, number>)[key]}
            onChange={(e) => handleInputChange(key, e.target.value)}
            style={STYLES.input}
          />
        </div>
      ))}

      <button onClick={applyResources} style={STYLES.applyBtn}>
        ✓ 적용
      </button>

      {/* 프리셋 버튼 */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={STYLES.subHeader}>프리셋:</h4>
        <div style={STYLES.presetGrid}>
          {presetEntries.map(([name, preset]) => (
            <button
              key={name}
              onClick={() => handlePresetClick(preset)}
              style={STYLES.presetBtn}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* 휴식 노드 열기 */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>휴식 노드:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn" style={STYLES.restBtn} onClick={devOpenRest}>⛺ 휴식 창 열기</button>
          <button className="btn" onClick={closeRest}>휴식 창 닫기</button>
        </div>
      </div>

      {/* 각성 강제 (DEV) */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>개성 즉시 추가 (기억 100 필요):</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn" onClick={handleAwakenBrave}>용맹(+힘)</button>
          <button className="btn" onClick={handleAwakenSturdy}>굳건(+체력)</button>
          <button className="btn" onClick={handleAwakenCold}>냉철(+통찰)</button>
          <button className="btn" onClick={handleAwakenThorough}>철저(+보조슬롯)</button>
          <button className="btn" onClick={handleAwakenPassionate}>열정(+속도)</button>
          <button className="btn" onClick={handleAwakenLively}>활력(+행동력)</button>
          <button className="btn" onClick={handleAwakenRandom}>랜덤</button>
        </div>
      </div>

      {/* 성장 해금 (DEV) */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>성장 시스템:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className="btn"
            onClick={devUnlockAllGrowth}
            style={{ background: 'rgba(134, 239, 172, 0.2)', border: '1px solid #86efac' }}
          >
            🔓 모든 성장 해금
          </button>
        </div>
      </div>
    </div>
  );
});
