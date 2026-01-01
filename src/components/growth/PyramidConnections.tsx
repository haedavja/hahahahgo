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
  Object.entries(TRAIT_NODE_PATH).forEach(([traitId, path]) => {
    connections.push({ from: path.tier1, to: path.tier2, tier: 2 });
  });

  // Tier 2 → Tier 3 (파토스 → 에토스)
  Object.entries(TRAIT_NODE_PATH).forEach(([traitId, path]) => {
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
    const scrollTop = container.scrollTop;

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
        newPositions[nodeId] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + scrollTop + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      }
    });

    setPositions(newPositions);
  }, [containerRef]);

  // 위치 측정 (초기 + 리사이즈)
  useEffect(() => {
    // 초기 측정 (약간 딜레이로 렌더링 완료 후)
    const timer = setTimeout(measurePositions, 100);

    // 리사이즈 시 재측정
    window.addEventListener('resize', measurePositions);

    // MutationObserver로 DOM 변화 감지
    const observer = new MutationObserver(measurePositions);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measurePositions);
      observer.disconnect();
    };
  }, [measurePositions, containerRef]);

  // 연결선 색상 결정
  const getLineColor = (from: string, to: string, tier: number) => {
    const fromUnlocked = unlockedNodes.includes(from);
    const toUnlocked = unlockedNodes.includes(to);

    if (fromUnlocked && toUnlocked) {
      // 둘 다 해금됨 - 티어 색상
      return COLORS.tier[tier as keyof typeof COLORS.tier]?.text || COLORS.success;
    } else if (fromUnlocked) {
      // 출발점만 해금됨 - 진행 가능 표시
      return 'rgba(251, 191, 36, 0.6)'; // 노란색 (진행 가능)
    } else {
      // 둘 다 잠김
      return 'rgba(71, 85, 105, 0.3)'; // 어두운 회색
    }
  };

  // 연결선 두께 결정
  const getLineWidth = (from: string, to: string) => {
    const fromUnlocked = unlockedNodes.includes(from);
    const toUnlocked = unlockedNodes.includes(to);

    if (fromUnlocked && toUnlocked) return 3;
    if (fromUnlocked) return 2;
    return 1;
  };

  if (Object.keys(positions).length === 0) {
    return null;
  }

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
      }}
    >
      <defs>
        {/* 그라데이션 정의 (진행 가능 경로) */}
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(251, 191, 36, 0.8)" />
          <stop offset="100%" stopColor="rgba(251, 191, 36, 0.3)" />
        </linearGradient>
      </defs>

      {ALL_CONNECTIONS.map(({ from, to, tier }) => {
        const fromPos = positions[from];
        const toPos = positions[to];

        if (!fromPos || !toPos) return null;

        const color = getLineColor(from, to, tier);
        const width = getLineWidth(from, to);

        // 곡선 경로 계산 (베지어 곡선)
        const midY = (fromPos.y + toPos.y) / 2;
        const controlOffset = Math.abs(toPos.y - fromPos.y) * 0.3;

        const path = `M ${fromPos.x} ${fromPos.y}
                      C ${fromPos.x} ${fromPos.y - controlOffset},
                        ${toPos.x} ${toPos.y + controlOffset},
                        ${toPos.x} ${toPos.y}`;

        return (
          <path
            key={`${from}-${to}`}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
});

export default PyramidConnections;
