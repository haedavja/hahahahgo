/**
 * EventTab.tsx
 * 이벤트 관리 탭
 */

import { useState, ChangeEvent } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { NEW_EVENT_LIBRARY } from '../../../data/newEvents';

interface EventDefinition {
  title?: string;
  description?: string;
  multiStage?: boolean;
}

interface EventInfo {
  id: string;
  title: string;
  description: string;
  multiStage: boolean;
}

export function EventTab() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { devTriggerEvent } = useGameStore();

  // 모든 이벤트를 배열로 변환
  const allEvents: EventInfo[] = Object.entries(NEW_EVENT_LIBRARY as Record<string, EventDefinition>).map(([id, definition]) => ({
    id,
    title: definition.title || id,
    description: definition.description || '',
    multiStage: definition.multiStage || false,
  }));

  // 검색어로 필터링
  const filteredEvents = allEvents.filter((event) => {
    const term = searchTerm.toLowerCase();
    return (
      event.id.toLowerCase().includes(term) ||
      event.title.toLowerCase().includes(term) ||
      event.description.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>이벤트 제어</h3>

      {/* 검색 입력 */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="이벤트 ID 또는 제목으로 검색..."
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* 이벤트 목록 */}
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {filteredEvents.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.875rem',
          }}>
            검색 결과가 없습니다
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#fbbf24',
                    fontSize: '0.9rem',
                    marginBottom: '4px',
                  }}>
                    {event.title}
                    {event.multiStage && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.7rem',
                        color: '#a78bfa',
                        background: 'rgba(167, 139, 250, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        다단계
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginBottom: '4px',
                  }}>
                    ID: {event.id}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {event.description}
                  </div>
                </div>
                <button
                  onClick={() => {
                    devTriggerEvent(event.id);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  실행
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 총 이벤트 수 표시 */}
      <div style={{
        marginTop: '16px',
        padding: '8px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b',
      }}>
        총 {allEvents.length}개 이벤트 중 {filteredEvents.length}개 표시
      </div>
    </div>
  );
}
