/**
 * @file PyramidConnections.tsx
 * @description 피라미드 노드 간 연결선을 SVG로 렌더링
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { TRAIT_NODE_PATH, NODE_REQUIREMENTS, NODE_ORDER } from '../../data/growth/pyramidTreeData';
import { COLORS } from '../../styles/theme';

// 노드 간 연결 정의
interface Connection {
  from: string;
  to: string;
  tier: number; // 상위 노드의 티어
}

// 모든 연결 생성
function generateConnections(): Connection[] {
  const connections: Connection[] = [];

  // Tier 1 → Tier 2 (개성 → 파토스)
  Object.entries(TRAIT_NODE_PATH).forEach(([, path]) => {
    connections.push({ from: path.tier1, to: path.tier2, tier: 2 });
  });

  // Tier 2 → Tier 3 (파토스 → 에토스)
  Object.entries(TRAIT_NODE_PATH).forEach(([, path]) => {
    connections.push({ from: path.tier2, to: path.tier3, tier: 3 });
  });

  // Tier 3+ → 상위 티어 (NODE_REQUIREMENTS 역매핑)
  Object.entries(NODE_REQUIREMENTS).forEach(([parentNode, [child1, child2]]) => {
    const tier = NODE_ORDER.tier4.includes(parentNode) ? 4 :
                 NODE_ORDER.tier5.includes(parentNode) ? 5 : 6;
    connections.push({ from: child1, to: parentNode, tier });
    connections.push({ from: child2, to: parentNode, tier });
  });

  return connections;
}

const ALL_CONNECTIONS = generateConnections();

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PyramidConnectionsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  unlockedNodes: string[];
}

export const PyramidConnections = memo(function PyramidConnections({
  containerRef,
  unlockedNodes,
}: PyramidConnectionsProps) {
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 노드 위치 측정
  const measurePositions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    setContainerSize({
      width: container.scrollWidth,
      height: container.scrollHeight,
    });

    const newPositions: Record<string, NodePosition> = {};

    // 모든 노드 ID 수집
    const allNodeIds = [
      ...NODE_ORDER.tier1,
      ...NODE_ORDER.tier2,
      ...NODE_ORDER.tier3,
      ...NODE_ORDER.tier4,
      ...NODE_ORDER.tier5,
      ...NODE_ORDER.tier6,
    ];

    allNodeIds.forEach((nodeId) => {
      const element = container.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        // 컨테이너 기준 상대 좌표 계산
        newPositions[nodeId] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      }
    });

    setPositions(newPositions);
  }, [containerRef]);

  // 위치 측정 (초기 + 리사이즈 + 노드 변경)
  useEffect(() => {
    // 초기 측정 (렌더링 완료 후)
    const timer = setTimeout(measurePositions, 200);
    const timer2 = setTimeout(measurePositions, 500); // 추가 측정

    // 리사이즈 시 재측정
    window.addEventListener('resize', measurePositions);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', measurePositions);
    };
  }, [measurePositions, unlockedNodes]);

  // 연결선 색상 결정
  const getLineColor = (from: string, to: string, tier: number) => {
    const fromUnlocked = unlockedNodes.includes(from);
    const toUnlocked = unlockedNodes.includes(to);

    if (fromUnlocked && toUnlocked) {
      // 둘 다 해금됨 - 티어 색상
      return COLORS.tier[tier as keyof typeof COLORS.tier]?.text || COLORS.success;
    } else if (fromUnlocked) {
      // 출발점만 해금됨 - 진행 가능 표시
      return 'rgba(251, 191, 36, 0.7)';
    } else {
      // 둘 다 잠김
      return 'rgba(100, 116, 139, 0.4)';
    }
  };

  // 연결선 두께 결정
  const getLineWidth = (from: string, to: string) => {
    const fromUnlocked = unlockedNodes.includes(from);
    const toUnlocked = unlockedNodes.includes(to);

    if (fromUnlocked && toUnlocked) return 3;
    if (fromUnlocked) return 2.5;
    return 1.5;
  };

  // 위치가 측정되지 않았으면 빈 SVG 렌더링 (크기 확보용)
  const hasPositions = Object.keys(positions).length > 0;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: containerSize.width || '100%',
        height: containerSize.height || '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      {hasPositions && ALL_CONNECTIONS.map(({ from, to, tier }) => {
        const fromPos = positions[from];
        const toPos = positions[to];

        if (!fromPos || !toPos) return null;

        const color = getLineColor(from, to, tier);
        const width = getLineWidth(from, to);

        // 직선 또는 부드러운 곡선
        // 피라미드 구조상 위쪽(y가 작은)이 to, 아래쪽이 from
        const dy = toPos.y - fromPos.y;
        const dx = toPos.x - fromPos.x;

        // 수직에 가까우면 직선, 아니면 곡선
        const isVertical = Math.abs(dx) < 30;

        let pathD: string;
        if (isVertical) {
          // 직선
          pathD = `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
        } else {
          // 베지어 곡선 (S자 형태)
          const midY = (fromPos.y + toPos.y) / 2;
          pathD = `M ${fromPos.x} ${fromPos.y}
                   C ${fromPos.x} ${midY},
                     ${toPos.x} ${midY},
                     ${toPos.x} ${toPos.y}`;
        }

        return (
          <path
            key={`${from}-${to}`}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
});

export default PyramidConnections;
