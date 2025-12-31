/**
 * @file ModalErrorBoundary.tsx
 * @description 모달 컴포넌트 전용 에러 경계
 *
 * 모달 렌더링 중 에러 발생 시 조용히 모달을 닫고 로그만 남김
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { handleBoundaryError } from '../../lib/errorLogger';

interface ModalErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
  fallback?: ReactNode;
  modalName?: string;
}

interface ModalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 모달 에러 경계
 *
 * 모달 에러 발생 시:
 * 1. 에러를 로그에 기록
 * 2. 선택적으로 onClose 콜백 호출하여 모달 닫기
 * 3. fallback UI 표시 (기본: 에러 메시지 표시)
 */
export class ModalErrorBoundary extends Component<ModalErrorBoundaryProps, ModalErrorBoundaryState> {
  constructor(props: ModalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ModalErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    handleBoundaryError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      context: `Modal:${this.props.modalName || 'Unknown'}`,
    });
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null });
    this.props.onClose?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#1e293b',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: '#f87171', marginBottom: '12px' }}>
              {this.props.modalName || '모달'} 오류
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
              창을 표시하는 중 문제가 발생했습니다.
            </p>
            <button
              onClick={this.handleClose}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
