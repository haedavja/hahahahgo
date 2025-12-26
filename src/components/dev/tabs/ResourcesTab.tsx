/**
 * ResourcesTab.tsx
 * 자원 관리 탭
 */

import { useState } from 'react';
import type { Resources } from '../../../types/core';

interface ResourcesTabProps {
  resources: Resources;
  setResources: (resources: Resources) => void;
  devOpenRest: () => void;
  awakenAtRest: (trait: string) => void;
  closeRest: () => void;
}

export function ResourcesTab({ resources, setResources, devOpenRest, awakenAtRest, closeRest }: ResourcesTabProps) {
  const [inputs, setInputs] = useState<Resources>(resources);

  const applyResources = () => {
    setResources(inputs);
  };

  const presets: Record<string, Resources> = {
    '풍족': { gold: 999, intel: 10, loot: 10, material: 10, etherPts: 50, memory: 200 },
    '초반': { gold: 50, intel: 2, loot: 1, material: 1, etherPts: 0, memory: 0 },
    '중반': { gold: 200, intel: 5, loot: 5, material: 3, etherPts: 10, memory: 50 },
    '후반': { gold: 500, intel: 8, loot: 8, material: 6, etherPts: 30, memory: 120 },
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>자원 직접 수정</h3>

      {/* 현재 자원 표시 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>현재 자원:</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {Object.entries(resources).map(([key, value]) => (
            <div key={key} style={{
              padding: '6px 12px',
              background: '#1e293b',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}>
              <span style={{ color: '#64748b' }}>{key}:</span>{' '}
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 폼 */}
      {Object.keys(resources).map(key => (
        <div key={key} style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '0.875rem',
            color: '#cbd5e1',
            textTransform: 'capitalize',
          }}>
            {key}:
          </label>
          <input
            type="number"
            value={inputs[key]}
            onChange={(e) => setInputs({ ...inputs, [key]: parseInt(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '0.875rem',
            }}
          />
        </div>
      ))}

      <button
        onClick={applyResources}
        style={{
          width: '100%',
          padding: '12px',
          background: '#10b981',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        ✓ 적용
      </button>

      {/* 프리셋 버튼 */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>프리셋:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {Object.entries(presets).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => {
                setInputs(preset);
                setResources(preset);
              }}
              style={{
                padding: '10px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
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
          <button className="btn" style={{ background: 'rgba(253, 230, 138, 0.2)', border: '1px solid #fde68a' }} onClick={devOpenRest}>⛺ 휴식 창 열기</button>
          <button className="btn" onClick={closeRest}>휴식 창 닫기</button>
        </div>
      </div>

      {/* 각성 강제 (DEV) */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>개성 즉시 추가 (기억 100 필요):</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('brave'); }}>용맹(+힘)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('sturdy'); }}>굳건(+체력)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('cold'); }}>냉철(+통찰)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('thorough'); }}>철저(+보조슬롯)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('passionate'); }}>열정(+속도)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('lively'); }}>활력(+행동력)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('random'); }}>랜덤</button>
        </div>
      </div>
    </div>
  );
}
