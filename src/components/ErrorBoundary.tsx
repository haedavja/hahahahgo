import { Component, type ReactNode, type ErrorInfo } from 'react';
import { handleBoundaryError } from '../lib/errorLogger';
import { TEXT_COLORS, STATUS_COLORS, BG_COLORS } from './battle/ui/constants/colors';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

/**
 * ErrorBoundary - 컴포넌트 에러 캐치 및 폴백 UI 표시
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 로거로 기록
    const entry = handleBoundaryError(error, { componentStack: errorInfo.componentStack ?? undefined });
    this.setState({ errorId: entry.id });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // 게임 상태 초기화
    try {
      localStorage.removeItem('hahahahgo_game_state');
    } catch (e) {
      console.warn('[ErrorBoundary] Failed to clear game state:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: BG_COLORS.dark,
          color: TEXT_COLORS.primary,
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center',
        }}>
          <h1 style={{ color: STATUS_COLORS.error, marginBottom: '16px' }}>
            오류가 발생했습니다
          </h1>
          <p style={{ color: TEXT_COLORS.secondary, marginBottom: '24px', maxWidth: '400px' }}>
            예기치 않은 오류가 발생했습니다.
            페이지를 새로고침하거나 게임을 초기화해주세요.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                background: STATUS_COLORS.info,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              새로고침
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: BG_COLORS.button,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              게임 초기화
            </button>
          </div>
          {this.state.errorId && (
            <p style={{ color: TEXT_COLORS.muted, fontSize: '0.75rem', marginTop: '16px' }}>
              에러 ID: {this.state.errorId}
            </p>
          )}
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '24px',
              padding: '16px',
              background: BG_COLORS.primary,
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: STATUS_COLORS.errorLight,
              maxWidth: '600px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
