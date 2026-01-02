/**
 * @file BattleErrorBoundary.tsx
 * @description 전투 화면 전용 에러 경계
 *
 * 전투 중 발생하는 에러를 캐치하고, 전투를 안전하게 종료할 수 있는 옵션 제공
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { handleBoundaryError } from '../../lib/errorLogger';
import { useGameStore } from '../../state/gameStore';

interface BattleErrorBoundaryProps {
  children: ReactNode;
  onExitBattle?: () => void;
}

interface BattleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'rgba(15, 23, 42, 0.95)',
  color: '#e2e8f0',
  fontFamily: 'sans-serif',
  padding: '20px',
  textAlign: 'center',
  zIndex: 10000,
};

const BUTTON_PRIMARY_STYLE: React.CSSProperties = {
  padding: '12px 24px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
};

const BUTTON_SECONDARY_STYLE: React.CSSProperties = {
  padding: '12px 24px',
  background: '#374151',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
};

const BUTTON_DANGER_STYLE: React.CSSProperties = {
  padding: '12px 24px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
};

/**
 * 전투 화면 에러 경계
 *
 * 전투 중 에러 발생 시:
 * 1. 전투 재시도 (페이지 새로고침 없이)
 * 2. 전투 포기 (맵으로 복귀)
 * 3. 페이지 새로고침
 */
export class BattleErrorBoundary extends Component<BattleErrorBoundaryProps, BattleErrorBoundaryState> {
  constructor(props: BattleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<BattleErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const entry = handleBoundaryError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      context: 'BattleScreen',
    });
    this.setState({ errorId: entry.id });
  }

  handleRetry = () => {
    // 전투 상태 리셋 후 재시도
    this.setState({ hasError: false, error: null, errorId: null });
  };

  handleExitBattle = () => {
    // 전투 포기하고 맵으로 복귀
    try {
      const store = useGameStore.getState();
      if ('resolveBattle' in store && typeof store.resolveBattle === 'function') {
        store.resolveBattle({ result: 'defeat', playerHp: 0, playerMaxHp: 0 });
      }
    } catch {
      // 상태 업데이트 실패 시 새로고침
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={OVERLAY_STYLE}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚔️</div>
          <h1 style={{ color: '#f87171', marginBottom: '16px', fontSize: '1.5rem' }}>
            전투 중 오류 발생
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
            전투 진행 중 문제가 발생했습니다.
            전투를 다시 시작하거나 맵으로 돌아갈 수 있습니다.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={this.handleRetry} style={BUTTON_PRIMARY_STYLE}>
              🔄 전투 재시도
            </button>
            <button onClick={this.handleExitBattle} style={BUTTON_DANGER_STYLE}>
              🏃 전투 포기
            </button>
            <button onClick={this.handleReload} style={BUTTON_SECONDARY_STYLE}>
              새로고침
            </button>
          </div>
          {this.state.errorId && (
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '16px' }}>
              에러 ID: {this.state.errorId}
            </p>
          )}
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '24px',
              padding: '16px',
              background: '#1e293b',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#f87171',
              maxWidth: '600px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.stack || this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
