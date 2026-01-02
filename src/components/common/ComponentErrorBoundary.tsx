/**
 * @file ComponentErrorBoundary.tsx
 * @description 비핵심 UI 컴포넌트 에러 경계
 *
 * 비핵심 컴포넌트 에러 시 해당 컴포넌트만 숨기고 나머지는 정상 동작
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { handleBoundaryError } from '../../lib/errorLogger';

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  silent?: boolean;  // true면 에러 UI 숨김 (완전히 실패한 것처럼 보임)
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 컴포넌트 에러 경계
 *
 * 비핵심 UI 컴포넌트 에러 시:
 * 1. 에러를 로그에 기록
 * 2. fallback UI 표시 또는 null 반환 (silent 모드)
 * 3. 페이지 전체에 영향 없이 해당 컴포넌트만 대체
 */
export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    handleBoundaryError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      context: `Component:${this.props.componentName || 'Unknown'}`,
      severity: 'warning',  // 컴포넌트 에러는 경고 수준
    });
  }

  render() {
    if (this.state.hasError) {
      // silent 모드: 아무것도 렌더링하지 않음
      if (this.props.silent) {
        return null;
      }

      // 커스텀 fallback 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 fallback: 개발 모드에서만 표시
      if (import.meta.env.DEV) {
        return (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#f87171',
          }}>
            ⚠️ {this.props.componentName || '컴포넌트'} 오류
          </div>
        );
      }

      return null;
    }

    return this.props.children;
  }
}

/**
 * 간편하게 사용할 수 있는 함수형 래퍼
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ComponentErrorBoundaryProps, 'children'> = {}
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ComponentErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ComponentErrorBoundary>
    );
  };
}
