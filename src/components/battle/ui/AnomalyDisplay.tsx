/**
 * AnomalyDisplay.tsx
 *
 * 이변 표시 UI 컴포넌트
 * 전투 화면 상단에 활성화된 이변 정보를 표시
 */

import { useState, useEffect, FC } from 'react';

interface AudioContextConstructor {
  new (): AudioContext;
}

declare global {
  interface Window {
    webkitAudioContext?: AudioContextConstructor;
  }
}

/**
 * 사이렌 같은 경고음 재생 (Web Audio API 사용)
 */
const playWarningSound = (): void => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const currentTime = audioContext.currentTime;

    // 사이렌 효과: 상승-하강을 2번 반복 (덜 자극적으로)
    const sirenDuration = 0.4; // 각 사이클 지속 시간 (더 부드럽게)
    const cycles = 2; // 반복 횟수 감소
    const lowFreq = 500;
    const highFreq = 900;

    // 메인 사이렌 (사인파로 부드럽게)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';

    // 사이렌 주파수 변조 (상승-하강 반복)
    for (let i = 0; i < cycles; i++) {
      const startTime = currentTime + i * sirenDuration * 2;

      // 상승
      oscillator.frequency.setValueAtTime(lowFreq, startTime);
      oscillator.frequency.linearRampToValueAtTime(highFreq, startTime + sirenDuration);

      // 하강
      oscillator.frequency.setValueAtTime(highFreq, startTime + sirenDuration);
      oscillator.frequency.linearRampToValueAtTime(lowFreq, startTime + sirenDuration * 2);
    }

    // 볼륨 페이드 아웃 (더 작은 볼륨)
    gainNode.gain.setValueAtTime(0.12, currentTime);
    gainNode.gain.setValueAtTime(0.12, currentTime + cycles * sirenDuration * 2 - 0.1);
    gainNode.gain.linearRampToValueAtTime(0.01, currentTime + cycles * sirenDuration * 2);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + cycles * sirenDuration * 2);

    // 추가 저음 효과 (약하게)
    const bassOscillator = audioContext.createOscillator();
    const bassGainNode = audioContext.createGain();

    bassOscillator.connect(bassGainNode);
    bassGainNode.connect(audioContext.destination);

    bassOscillator.type = 'sine';
    bassOscillator.frequency.setValueAtTime(120, currentTime);

    bassGainNode.gain.setValueAtTime(0.08, currentTime);
    bassGainNode.gain.linearRampToValueAtTime(0.01, currentTime + 1.0);

    bassOscillator.start(currentTime);
    bassOscillator.stop(currentTime + 1.0);

  } catch (error) {
    console.warn('Warning sound failed to play:', error);
  }
};

interface AnomalyEffect {
  description: string;
}

interface Anomaly {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  getEffect: (level: number) => AnomalyEffect;
}

interface AnomalyWithLevel {
  anomaly: Anomaly;
  level: number;
}

interface AnomalyDisplayProps {
  anomalies: AnomalyWithLevel[] | null;
}

