// @vitest-environment happy-dom
/**
 * @file AnomalyDisplay.test.tsx
 * @description AnomalyDisplay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnomalyDisplay, AnomalyNotification } from './AnomalyDisplay';
import type { AnomalyWithLevel } from '../../../types';

// 테스트용 이변 데이터
const mockAnomaly = {
  id: 'testAnomaly',
  name: '테스트 이변',
  emoji: '🔥',
  color: '#ef4444',
  description: '테스트용 이변 설명',
  getEffect: vi.fn((level: number) => ({
    description: `레벨 ${level} 효과`,
    modifier: level * 0.1,
  })),
};

const mockAnomalyWithLevel: AnomalyWithLevel = {
  anomaly: mockAnomaly as any,
  level: 2,
};

describe('AnomalyDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('이변이 없으면 null 반환', () => {
      const { container } = render(<AnomalyDisplay anomalies={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('빈 배열이면 null 반환', () => {
      const { container } = render(<AnomalyDisplay anomalies={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('이변 표시', () => {
      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByText('테스트 이변')).toBeInTheDocument();
    });

    it('레벨 표시', () => {
      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);
      expect(screen.getByText('Lv.2')).toBeInTheDocument();
    });

    it('data-testid 설정', () => {
      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);
      expect(screen.getByTestId('anomaly-display')).toBeInTheDocument();
    });
  });

  describe('호버 상호작용', () => {
    it('mouseEnter 시 설명 확장', () => {
      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);

      const anomalyCard = screen.getByText('테스트 이변').closest('div');
      if (anomalyCard) {
        fireEvent.mouseEnter(anomalyCard);
      }

      expect(screen.getByText('레벨 2 효과')).toBeInTheDocument();
    });

    it('mouseLeave 시 설명 숨김', () => {
      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);

      const anomalyCard = screen.getByText('테스트 이변').closest('div');
      if (anomalyCard) {
        fireEvent.mouseEnter(anomalyCard);
        fireEvent.mouseLeave(anomalyCard);
      }

      expect(screen.queryByText('레벨 2 효과')).not.toBeInTheDocument();
    });
  });

  describe('클릭 상호작용', () => {
    it('클릭 시 설명 토글', () => {
      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);

      const anomalyCard = screen.getByText('테스트 이변').closest('div');
      if (anomalyCard) {
        fireEvent.click(anomalyCard);
        expect(screen.getByText('레벨 2 효과')).toBeInTheDocument();

        fireEvent.click(anomalyCard);
        expect(screen.queryByText('레벨 2 효과')).not.toBeInTheDocument();
      }
    });
  });

  describe('레벨 인디케이터', () => {
    it('레벨에 따른 인디케이터 표시', () => {
      const { container } = render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel]} />);
      // 레벨 인디케이터 (4개 중 2개 활성화)
      const indicators = container.querySelectorAll('div[style*="border-radius: 50%"]');
      expect(indicators.length).toBe(4);
    });
  });

  describe('여러 이변', () => {
    it('여러 이변 동시 표시', () => {
      const secondAnomaly: AnomalyWithLevel = {
        anomaly: {
          id: 'secondAnomaly',
          name: '두번째 이변',
          emoji: '⚡',
          color: '#fbbf24',
          description: '두번째 이변 설명',
          getEffect: vi.fn(() => ({ description: '두번째 효과', modifier: 0.2 })),
        } as any,
        level: 1,
      };

      render(<AnomalyDisplay anomalies={[mockAnomalyWithLevel, secondAnomaly]} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });
  });
});

describe('AnomalyNotification', () => {
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('이변이 없으면 null 반환', () => {
      const { container } = render(
        <AnomalyNotification anomalies={null} onDismiss={onDismiss} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('빈 배열이면 null 반환', () => {
      const { container } = render(
        <AnomalyNotification anomalies={[]} onDismiss={onDismiss} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('제목 표시', () => {
      render(
        <AnomalyNotification anomalies={[mockAnomalyWithLevel]} onDismiss={onDismiss} />
      );
      expect(screen.getByTestId('anomaly-notification-title')).toBeInTheDocument();
      expect(screen.getByText(/이변 발생/)).toBeInTheDocument();
    });

    it('data-testid 설정', () => {
      render(
        <AnomalyNotification anomalies={[mockAnomalyWithLevel]} onDismiss={onDismiss} />
      );
      expect(screen.getByTestId('anomaly-notification')).toBeInTheDocument();
    });
  });

  describe('확인 버튼', () => {
    it('확인 버튼 표시', () => {
      render(
        <AnomalyNotification anomalies={[mockAnomalyWithLevel]} onDismiss={onDismiss} />
      );
      expect(screen.getByText('확인')).toBeInTheDocument();
    });

    it('확인 버튼 클릭 시 onDismiss 호출', () => {
      render(
        <AnomalyNotification anomalies={[mockAnomalyWithLevel]} onDismiss={onDismiss} />
      );

      fireEvent.click(screen.getByText('확인'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('여러 이변', () => {
    it('여러 이변이 전달되어도 notification 표시', () => {
      const secondAnomaly: AnomalyWithLevel = {
        anomaly: {
          id: 'secondAnomaly',
          name: '두번째 이변',
          emoji: '⚡',
          color: '#fbbf24',
          description: '두번째 이변',
          getEffect: vi.fn(() => ({ description: '효과', modifier: 0.1 })),
        } as any,
        level: 1,
      };

      render(
        <AnomalyNotification
          anomalies={[mockAnomalyWithLevel, secondAnomaly]}
          onDismiss={onDismiss}
        />
      );

      // notification 컨테이너 렌더링 확인
      expect(screen.getByTestId('anomaly-notification')).toBeInTheDocument();
      expect(screen.getByText('확인')).toBeInTheDocument();
    });
  });
});
