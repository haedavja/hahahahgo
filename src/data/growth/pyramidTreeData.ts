/**
 * @file pyramidTreeData.ts
 * @description 피라미드 트리 구조 정의
 *
 * 피라미드 구조:
 * - 1단계 에토스 (6개): 개성 1회 획득 시 자동 해금
 * - 2단계 파토스 (6개): 개성 1회 획득 시 상위 노드 해금 가능
 * - 3단계 에토스 (6개): 개성 2회 획득 시 상위 노드 해금 가능
 * - 4단계 파토스 (5개): 인접 하위 노드 2개 해금 필요
 * - 5단계 에토스 (4개): 인접 하위 노드 2개 해금 필요
 * - 6단계 파토스 (3개): 인접 하위 노드 2개 해금 필요
 * - 정점: 자아 + 로고스
 */

// 개성 ID (1단계 에토스와 동일)
export type TraitId = 'bravery' | 'steadfast' | 'composure' | 'vitality' | 'passion' | 'thorough';

// 개성 한글명 → ID 매핑
export const TRAIT_NAME_TO_ID: Record<string, TraitId> = {
  '용맹함': 'bravery',
  '굳건함': 'steadfast',
  '냉철함': 'composure',
  '활력적': 'vitality',
  '열정적': 'passion',
  '철저함': 'thorough',
};

// 개성별 노드 경로 (1단계 → 2단계 → 3단계)
export const TRAIT_NODE_PATH: Record<TraitId, { tier1: string; tier2: string; tier3: string }> = {
  bravery: {
    tier1: 'bravery',      // 용맹함
    tier2: 'pierce',       // 관통
    tier3: 'advance',      // 전진
  },
  steadfast: {
    tier1: 'steadfast',    // 굳건함
    tier2: 'ignite',       // 점화
    tier3: 'constancy',    // 불변
  },
  composure: {
    tier1: 'composure',    // 냉철함
    tier2: 'defense',      // 방어
    tier3: 'competence',   // 유능
  },
  vitality: {
    tier1: 'vitality',     // 활력적
    tier2: 'focus',        // 집중
    tier3: 'persistence',  // 끈기
  },
  passion: {
    tier1: 'passion',      // 열정적
    tier2: 'chain',        // 연쇄
    tier3: 'endurance',    // 인내
  },
  thorough: {
    tier1: 'thorough',     // 철저함
    tier2: 'recovery',     // 회복
    tier3: 'confirmation', // 확인
  },
};

// 노드 순서 (피라미드 구조에서 좌→우)
export const NODE_ORDER = {
  tier1: ['bravery', 'steadfast', 'composure', 'vitality', 'passion', 'thorough'],
  tier2: ['pierce', 'ignite', 'defense', 'focus', 'chain', 'recovery'],
  tier3: ['advance', 'constancy', 'competence', 'persistence', 'endurance', 'confirmation'],
  tier4: ['ironman', 'glacier', 'pride', 'diligence', 'expertise'],
  tier5: ['emperor', 'grit', 'respect', 'dignity'],
  tier6: ['ultimate', 'transcend', 'fusion'],
};

// 4단계 이상 노드의 필요 하위 노드 (인접 2개)
export const NODE_REQUIREMENTS: Record<string, [string, string]> = {
  // 4단계 파토스 (3단계 에토스 2개 필요)
  ironman: ['advance', 'constancy'],
  glacier: ['constancy', 'competence'],
  pride: ['competence', 'persistence'],
  diligence: ['persistence', 'endurance'],
  expertise: ['endurance', 'confirmation'],

  // 5단계 에토스 (4단계 파토스 2개 필요)
  emperor: ['ironman', 'glacier'],
  grit: ['glacier', 'pride'],
  respect: ['pride', 'diligence'],
  dignity: ['diligence', 'expertise'],

  // 6단계 파토스 (5단계 에토스 2개 필요)
  ultimate: ['emperor', 'grit'],
  transcend: ['grit', 'respect'],
  fusion: ['respect', 'dignity'],
};

// 노드 해금에 필요한 개성 횟수 계산
export interface NodeUnlockRequirement {
  nodeId: string;
  tier: number;
  type: 'ethos' | 'pathos';
  // 필요 개성 (tier 1-3용)
  requiredTrait?: TraitId;
  requiredTraitCount?: number;
  // 필요 하위 노드 (tier 4+용)
  requiredNodes?: [string, string];
}

/**
 * 노드 해금 가능 여부 확인
 */
