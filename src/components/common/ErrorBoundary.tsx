/**
 * @file ErrorBoundary.tsx
 * @description React 에러 바운더리 컴포넌트
 *
 * 사용법:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, type ReactNode, type ErrorInfo, type JSX } from 'react';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../../styles/theme';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  section?: string; // 섹션 이름 (로깅용)
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 에러 로깅
    const section = this.props.section || 'unknown';
    console.error(`[ErrorBoundary:${section}]`, error, errorInfo);

    // 외부 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 fallback 제공 시 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          section={this.props.section}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// ========================================
// 기본 에러 폴백 UI
// ========================================
interface DefaultErrorFallbackProps {
  error: Error | null;
  section?: string;
  onRetry: () => void;
}

function DefaultErrorFallback({ error, section, onRetry }: DefaultErrorFallbackProps): JSX.Element {
  return (
    <div style={{
      padding: SPACING.xl,
      background: 'rgba(239, 68, 68, 0.1)',
      border: `1px solid ${COLORS.danger}`,
      borderRadius: BORDER_RADIUS.lg,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '24px',
        marginBottom: SPACING.md,
      }}>
        ⚠️
      </div>
      <div style={{
        color: COLORS.danger,
        fontSize: FONT_SIZE.lg,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
      }}>
        {section ? `${section}에서 ` : ''}오류가 발생했습니다
      </div>
      {error && (
        <div style={{
          color: COLORS.text.secondary,
          fontSize: FONT_SIZE.md,
          marginBottom: SPACING.lg,
          fontFamily: 'monospace',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: SPACING.md,
          borderRadius: BORDER_RADIUS.md,
          textAlign: 'left',
          maxHeight: '100px',
          overflow: 'auto',
        }}>
          {error.message}
        </div>
      )}
      <button
        onClick={onRetry}
        style={{
          padding: `${SPACING.md} ${SPACING.xl}`,
          background: 'rgba(96, 165, 250, 0.2)',
          border: `1px solid ${COLORS.secondary}`,
          borderRadius: BORDER_RADIUS.md,
          color: COLORS.secondary,
          fontSize: FONT_SIZE.lg,
          cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
    </div>
  );
}

// ========================================
// 전투용 에러 폴백
// ========================================
interface BattleErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onExit?: () => void;
}

export function BattleErrorFallback({ error, onRetry, onExit }: BattleErrorFallbackProps): JSX.Element {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        padding: '32px',
        background: 'rgba(30, 41, 59, 0.95)',
        border: `2px solid ${COLORS.danger}`,
        borderRadius: BORDER_RADIUS.xl,
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: SPACING.lg }}>💥</div>
        <h2 style={{ color: COLORS.danger, marginBottom: SPACING.lg }}>
          전투 중 오류 발생
        </h2>
        <p style={{ color: COLORS.text.secondary, marginBottom: SPACING.xl }}>
          죄송합니다. 예기치 않은 오류가 발생했습니다.
        </p>
        {error && (
          <div style={{
            color: COLORS.text.muted,
            fontSize: FONT_SIZE.sm,
            fontFamily: 'monospace',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            marginBottom: SPACING.xl,
            textAlign: 'left',
            maxHeight: '80px',
            overflow: 'auto',
          }}>
            {error.message}
          </div>
        )}
        <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
          <button
            onClick={onRetry}
            style={{
              padding: `${SPACING.md} ${SPACING.xl}`,
              background: 'rgba(96, 165, 250, 0.2)',
              border: `1px solid ${COLORS.secondary}`,
              borderRadius: BORDER_RADIUS.md,
              color: COLORS.secondary,
              fontSize: FONT_SIZE.lg,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          {onExit && (
            <button
              onClick={onExit}
              style={{
                padding: `${SPACING.md} ${SPACING.xl}`,
                background: 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${COLORS.danger}`,
                borderRadius: BORDER_RADIUS.md,
                color: COLORS.danger,
                fontSize: FONT_SIZE.lg,
                cursor: 'pointer',
              }}
            >
              전투 종료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// 섹션별 에러 바운더리 (간편 사용)
// ========================================
interface SectionErrorBoundaryProps {
  children: ReactNode;
  section: string;
}

export function SectionErrorBoundary({ children, section }: SectionErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary section={section}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
