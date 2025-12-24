import { Component } from 'react';

/**
 * ErrorBoundary - 컴포넌트 에러 캐치 및 폴백 UI 표시
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 프로덕션에서는 에러 리포팅 서비스로 전송 가능
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // 게임 상태 초기화
    try {
      localStorage.removeItem('hahahahgo_game_state');
    } catch (e) {
      // ignore
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
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center',
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>
            오류가 발생했습니다
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
            예기치 않은 오류가 발생했습니다.
            페이지를 새로고침하거나 게임을 초기화해주세요.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
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
                background: '#374151',
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
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
