// @vitest-environment happy-dom
/**
 * @file DefeatOverlay.test.tsx
 * @description DefeatOverlay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefeatOverlay } from './DefeatOverlay';

describe('DefeatOverlay', () => {
  const onExit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('오버레이 렌더링', () => {
      const { container } = render(<DefeatOverlay onExit={onExit} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.position).toBe('fixed');
      expect(overlay.style.zIndex).toBe('9999');
    });

    it('패배 메시지 표시', () => {
      render(<DefeatOverlay onExit={onExit} />);
      expect(screen.getByText('💀 패배...')).toBeInTheDocument();
    });

    it('확인 버튼 표시', () => {
      render(<DefeatOverlay onExit={onExit} />);
      expect(screen.getByText('확인')).toBeInTheDocument();
    });
  });

  describe('스타일', () => {
    it('패배 메시지가 렌더링됨', () => {
      render(<DefeatOverlay onExit={onExit} />);
      // 패배 메시지 텍스트 확인
      const message = screen.getByText('💀 패배...');
      expect(message).toBeInTheDocument();
    });

    it('오버레이가 전체 화면 커버', () => {
      const { container } = render(<DefeatOverlay onExit={onExit} />);
      const overlay = container.firstChild as HTMLElement;
      // inset: 0은 happy-dom에서 '0'으로 반환됨
      expect(overlay.style.inset).toBe('0');
    });
  });

  describe('버튼 상호작용', () => {
    it('확인 버튼 클릭 시 onExit 호출', () => {
      render(<DefeatOverlay onExit={onExit} />);

      fireEvent.click(screen.getByText('확인'));
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('버튼에 btn-enhanced 클래스', () => {
      render(<DefeatOverlay onExit={onExit} />);
      const button = screen.getByText('확인');
      expect(button).toHaveClass('btn-enhanced');
      expect(button).toHaveClass('btn-primary');
    });
  });

  describe('배경', () => {
    it('반투명 검은 배경', () => {
      const { container } = render(<DefeatOverlay onExit={onExit} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.background).toBe('rgba(0, 0, 0, 0.7)');
    });
  });
});
