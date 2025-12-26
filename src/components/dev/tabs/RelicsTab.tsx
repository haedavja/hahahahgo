/**
 * RelicsTab.tsx
 * 상징 관리 탭
 */

import { useState, ChangeEvent } from 'react';
import { getAllRelics, RELIC_RARITIES } from '../../../data/relics';
import type { RelicData as Relic } from '../../../types';

interface RelicsTabProps {
  relics: string[];
  addRelic: (relicId: string) => void;
  removeRelic: (relicId: string) => void;
  setRelics: (relics: string[]) => void;
}

export function RelicsTab({ relics, addRelic, removeRelic, setRelics }: RelicsTabProps) {
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const allRelics = getAllRelics() as Relic[];

  const filteredRelics = allRelics.filter(r => {
    // 등급 필터
    const matchesRarity = selectedRarity === 'all' || r.rarity === selectedRarity;
    // 검색 필터 (이름, 설명, 태그)
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      r.name.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.id.toLowerCase().includes(query) ||
      (r.tags && r.tags.some(tag => tag.toLowerCase().includes(query)));
    return matchesRarity && matchesSearch;
  });

  const hasRelic = (relicId: string): boolean => relics.includes(relicId);

  const rarityColors: Record<string, string> = {
    [RELIC_RARITIES.COMMON]: '#94a3b8',
    [RELIC_RARITIES.RARE]: '#60a5fa',
    [RELIC_RARITIES.SPECIAL]: '#a78bfa',
    [RELIC_RARITIES.LEGENDARY]: '#fbbf24',
  };

  const rarityNames: Record<string, string> = {
    [RELIC_RARITIES.COMMON]: '일반',
    [RELIC_RARITIES.RARE]: '희귀',
    [RELIC_RARITIES.SPECIAL]: '특별',
    [RELIC_RARITIES.LEGENDARY]: '전설',
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>상징 관리</h3>

      {/* 현재 보유 상징 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보유 상징 ({relics.length}개)
        </div>
        {relics.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {relics.map(relicId => {
              const relic = allRelics.find(r => r.id === relicId);
              if (!relic) return null;
              return (
                <div
                  key={relicId}
                  onClick={() => removeRelic(relicId)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    color: '#fca5a5',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title="클릭하여 제거"
                >
                  {relic.name} ✕
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
            보유한 상징이 없습니다
          </div>
        )}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setRelics([])}
            style={{
              padding: '8px 12px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            전체 제거
          </button>
          <button
            onClick={() => {
              const commonRelics = allRelics.filter(r => r.rarity === RELIC_RARITIES.COMMON).map(r => r.id);
              setRelics(commonRelics.slice(0, 3));
            }}
            style={{
              padding: '8px 12px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            테스트 (일반 3개)
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="상징 검색 (이름, 설명, 태그, ID)"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            검색 결과: {filteredRelics.length}개
          </div>
        )}
      </div>

      {/* 등급 필터 */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setSelectedRarity('all')}
          style={{
            padding: '6px 12px',
            background: selectedRarity === 'all' ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: selectedRarity === 'all' ? '#fff' : '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          전체
        </button>
        {Object.entries(RELIC_RARITIES).map(([key, value]) => (
          <button
            key={value}
            onClick={() => setSelectedRarity(value)}
            style={{
              padding: '6px 12px',
              background: selectedRarity === value ? rarityColors[value] : '#1e293b',
              border: `1px solid ${rarityColors[value]}`,
              borderRadius: '6px',
              color: selectedRarity === value ? '#000' : rarityColors[value],
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {rarityNames[value]}
          </button>
        ))}
      </div>

      {/* 상징 목록 */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px',
        background: '#0f172a',
        borderRadius: '8px',
      }}>
        {filteredRelics.map(relic => {
          const owned = hasRelic(relic.id);
          return (
            <div
              key={relic.id}
              onClick={() => owned ? removeRelic(relic.id) : addRelic(relic.id)}
              style={{
                padding: '10px',
                marginBottom: '6px',
                background: owned ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${owned ? '#22c55e' : rarityColors[relic.rarity]}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: rarityColors[relic.rarity],
                }}>
                  {relic.name}
                  {owned && <span style={{ color: '#22c55e', marginLeft: '6px' }}>✓</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {rarityNames[relic.rarity]}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {relic.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
