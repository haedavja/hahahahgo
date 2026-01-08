// @vitest-environment happy-dom
/**
 * @file StatsTable.test.tsx
 * @description StatsTable 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsTable, StatsTableColumn } from './StatsTable';

interface TestData {
  id: number;
  name: string;
  score: number;
}

describe('StatsTable', () => {
  const mockData: TestData[] = [
    { id: 1, name: '플레이어1', score: 100 },
    { id: 2, name: '플레이어2', score: 85 },
    { id: 3, name: '플레이어3', score: 92 },
  ];

  const mockColumns: StatsTableColumn<TestData>[] = [
    { key: 'name', header: '이름' },
    { key: 'score', header: '점수', align: 'right' },
  ];

  const keyExtractor = (item: TestData) => String(item.id);

  describe('기본 렌더링', () => {
    it('테이블 헤더 표시', () => {
      render(<StatsTable data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);
      expect(screen.getByText('이름')).toBeInTheDocument();
      expect(screen.getByText('점수')).toBeInTheDocument();
    });

    it('모든 행 데이터 표시', () => {
      render(<StatsTable data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);
      expect(screen.getByText('플레이어1')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('플레이어2')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('플레이어3')).toBeInTheDocument();
      expect(screen.getByText('92')).toBeInTheDocument();
    });

    it('테이블 태그로 렌더링', () => {
      render(<StatsTable data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('빈 데이터', () => {
    it('기본 빈 메시지 표시', () => {
      render(<StatsTable data={[]} columns={mockColumns} keyExtractor={keyExtractor} />);
      expect(screen.getByText('데이터 없음')).toBeInTheDocument();
    });

    it('커스텀 빈 메시지 표시', () => {
      render(
        <StatsTable
          data={[]}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          emptyMessage="기록된 데이터가 없습니다"
        />
      );
      expect(screen.getByText('기록된 데이터가 없습니다')).toBeInTheDocument();
    });

    it('빈 데이터일 때 테이블 미표시', () => {
      render(<StatsTable data={[]} columns={mockColumns} keyExtractor={keyExtractor} />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('커스텀 렌더러', () => {
    it('커스텀 render 함수 사용', () => {
      const columnsWithRender: StatsTableColumn<TestData>[] = [
        { key: 'name', header: '이름' },
        {
          key: 'score',
          header: '점수',
          render: (item) => <span data-testid={`score-${item.id}`}>{item.score}점</span>
        },
      ];
      render(<StatsTable data={mockData} columns={columnsWithRender} keyExtractor={keyExtractor} />);
      expect(screen.getByTestId('score-1')).toHaveTextContent('100점');
      expect(screen.getByTestId('score-2')).toHaveTextContent('85점');
    });

    it('render 함수에 index 전달', () => {
      const columnsWithIndex: StatsTableColumn<TestData>[] = [
        {
          key: 'rank',
          header: '순위',
          render: (_item, index) => <span>{index + 1}위</span>
        },
        { key: 'name', header: '이름' },
      ];
      render(<StatsTable data={mockData} columns={columnsWithIndex} keyExtractor={keyExtractor} />);
      expect(screen.getByText('1위')).toBeInTheDocument();
      expect(screen.getByText('2위')).toBeInTheDocument();
      expect(screen.getByText('3위')).toBeInTheDocument();
    });
  });

  describe('정렬', () => {
    it('기본 왼쪽 정렬', () => {
      const { container } = render(
        <StatsTable data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />
      );
      const firstTh = container.querySelector('th');
      expect(firstTh).toHaveStyle({ textAlign: 'left' });
    });

    it('오른쪽 정렬 적용', () => {
      const { container } = render(
        <StatsTable data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />
      );
      const headers = container.querySelectorAll('th');
      expect(headers[1]).toHaveStyle({ textAlign: 'right' });
    });

    it('가운데 정렬 적용', () => {
      const centeredColumns: StatsTableColumn<TestData>[] = [
        { key: 'name', header: '이름', align: 'center' },
      ];
      const { container } = render(
        <StatsTable data={mockData} columns={centeredColumns} keyExtractor={keyExtractor} />
      );
      const th = container.querySelector('th');
      expect(th).toHaveStyle({ textAlign: 'center' });
    });
  });

  describe('keyExtractor', () => {
    it('인덱스 기반 키 추출', () => {
      const indexKeyExtractor = (_item: TestData, index: number) => `row-${index}`;
      const { container } = render(
        <StatsTable data={mockData} columns={mockColumns} keyExtractor={indexKeyExtractor} />
      );
      // 렌더링 성공 확인
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });
  });
});
