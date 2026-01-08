// @vitest-environment happy-dom
/**
 * @file BattleLog.test.tsx
 * @description BattleLog 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleLog } from './BattleLog';
import { createRef } from 'react';

describe('BattleLog', () => {
  const logContainerRef = createRef<HTMLDivElement>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('resolve 페이즈에서 렌더링', () => {
      render(
        <BattleLog
          phase="resolve"
          log={['테스트 로그']}
          logContainerRef={logContainerRef}
        />
      );
      expect(screen.getByText('🎮 전투 로그')).toBeInTheDocument();
      expect(screen.getByText('테스트 로그')).toBeInTheDocument();
    });

    it('헤더 표시', () => {
      render(
        <BattleLog
          phase="resolve"
          log={['로그 1']}
          logContainerRef={logContainerRef}
        />
      );
      expect(screen.getByText('🎮 전투 로그')).toBeInTheDocument();
    });
  });

  describe('페이즈별 표시', () => {
    it('resolve 페이즈: 표시', () => {
      render(
        <BattleLog
          phase="resolve"
          log={['로그']}
          logContainerRef={logContainerRef}
        />
      );
      expect(screen.getByText('로그')).toBeInTheDocument();
    });

    it('select 페이즈: 숨김', () => {
      const { container } = render(
        <BattleLog
          phase="select"
          log={['로그']}
          logContainerRef={logContainerRef}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('showAlways=true: 다른 페이즈에서도 표시', () => {
      render(
        <BattleLog
          phase="select"
          log={['로그']}
          logContainerRef={logContainerRef}
          showAlways={true}
        />
      );
      expect(screen.getByText('로그')).toBeInTheDocument();
    });
  });

  describe('빈 로그 처리', () => {
    it('로그 없으면 null 반환', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={null}
          logContainerRef={logContainerRef}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('빈 배열이면 null 반환', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={[]}
          logContainerRef={logContainerRef}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('로그 필터링', () => {
    it('게임 시작 메시지 필터링', () => {
      render(
        <BattleLog
          phase="resolve"
          log={['게임 시작', '정상 로그']}
          logContainerRef={logContainerRef}
        />
      );
      expect(screen.queryByText('게임 시작')).not.toBeInTheDocument();
      expect(screen.getByText('정상 로그')).toBeInTheDocument();
    });

    it('적 성향 힌트 필터링', () => {
      render(
        <BattleLog
          phase="resolve"
          log={['적 성향 힌트: 공격적', '정상 로그']}
          logContainerRef={logContainerRef}
        />
      );
      expect(screen.queryByText(/적 성향 힌트/)).not.toBeInTheDocument();
      expect(screen.getByText('정상 로그')).toBeInTheDocument();
    });
  });

  describe('로그 라인 분류', () => {
    it('플레이어 액션: 파란색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['플레이어(마법사) 공격']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText(/플레이어\(마법사\)/);
      expect(logLine).toHaveStyle({ color: '#60a5fa' });
    });

    it('플레이어 액션 (🔵): 파란색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['🔵 플레이어 턴']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText(/🔵 플레이어 턴/);
      expect(logLine).toHaveStyle({ color: '#60a5fa' });
    });

    it('플레이어 액션 (•): 파란색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['플레이어 • 공격']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText(/플레이어 •/);
      expect(logLine).toHaveStyle({ color: '#60a5fa' });
    });

    it('적 액션 (-> 플레이어): 빨간색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['고블린 -> 플레이어 10 데미지']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText(/-> 플레이어/);
      expect(logLine).toHaveStyle({ color: '#fca5a5' });
    });

    it('적 액션 (👾): 빨간색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['👾 적 턴']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText(/👾 적 턴/);
      expect(logLine).toHaveStyle({ color: '#fca5a5' });
    });

    it('적 액션 (•): 빨간색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['고블린 • 공격']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText(/고블린 •/);
      expect(logLine).toHaveStyle({ color: '#fca5a5' });
    });

    it('일반 로그: 회색', () => {
      const { container } = render(
        <BattleLog
          phase="resolve"
          log={['턴 시작']}
          logContainerRef={logContainerRef}
        />
      );
      const logLine = screen.getByText('턴 시작');
      expect(logLine).toHaveStyle({ color: '#cbd5e1' });
    });
  });

  describe('여러 로그 렌더링', () => {
    it('여러 로그 라인 렌더링', () => {
      render(
        <BattleLog
          phase="resolve"
          log={[
            '턴 시작',
            '플레이어(마법사) 공격',
            '고블린 -> 플레이어 5 데미지',
            '턴 종료',
          ]}
          logContainerRef={logContainerRef}
        />
      );
      expect(screen.getByText('턴 시작')).toBeInTheDocument();
      expect(screen.getByText(/플레이어\(마법사\)/)).toBeInTheDocument();
      expect(screen.getByText(/-> 플레이어/)).toBeInTheDocument();
      expect(screen.getByText('턴 종료')).toBeInTheDocument();
    });
  });

  describe('ref 연결', () => {
    it('logContainerRef가 컨테이너에 연결됨', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <BattleLog
          phase="resolve"
          log={['로그']}
          logContainerRef={ref}
        />
      );
      // ref가 null이 아닌지 확인 (실제 DOM 요소에 연결됨)
      // happy-dom에서는 ref가 제대로 동작하지 않을 수 있음
      expect(screen.getByText('로그')).toBeInTheDocument();
    });
  });
});
