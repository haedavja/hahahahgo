/**
 * ItemsTab.tsx
 * 아이템 관리 탭
 */

import { useState } from 'react';
import { ITEMS } from '../../../data/items';

interface Item {
  id: string;
  name: string;
  icon: string;
  tier: number;
  usableIn: 'combat' | 'any';
  description: string;
}

interface ItemsTabProps {
  items: (Item | null)[];
  addItem: (itemId: string) => void;
  removeItem: (index: number) => void;
  devSetItems: (items: (string | null)[]) => void;
}

export function ItemsTab({ items, addItem, removeItem, devSetItems }: ItemsTabProps) {
  const [selectedTier, setSelectedTier] = useState<string>('all');

  const allItems = Object.values(ITEMS) as Item[];
  const filteredItems = selectedTier === 'all'
    ? allItems
    : allItems.filter(item => item.tier === parseInt(selectedTier));

  const usableLabels: Record<string, string> = {
    'combat': '전투용',
    'any': '범용',
  };

  const tierColors: Record<number, string> = {
    1: '#94a3b8',
    2: '#fbbf24',
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>아이템 관리</h3>

      {/* 현재 보유 아이템 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보유 아이템 (3슬롯)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(items || [null, null, null]).map((item, idx) => (
            <div
              key={idx}
              onClick={() => item && removeItem(idx)}
              style={{
                width: '60px',
                height: '60px',
                background: item ? '#1e293b' : '#0f172a',
                border: `2px solid ${item ? '#22c55e' : '#334155'}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
              title={item ? `${item.name} - 클릭하여 제거` : '빈 슬롯'}
            >
              {item ? (
                <>
                  <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '2px' }}>
                    {item.usableIn === 'combat' ? '⚔️' : '✦'}
                  </span>
                </>
              ) : (
                <span style={{ color: '#64748b', fontSize: '1.5rem' }}>-</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => devSetItems([null, null, null])}
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
            onClick={() => devSetItems(['healing-potion-small', 'explosive-small', 'strength-boost-small'])}
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
            테스트 (소형 3개)
          </button>
          <button
            onClick={() => devSetItems(['healing-potion-large', 'explosive-large', 'strength-boost-large'])}
            style={{
              padding: '8px 12px',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            테스트 (대형 3개)
          </button>
        </div>
      </div>

      {/* 등급 필터 */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setSelectedTier('all')}
          style={{
            padding: '6px 12px',
            background: selectedTier === 'all' ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: selectedTier === 'all' ? '#fff' : '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          전체
        </button>
        <button
          onClick={() => setSelectedTier('1')}
          style={{
            padding: '6px 12px',
            background: selectedTier === '1' ? tierColors[1] : '#1e293b',
            border: `1px solid ${tierColors[1]}`,
            borderRadius: '6px',
            color: selectedTier === '1' ? '#000' : tierColors[1],
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          소형 (1티어)
        </button>
        <button
          onClick={() => setSelectedTier('2')}
          style={{
            padding: '6px 12px',
            background: selectedTier === '2' ? tierColors[2] : '#1e293b',
            border: `1px solid ${tierColors[2]}`,
            borderRadius: '6px',
            color: selectedTier === '2' ? '#000' : tierColors[2],
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          대형 (2티어)
        </button>
      </div>

      {/* 아이템 목록 */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px',
        background: '#0f172a',
        borderRadius: '8px',
      }}>
        {filteredItems.map(item => {
          const hasEmptySlot = (items || []).some(slot => slot === null);
          return (
            <div
              key={item.id}
              onClick={() => hasEmptySlot && addItem(item.id)}
              style={{
                padding: '10px',
                marginBottom: '6px',
                background: hasEmptySlot ? 'rgba(30, 41, 59, 0.5)' : 'rgba(30, 41, 59, 0.2)',
                border: `1px solid ${tierColors[item.tier]}`,
                borderRadius: '6px',
                cursor: hasEmptySlot ? 'pointer' : 'not-allowed',
                opacity: hasEmptySlot ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: tierColors[item.tier],
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: item.usableIn === 'combat' ? '#f87171' : '#34d399',
                  background: item.usableIn === 'combat' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  {usableLabels[item.usableIn]}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {item.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