export function canUnlockNode(
  nodeId: string,
  traitCounts: Record<string, number>,
  unlockedNodes: string[]
): { canUnlock: boolean; reason?: string } {
  // 1단계 에토스: 개성 1회 획득 시 자동 해금
  if (NODE_ORDER.tier1.includes(nodeId)) {
    const count = traitCounts[nodeId] || 0;
    if (count >= 1) {
      return { canUnlock: true };
    }
    return { canUnlock: false, reason: `개성 '${getTraitName(nodeId)}' 1회 필요` };
  }

  // 2단계 파토스: 해당 개성 1회 획득 필요
  if (NODE_ORDER.tier2.includes(nodeId)) {
    const traitId = getTraitForNode(nodeId, 2);
    if (!traitId) return { canUnlock: false, reason: '매핑 오류' };

    const count = traitCounts[traitId] || 0;
    if (count >= 1) {
      return { canUnlock: true };
    }
    return { canUnlock: false, reason: `개성 '${getTraitName(traitId)}' 1회 필요` };
  }

  // 3단계 에토스: 해당 개성 2회 획득 필요
  if (NODE_ORDER.tier3.includes(nodeId)) {
    const traitId = getTraitForNode(nodeId, 3);
    if (!traitId) return { canUnlock: false, reason: '매핑 오류' };

    const count = traitCounts[traitId] || 0;
    if (count >= 2) {
      return { canUnlock: true };
    }
    return { canUnlock: false, reason: `개성 '${getTraitName(traitId)}' 2회 필요 (현재 ${count}회)` };
  }

  // 4단계 이상: 인접 하위 노드 2개 해금 필요
  const requirements = NODE_REQUIREMENTS[nodeId];
  if (requirements) {
    const [req1, req2] = requirements;
    const hasReq1 = unlockedNodes.includes(req1);
    const hasReq2 = unlockedNodes.includes(req2);

    if (hasReq1 && hasReq2) {
      return { canUnlock: true };
    }

    const missing: string[] = [];
    if (!hasReq1) missing.push(getNodeName(req1));
    if (!hasReq2) missing.push(getNodeName(req2));

    return { canUnlock: false, reason: `필요: ${missing.join(', ')}` };
  }

  return { canUnlock: false, reason: '알 수 없는 노드' };
}

/**
 * 노드에 해당하는 개성 ID 반환
 */
function getTraitForNode(nodeId: string, tier: number): TraitId | null {
  for (const [traitId, path] of Object.entries(TRAIT_NODE_PATH)) {
    if (tier === 2 && path.tier2 === nodeId) return traitId as TraitId;
    if (tier === 3 && path.tier3 === nodeId) return traitId as TraitId;
  }
  return null;
}

/**
 * 개성 한글명 반환
 */
function getTraitName(traitId: string): string {
  const names: Record<string, string> = {
    bravery: '용맹함',
    steadfast: '굳건함',
    composure: '냉철함',
    vitality: '활력적',
    passion: '열정적',
    thorough: '철저함',
  };
  return names[traitId] || traitId;
}

/**
 * 노드 한글명 반환
 */
function getNodeName(nodeId: string): string {
  const names: Record<string, string> = {
    // 2단계 파토스
    pierce: '관통',
    ignite: '점화',
    defense: '방어',
    focus: '집중',
    chain: '연쇄',
    recovery: '회복',
    // 3단계 에토스
    advance: '전진',
    constancy: '불변',
    competence: '유능',
    persistence: '끈기',
    endurance: '인내',
    confirmation: '확인',
    // 4단계 파토스
    ironman: '철인',
    glacier: '빙하',
    pride: '긍지',
    diligence: '성실',
    expertise: '전문',
    // 5단계 에토스
    emperor: '제왕',
    grit: '근성',
    respect: '존경',
    dignity: '위엄',
    // 6단계 파토스
    ultimate: '극한',
    transcend: '초월',
    fusion: '융합',
  };
  return names[nodeId] || nodeId;
}

/**
 * 개성 획득 시 자동 해금되는 노드 목록 반환
 */
export function getAutoUnlockNodes(
  traitId: TraitId,
  newCount: number,
  currentUnlockedNodes: string[]
): string[] {
  const toUnlock: string[] = [];
  const path = TRAIT_NODE_PATH[traitId];

  if (!path) return toUnlock;

  // 1회 획득: 1단계 에토스 해금
  if (newCount >= 1 && !currentUnlockedNodes.includes(path.tier1)) {
    toUnlock.push(path.tier1);
  }

  // 노드는 스킬포인트로 직접 해금해야 함 (자동 해금 아님)
  // 여기서는 해금 "가능" 상태만 체크용으로 사용

  return toUnlock;
}

/**
 * 노드의 티어 반환
 */
export function getNodeTier(nodeId: string): number {
  if (NODE_ORDER.tier1.includes(nodeId)) return 1;
  if (NODE_ORDER.tier2.includes(nodeId)) return 2;
  if (NODE_ORDER.tier3.includes(nodeId)) return 3;
  if (NODE_ORDER.tier4.includes(nodeId)) return 4;
  if (NODE_ORDER.tier5.includes(nodeId)) return 5;
  if (NODE_ORDER.tier6.includes(nodeId)) return 6;
  return 0;
}

/**
 * 노드의 타입 반환
 */
export function getNodeType(nodeId: string): 'ethos' | 'pathos' {
  const tier = getNodeTier(nodeId);
  // 홀수 티어 = 에토스, 짝수 티어 = 파토스
  return tier % 2 === 1 ? 'ethos' : 'pathos';
}