export const AnomalyDisplay: FC<AnomalyDisplayProps> = ({ anomalies }) => {
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null);

  if (!anomalies || anomalies.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 5000,
      display: 'flex',
      gap: '8px',
      pointerEvents: 'auto'
    }}>
      {anomalies.map(({ anomaly, level }) => {
        const effect = anomaly.getEffect(level);
        const isExpanded = expandedAnomalyId === anomaly.id;

        return (
          <div
            key={anomaly.id}
            style={{
              position: 'relative',
              background: 'rgba(15, 23, 42, 0.95)',
              border: `2px solid ${anomaly.color}`,
              borderRadius: '12px',
              padding: '8px 12px',
              minWidth: isExpanded ? '280px' : '160px',
              boxShadow: `0 4px 20px ${anomaly.color}66`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              animation: 'anomaly-pulse 2s ease-in-out infinite'
            }}
            onClick={() => setExpandedAnomalyId(isExpanded ? null : anomaly.id)}
            onMouseEnter={() => setExpandedAnomalyId(anomaly.id)}
            onMouseLeave={() => setExpandedAnomalyId(null)}
          >
            {/* 제목 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: isExpanded ? '8px' : '0'
            }}>
              <span style={{ fontSize: '1.2rem' }}>{anomaly.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: anomaly.color
                }}>
                  {anomaly.name}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '2px'
                }}>
                  Lv.{level}
                </div>
              </div>
            </div>

            {/* 확장된 설명 */}
            {isExpanded && (
              <div style={{
                fontSize: '0.85rem',
                color: '#e2e8f0',
                lineHeight: '1.5',
                borderTop: `1px solid ${anomaly.color}33`,
                paddingTop: '8px'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  {effect.description}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '6px'
                }}>
                  {anomaly.description}
                </div>
              </div>
            )}

            {/* 레벨 인디케이터 */}
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              display: 'flex',
              gap: '2px'
            }}>
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: i < level ? anomaly.color : 'rgba(255, 255, 255, 0.2)'
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes anomaly-pulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 4px 30px rgba(239, 68, 68, 0.7), 0 0 40px rgba(239, 68, 68, 0.3);
          }
        }
      `}</style>
    </div>
  );
};

interface AnomalyNotificationProps {
  anomalies: AnomalyWithLevel[] | null;
  onDismiss: () => void;
}

/**
 * 이변 알림 배너 (전투 시작 시 표시)
 */
export const AnomalyNotification: FC<AnomalyNotificationProps> = ({ anomalies, onDismiss }) => {
  const [visibleAnomalies, setVisibleAnomalies] = useState<AnomalyWithLevel[]>([]);

  useEffect(() => {
    if (!anomalies || anomalies.length === 0) {
      setVisibleAnomalies([]);
      return;
    }

    // visibleAnomalies 초기화
    setVisibleAnomalies([]);

    // Store timeout IDs for cleanup
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    // 화면 흔들림 효과 - body에 클래스 추가
    document.body.classList.add('screen-shake-active');

    // 경고음 재생
    playWarningSound();

    // 1.2초 후에 화면 흔들림 제거
    const shakeTimeout = setTimeout(() => {
      document.body.classList.remove('screen-shake-active');
    }, 1200);
    timeoutIds.push(shakeTimeout);

    // 이변을 순차적으로 표시
    anomalies.forEach((anomaly, index) => {
      const timeoutId = setTimeout(() => {
        setVisibleAnomalies(prev => [...prev, anomaly]);
      }, index * 300); // 각 이변마다 300ms 간격
      timeoutIds.push(timeoutId);
    });

    // Cleanup function to cancel pending timeouts
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      document.body.classList.remove('screen-shake-active');
    };
  }, [anomalies]);

  if (!anomalies || anomalies.length === 0) {
    return null;
  }

  return (
    <>
      {/* 전체 화면 오버레이 (어둡게) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.7)',
          pointerEvents: 'none',
          animation: 'fade-in 0.3s ease-out'
        }}
      />

      {/* 붉은 플래시 오버레이 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'rgba(239, 68, 68, 0.15)',
          pointerEvents: 'none',
          animation: 'red-flash 0.6s ease-out'
        }}
      />

      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.98)',
        border: '3px solid #ef4444',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '600px',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.8)',
        pointerEvents: 'auto',
        animation: 'anomaly-appear 0.4s ease-out'
      }}>
      {/* 제목 */}
      <div style={{
        fontSize: '1.8rem',
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: '20px',
        textAlign: 'center',
        textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
        animation: 'title-pulse 1s ease-in-out infinite'
      }}>
        ⚠️ 이변 발생 ⚠️
      </div>

      {/* 이변 목록 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {visibleAnomalies.map(({ anomaly, level }, index) => {
          const effect = anomaly.getEffect(level);
          return (
            <div
              key={`${anomaly.id}-${index}`}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: `2px solid ${anomaly.color}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: `0 2px 10px ${anomaly.color}33`,
                animation: `anomaly-card-appear 0.3s ease-out ${index * 0.3}s both, card-flash 0.5s ease-in-out ${index * 0.3 + 0.3}s`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '2rem' }}>{anomaly.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: anomaly.color
                  }}>
                    {anomaly.name} (Lv.{level})
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#e2e8f0',
                    marginTop: '4px'
                  }}>
                    {effect.description}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#94a3b8',
                paddingLeft: '52px'
              }}>
                {anomaly.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* 확인 버튼 */}
      <button
        onClick={onDismiss}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          border: '2px solid #991b1b',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
        }}
        onMouseEnter={e => {
          (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
          (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
        }}
        onMouseLeave={e => {
          (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
        }}
      >
        확인
      </button>
    </div>

      <style>{`
        body.screen-shake-active {
          animation: screen-shake 1.2s ease-in-out;
        }

        @keyframes screen-shake {
          0%, 100% { transform: translate(0, 0); }
          5% { transform: translate(-8px, -4px); }
          10% { transform: translate(8px, 4px); }
          15% { transform: translate(-8px, 4px); }
          20% { transform: translate(8px, -4px); }
          25% { transform: translate(-7px, -3px); }
          30% { transform: translate(7px, 3px); }
          35% { transform: translate(-7px, 3px); }
          40% { transform: translate(7px, -3px); }
          45% { transform: translate(-6px, -3px); }
          50% { transform: translate(6px, 3px); }
          55% { transform: translate(-6px, 3px); }
          60% { transform: translate(6px, -3px); }
          65% { transform: translate(-5px, -2px); }
          70% { transform: translate(5px, 2px); }
          75% { transform: translate(-4px, 2px); }
          80% { transform: translate(4px, -2px); }
          85% { transform: translate(-3px, -1px); }
          90% { transform: translate(3px, 1px); }
          95% { transform: translate(-2px, 1px); }
        }

        @keyframes red-flash {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        @keyframes anomaly-appear {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes anomaly-card-appear {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes card-flash {
          0%, 100% {
            box-shadow: 0 2px 10px rgba(239, 68, 68, 0.2);
          }
          50% {
            box-shadow: 0 4px 30px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4);
          }
        }

        @keyframes title-pulse {
          0%, 100% {
            text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
          }
          50% {
            text-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};
