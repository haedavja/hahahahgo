// @vitest-environment happy-dom
/**
 * @file TokenDisplay.test.tsx
 * @description TokenDisplay, TokenCounter 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenDisplay, TokenCounter } from './TokenDisplay';
import type { TokenEntity, TokenData } from '../../../types';

// tokenUtils 모킹
vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn((entity) => {
    if (!entity || !entity.tokens) return [];
    // 간단한 토큰 변환
    const result: TokenData[] = [];
    if (entity.tokens.turn) {
      entity.tokens.turn.forEach((t: { id: string; stacks: number }) => {
        result.push({
          ...t,
          name: t.id,
          emoji: '🔥',
          durationType: 'turn',
          category: 'negative',
          description: 'turn token',
        } as TokenData);
      });
    }
    if (entity.tokens.permanent) {
      entity.tokens.permanent.forEach((t: { id: string; stacks: number }) => {
        result.push({
          ...t,
          name: t.id,
          emoji: '✨',
          durationType: 'permanent',
          category: 'positive',
          description: 'permanent token',
        } as TokenData);
      });
    }
    if (entity.tokens.usage) {
      entity.tokens.usage.forEach((t: { id: string; stacks: number }) => {
        result.push({
          ...t,
          name: t.id,
          emoji: '⚡',
          durationType: 'usage',
          category: 'positive',
          description: 'usage token',
        } as TokenData);
      });
    }
    return result;
  }),
}));

// 테스트용 엔티티 생성
function createMockEntity(tokens?: { turn?: Array<{id: string; stacks: number}>; permanent?: Array<{id: string; stacks: number}>; usage?: Array<{id: string; stacks: number}> }): TokenEntity {
  return {
    tokens: tokens || null,
  } as TokenEntity;
}

describe('TokenDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('토큰이 없으면 null 반환', () => {
      const { container } = render(<TokenDisplay entity={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('빈 토큰 상태면 null 반환', () => {
      const entity = createMockEntity();
      const { container } = render(<TokenDisplay entity={entity} />);
      expect(container.firstChild).toBeNull();
    });

    it('턴 토큰 표시', () => {
      const entity = createMockEntity({
        turn: [{ id: 'burning', stacks: 2 }],
      });
      render(<TokenDisplay entity={entity} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('영구 토큰 표시', () => {
      const entity = createMockEntity({
        permanent: [{ id: 'blessed', stacks: 1 }],
      });
      render(<TokenDisplay entity={entity} />);
      expect(screen.getByText('✨')).toBeInTheDocument();
    });

    it('사용 토큰 표시', () => {
      const entity = createMockEntity({
        usage: [{ id: 'charged', stacks: 3 }],
      });
      render(<TokenDisplay entity={entity} />);
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });
  });

  describe('position prop', () => {
    it('player 위치 (기본값)', () => {
      const entity = createMockEntity({
        turn: [{ id: 'test', stacks: 1 }],
      });
      const { container } = render(<TokenDisplay entity={entity} position="player" />);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveStyle({ alignItems: 'flex-start' });
    });

    it('enemy 위치', () => {
      const entity = createMockEntity({
        turn: [{ id: 'test', stacks: 1 }],
      });
      const { container } = render(<TokenDisplay entity={entity} position="enemy" />);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveStyle({ alignItems: 'flex-end' });
    });
  });

  describe('스택 표시', () => {
    it('스택 1개는 숫자 미표시', () => {
      const entity = createMockEntity({
        turn: [{ id: 'test', stacks: 1 }],
      });
      render(<TokenDisplay entity={entity} />);
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('스택 2개 이상은 숫자 표시', () => {
      const entity = createMockEntity({
        turn: [{ id: 'test', stacks: 3 }],
      });
      render(<TokenDisplay entity={entity} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('여러 토큰 그룹', () => {
    it('모든 타입 토큰 동시 표시', () => {
      const entity = createMockEntity({
        permanent: [{ id: 'perm1', stacks: 1 }],
        usage: [{ id: 'usage1', stacks: 2 }],
        turn: [{ id: 'turn1', stacks: 3 }],
      });
      render(<TokenDisplay entity={entity} />);
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });
  });
});

describe('TokenCounter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('토큰이 없으면 null 반환', () => {
      const { container } = render(<TokenCounter entity={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('긍정/부정 토큰 카운트 표시', () => {
      const entity = createMockEntity({
        permanent: [{ id: 'positive1', stacks: 2 }],
        turn: [{ id: 'negative1', stacks: 3 }],
      });
      render(<TokenCounter entity={entity} />);
      expect(screen.getByText(/✨ 2/)).toBeInTheDocument();
      expect(screen.getByText(/💀 3/)).toBeInTheDocument();
    });

    it('긍정 토큰만 있을 때', () => {
      const entity = createMockEntity({
        permanent: [{ id: 'positive1', stacks: 5 }],
      });
      render(<TokenCounter entity={entity} />);
      expect(screen.getByText(/✨ 5/)).toBeInTheDocument();
      expect(screen.queryByText(/💀/)).not.toBeInTheDocument();
    });

    it('부정 토큰만 있을 때', () => {
      const entity = createMockEntity({
        turn: [{ id: 'negative1', stacks: 4 }],
      });
      render(<TokenCounter entity={entity} />);
      expect(screen.getByText(/💀 4/)).toBeInTheDocument();
      expect(screen.queryByText(/✨/)).not.toBeInTheDocument();
    });
  });
});
