/**
 * @file growth-system.ts
 * @description 피라미드 성장 시스템 시뮬레이터 통합
 *
 * ## 피라미드 구조
 * - 1단계: 기초 에토스 (자동 해금)
 * - 2단계: 파토스 노드 (검 vs 총 선택)
 * - 3단계: 에토스 노드 (2개 중 1개 선택)
 * - 4단계: 파토스 노드 (검 vs 총 선택)
 * - 5단계: 상위 에토스 노드 (2개 중 1개 선택)
 * - 6-7단계: 로고스 해금
 */

import { BASE_ETHOS, TIER3_ETHOS, TIER5_ETHOS, ETHOS_NODES, type Ethos, type EthosNode } from '../../data/growth/ethosData';
import { TIER2_PATHOS, PATHOS_NODES, type Pathos, type PathosNode } from '../../data/growth/pathosData';
import { LOGOS, getLogosLevelFromPyramid, type LogosType, type Logos } from '../../data/growth/logosData';
import type { IdentityType } from '../../data/growth/identityData';
import type { RunStrategy } from '../game/run-simulator';

// ==================== 타입 정의 ====================

export interface GrowthState {
  /** 피라미드 레벨 (0-7) */
  pyramidLevel: number;
  /** 스킬 포인트 */
  skillPoints: number;
  /** 해금된 에토스 ID 목록 */
  unlockedEthos: string[];
  /** 해금된 파토스 ID 목록 */
  unlockedPathos: string[];
  /** 해금된 노드 ID 목록 */
  unlockedNodes: string[];
  /** 선택한 자아 */
  identities: IdentityType[];
  /** 로고스 레벨 */
  logosLevels: {
    common: number;
    gunkata: number;
    battleWaltz: number;
  };
  /** 장착된 파토스 */
  equippedPathos: string[];
  /** 개성 목록 (1단계 에토스와 연동) */
  traits: string[];
}

export interface GrowthBonuses {
  /** 최대 HP 보너스 */
  maxHpBonus: number;
  /** 공격력 보너스 */
  attackBonus: number;
  /** 방어력 보너스 */
  blockBonus: number;
  /** 치명타 확률 보너스 */
  critBonus: number;
  /** 속도 보너스 */
  speedBonus: number;
  /** 기교 시작 보너스 */
  startingFinesse: number;
  /** 집중 시작 보너스 */
  startingFocus: number;
  /** 탄약 보너스 */
  ammoBonus: number;
  /** 연계 피해 보너스 */
  chainDamageBonus: number;
  /** 교차 범위 확장 */
  crossRangeBonus: number;
  /** 에테르 획득량 고정 보너스 */
  etherGainBonus: number;
  /** 에테르 획득량 배율 보너스 (0.1 = 10%) */
  etherGainMultiplier: number;
  /** 시작 에테르 */
  startingEther: number;
  /** 로고스 효과 */
  logosEffects: LogosEffects;
  /** 특수 효과 목록 */
  specialEffects: string[];
}

/** 로고스 효과 상세 */
export interface LogosEffects {
  // 공용 로고스
  /** 교차 범위 확장 (±1) */
  expandCrossRange: boolean;
  /** 보조특기 슬롯 추가 */
  extraSubSlots: number;
  /** 주특기 슬롯 추가 */
  extraMainSlots: number;

  // 건카타 로고스
  /** 방어로 막을 때 총격 */
  blockToShoot: boolean;
  /** 탄걸림 확률 감소 (5% → 3%) */
  reduceJamChance: boolean;
  /** 총격 치명타 보너스 및 치명타시 장전 */
  gunCritBonus: number;
  gunCritReload: boolean;

  // 배틀왈츠 로고스
  /** 기교 최소 1 유지 */
  minFinesse: boolean;
  /** 검격 방어력에 50% 추가피해 */
  armorPenetration: number;
  /** 공격시 흐릿함, 방어시 수세 */
  combatTokens: boolean;
}

export interface GrowthSelectionOption {
  id: string;
  name: string;
  type: 'ethos' | 'pathos' | 'logos';
  description: string;
  isRecommended: boolean;
  reason?: string;
}

// ==================== 초기 상태 ====================

export function createInitialGrowthState(): GrowthState {
  return {
    pyramidLevel: 0,
    skillPoints: 0,
    unlockedEthos: [],
    unlockedPathos: [],
    unlockedNodes: [],
    identities: [],
    logosLevels: { common: 0, gunkata: 0, battleWaltz: 0 },
    equippedPathos: [],
    traits: [],
  };
}

// ==================== 성장 시스템 클래스 ====================

export class GrowthSystem {
  private state: GrowthState;

  constructor(initialState?: Partial<GrowthState>) {
    this.state = { ...createInitialGrowthState(), ...initialState };
  }

  /**
   * 상태 가져오기
   */
  getState(): GrowthState {
    return { ...this.state };
  }

  /**
   * 피라미드 레벨업
   */
  levelUp(): void {
    if (this.state.pyramidLevel < 7) {
      this.state.pyramidLevel++;
      this.state.skillPoints++;
    }
  }

  /**
   * 개성 획득 (1단계 에토스와 연동)
   */
  addTrait(traitName: string): void {
    if (!this.state.traits.includes(traitName)) {
      this.state.traits.push(traitName);

      // 개성에 해당하는 기초 에토스 자동 해금
      const traitToEthos: Record<string, string> = {
        '용맹함': 'bravery',
        '굳건함': 'steadfast',
        '냉철함': 'composure',
        '철저함': 'thorough',
        '열정적': 'passion',
        '활력적': 'vitality',
      };

      const ethosId = traitToEthos[traitName];
      if (ethosId && !this.state.unlockedEthos.includes(ethosId)) {
        this.state.unlockedEthos.push(ethosId);
      }

      // 피라미드 레벨 계산
      this.updatePyramidLevel();
    }
  }

  /**
   * 피라미드 레벨 자동 계산
   */
  private updatePyramidLevel(): void {
    const traitCount = this.state.traits.length;
    // 개성 2개당 피라미드 1레벨 (최대 7)
    const newLevel = Math.min(7, Math.floor(traitCount / 2) + (traitCount > 0 ? 1 : 0));

    if (newLevel > this.state.pyramidLevel) {
      const levelGain = newLevel - this.state.pyramidLevel;
      this.state.pyramidLevel = newLevel;
      this.state.skillPoints += levelGain;
    }
  }

  /**
   * 에토스 선택
   */
  selectEthos(ethosId: string): boolean {
    const ethos = this.getAllEthos()[ethosId];
    if (!ethos) return false;

    // 이미 해금됨
    if (this.state.unlockedEthos.includes(ethosId)) return false;

    // 피라미드 레벨 체크
    if (this.state.pyramidLevel < ethos.pyramidLevel) return false;

    // 노드 선택지인 경우 노드 해금 필요
    if (ethos.nodeId) {
      if (!this.state.unlockedNodes.includes(ethos.nodeId)) {
        // 노드 먼저 해금
        if (this.state.skillPoints < 1) return false;
        this.state.unlockedNodes.push(ethos.nodeId);
        this.state.skillPoints--;
      }
    }

    this.state.unlockedEthos.push(ethosId);
    return true;
  }

  /**
   * 파토스 선택
   */
  selectPathos(pathosId: string): boolean {
    const pathos = this.getAllPathos()[pathosId];
    if (!pathos) return false;

    // 이미 해금됨
    if (this.state.unlockedPathos.includes(pathosId)) return false;

    // 피라미드 레벨 체크
    if (this.state.pyramidLevel < pathos.pyramidLevel) return false;

    // 스킬포인트 필요
    if (this.state.skillPoints < 1) return false;

    // 노드 선택지인 경우 노드 해금
    if (pathos.nodeId && !this.state.unlockedNodes.includes(pathos.nodeId)) {
      this.state.unlockedNodes.push(pathos.nodeId);
    }

    this.state.unlockedPathos.push(pathosId);
    this.state.skillPoints--;
    return true;
  }

  /**
   * 자아 선택
   */
  selectIdentity(identity: IdentityType): boolean {
    // 피라미드 레벨 6 필요
    if (this.state.pyramidLevel < 6) return false;

    if (!this.state.identities.includes(identity)) {
      this.state.identities.push(identity);
      return true;
    }
    return false;
  }

  /**
   * 로고스 해금
   */
  unlockLogos(logosType: LogosType): boolean {
    if (this.state.skillPoints < 1) return false;

    const currentLevel = this.state.logosLevels[logosType];
    if (currentLevel >= 3) return false;

    // 요구 피라미드 레벨 체크
    const maxAllowedLevel = getLogosLevelFromPyramid(this.state.pyramidLevel);
    if (currentLevel >= maxAllowedLevel) return false;

    // 자아 체크
    if (logosType === 'gunkata' && !this.state.identities.includes('gunslinger')) return false;
    if (logosType === 'battleWaltz' && !this.state.identities.includes('swordsman')) return false;
    if (logosType === 'common' && this.state.identities.length === 0) return false;

    this.state.logosLevels[logosType]++;
    this.state.skillPoints--;
    return true;
  }

  /**
   * 파토스 장착 (전투 전)
   */
  equipPathos(pathosIds: string[]): void {
    const validIds = pathosIds
      .filter(id => this.state.unlockedPathos.includes(id))
      .slice(0, 3); // 최대 3개
    this.state.equippedPathos = validIds;
  }

  /**
   * 성장 보너스 계산
   */
  calculateBonuses(): GrowthBonuses {
    const bonuses: GrowthBonuses = {
      maxHpBonus: 0,
      attackBonus: 0,
      blockBonus: 0,
      critBonus: 0,
      speedBonus: 0,
      startingFinesse: 0,
      startingFocus: 0,
      ammoBonus: 0,
      chainDamageBonus: 0,
      crossRangeBonus: 0,
      etherGainBonus: 0,
      etherGainMultiplier: 0,
      startingEther: 0,
      logosEffects: {
        expandCrossRange: false,
        extraSubSlots: 0,
        extraMainSlots: 0,
        blockToShoot: false,
        reduceJamChance: false,
        gunCritBonus: 0,
        gunCritReload: false,
        minFinesse: false,
        armorPenetration: 0,
        combatTokens: false,
      },
      specialEffects: [],
    };

    const allEthos = this.getAllEthos();
    const allPathos = this.getAllPathos();

    // 에토스 효과 적용
    for (const ethosId of this.state.unlockedEthos) {
      const ethos = allEthos[ethosId];
      if (!ethos) continue;

      const effect = ethos.effect;
      switch (effect.action) {
        case 'maxHpBonus':
          bonuses.maxHpBonus += effect.value || 0;
          break;
        case 'attackBonus':
          bonuses.attackBonus += effect.value || 0;
          break;
        case 'critBonus':
          bonuses.critBonus += effect.percent || 0;
          break;
        case 'ammoBonus':
          bonuses.ammoBonus += effect.value || 0;
          break;
        case 'damageBonus':
          if (effect.trigger === 'chain') {
            bonuses.chainDamageBonus += effect.value || 0;
          } else {
            bonuses.attackBonus += effect.value || 0;
          }
          break;
        case 'speedBonus':
          bonuses.speedBonus += effect.value || 0;
          break;
        case 'addToken':
          if (effect.trigger === 'battleStart') {
            if (effect.token === 'finesse') bonuses.startingFinesse += effect.value || 0;
            if (effect.token === 'focus') bonuses.startingFocus += effect.value || 0;
          }
          break;
        case 'etherBonus':
          bonuses.etherGainBonus += effect.value || 0;
          break;
        case 'etherMultiplier':
          bonuses.etherGainMultiplier += effect.percent || 0;
          break;
        case 'startingEther':
          bonuses.startingEther += effect.value || 0;
          break;
        default:
          // 특수 효과로 저장
          bonuses.specialEffects.push(`${ethos.name}: ${ethos.description}`);
      }
    }

    // 파토스 효과는 전투 중 사용 (여기선 패시브만)
    for (const pathosId of this.state.unlockedPathos) {
      const pathos = allPathos[pathosId];
      if (!pathos) continue;
      // 파토스는 액티브 스킬이므로 패시브 보너스 없음
    }

    // 로고스 효과 적용
    const commonLevel = this.state.logosLevels.common;
    const gunkataLevel = this.state.logosLevels.gunkata;
    const battleWaltzLevel = this.state.logosLevels.battleWaltz;

    // 공용 로고스
    if (commonLevel >= 1) {
      bonuses.crossRangeBonus += 1;
      bonuses.logosEffects.expandCrossRange = true;
      bonuses.specialEffects.push('공용 Lv1: 교차 범위 ±1 확장');
    }
    if (commonLevel >= 2) {
      bonuses.logosEffects.extraSubSlots = 2;
      bonuses.specialEffects.push('공용 Lv2: 보조특기 슬롯 +2');
    }
    if (commonLevel >= 3) {
      bonuses.logosEffects.extraMainSlots = 1;
      bonuses.specialEffects.push('공용 Lv3: 주특기 슬롯 +1');
    }
    bonuses.etherGainMultiplier += commonLevel * 0.05;

    // 건카타 로고스
    if (gunkataLevel >= 1) {
      bonuses.logosEffects.blockToShoot = true;
      bonuses.specialEffects.push('건카타 Lv1: 방어로 막을 때 총격');
    }
    if (gunkataLevel >= 2) {
      bonuses.logosEffects.reduceJamChance = true;
      bonuses.specialEffects.push('건카타 Lv2: 탄걸림 확률 5%→3%');
    }
    if (gunkataLevel >= 3) {
      bonuses.logosEffects.gunCritBonus = 3;
      bonuses.logosEffects.gunCritReload = true;
      bonuses.critBonus += 3;
      bonuses.specialEffects.push('건카타 Lv3: 총격 치명타 +3%, 치명타시 장전');
    }
    bonuses.startingEther += gunkataLevel * 10;

    // 배틀왈츠 로고스
    if (battleWaltzLevel >= 1) {
      bonuses.logosEffects.minFinesse = true;
      bonuses.startingFinesse += 1;
      bonuses.specialEffects.push('배틀왈츠 Lv1: 기교 최소 1 유지');
    }
    if (battleWaltzLevel >= 2) {
      bonuses.logosEffects.armorPenetration = 50;
      bonuses.specialEffects.push('배틀왈츠 Lv2: 검격 방어력에 50% 추가피해');
    }
    if (battleWaltzLevel >= 3) {
      bonuses.logosEffects.combatTokens = true;
      bonuses.specialEffects.push('배틀왈츠 Lv3: 공격시 흐릿함, 방어시 수세');
    }
    bonuses.etherGainBonus += battleWaltzLevel * 3;

    // 피라미드 레벨에 따른 기본 에테르 보너스
    bonuses.etherGainMultiplier += this.state.pyramidLevel * 0.02;

    return bonuses;
  }

  /**
   * 전략 기반 자동 성장 선택
   */
  autoGrow(strategy: RunStrategy): GrowthSelectionOption[] {
    const selections: GrowthSelectionOption[] = [];

    while (this.state.skillPoints > 0) {
      const option = this.getRecommendedSelection(strategy);
      if (!option) break;

      let success = false;
      if (option.type === 'ethos') {
        success = this.selectEthos(option.id);
      } else if (option.type === 'pathos') {
        success = this.selectPathos(option.id);
      } else if (option.type === 'logos') {
        success = this.unlockLogos(option.id as LogosType);
      }

      if (success) {
        selections.push(option);
      } else {
        break; // 선택 실패 시 중단
      }
    }

    return selections;
  }

  /**
   * 전략에 맞는 추천 선택
   */
  getRecommendedSelection(strategy: RunStrategy): GrowthSelectionOption | null {
    const level = this.state.pyramidLevel;

    // 현재 레벨에서 선택 가능한 옵션 찾기
    if (level >= 1) {
      // 기초 에토스 (1단계)
      const baseEthos = this.getAvailableBaseEthos();
      if (baseEthos.length > 0) {
        const recommended = this.selectBestEthos(baseEthos, strategy);
        if (recommended) {
          return {
            id: recommended.id,
            name: recommended.name,
            type: 'ethos',
            description: recommended.description,
            isRecommended: true,
            reason: `${strategy} 전략에 적합`,
          };
        }
      }
    }

    if (level >= 2) {
      // 파토스 노드 (2단계)
      const tier2Pathos = this.getAvailableTier2Pathos();
      if (tier2Pathos.length > 0) {
        const recommended = this.selectBestPathos(tier2Pathos, strategy);
        if (recommended) {
          return {
            id: recommended.id,
            name: recommended.name,
            type: 'pathos',
            description: recommended.description,
            isRecommended: true,
            reason: `${strategy} 전략에 적합`,
          };
        }
      }
    }

    if (level >= 3) {
      // 에토스 노드 (3단계)
      const tier3Ethos = this.getAvailableTier3Ethos();
      if (tier3Ethos.length > 0) {
        const recommended = this.selectBestEthos(tier3Ethos, strategy);
        if (recommended) {
          return {
            id: recommended.id,
            name: recommended.name,
            type: 'ethos',
            description: recommended.description,
            isRecommended: true,
          };
        }
      }

      // 로고스 (3단계 이상)
      if (this.state.identities.length > 0) {
        if (this.state.logosLevels.common < getLogosLevelFromPyramid(level)) {
          return {
            id: 'common',
            name: '공용 로고스',
            type: 'logos',
            description: LOGOS.common.levels[this.state.logosLevels.common]?.effect.description || '',
            isRecommended: true,
          };
        }
      }
    }

    if (level >= 5) {
      // 상위 에토스 (5단계)
      const tier5Ethos = this.getAvailableTier5Ethos();
      if (tier5Ethos.length > 0) {
        const recommended = this.selectBestEthos(tier5Ethos, strategy);
        if (recommended) {
          return {
            id: recommended.id,
            name: recommended.name,
            type: 'ethos',
            description: recommended.description,
            isRecommended: true,
          };
        }
      }
    }

    return null;
  }

  // ==================== 헬퍼 메서드 ====================

  private getAllEthos(): Record<string, Ethos> {
    return { ...BASE_ETHOS, ...TIER3_ETHOS, ...TIER5_ETHOS };
  }

  private getAllPathos(): Record<string, Pathos> {
    return { ...TIER2_PATHOS };
  }

  private getAvailableBaseEthos(): Ethos[] {
    return Object.values(BASE_ETHOS).filter(
      e => !this.state.unlockedEthos.includes(e.id)
    );
  }

  private getAvailableTier2Pathos(): Pathos[] {
    return Object.values(TIER2_PATHOS).filter(
      p => !this.state.unlockedPathos.includes(p.id)
    );
  }

  private getAvailableTier3Ethos(): Ethos[] {
    return Object.values(TIER3_ETHOS).filter(
      e => !this.state.unlockedEthos.includes(e.id)
    );
  }

  private getAvailableTier5Ethos(): Ethos[] {
    return Object.values(TIER5_ETHOS).filter(
      e => !this.state.unlockedEthos.includes(e.id)
    );
  }

  private selectBestEthos(options: Ethos[], strategy: RunStrategy): Ethos | null {
    if (options.length === 0) return null;

    // 전략별 선호 타입
    const preferredType = strategy === 'aggressive' ? 'sword'
      : strategy === 'defensive' ? 'common'
        : 'gun';

    // 선호 타입 먼저, 그 다음 랜덤
    const preferred = options.find(e => e.type === preferredType);
    if (preferred) return preferred;

    return options[Math.floor(Math.random() * options.length)];
  }

  private selectBestPathos(options: Pathos[], strategy: RunStrategy): Pathos | null {
    if (options.length === 0) return null;

    const preferredType = strategy === 'aggressive' ? 'sword' : 'gun';

    const preferred = options.find(p => p.type === preferredType);
    if (preferred) return preferred;

    return options[Math.floor(Math.random() * options.length)];
  }
}

// ==================== 팩토리 함수 ====================

export function createGrowthSystem(initialState?: Partial<GrowthState>): GrowthSystem {
  return new GrowthSystem(initialState);
}

/**
 * 성장 보너스를 전투 상태에 적용
 */
export function applyGrowthBonuses(
  playerState: { hp: number; maxHp: number; tokens?: Record<string, number>; ether?: number },
  bonuses: GrowthBonuses
): void {
  // 최대 HP 보너스
  playerState.maxHp += bonuses.maxHpBonus;
  playerState.hp = Math.min(playerState.hp + bonuses.maxHpBonus, playerState.maxHp);

  // 시작 토큰
  if (!playerState.tokens) playerState.tokens = {};
  if (bonuses.startingFinesse > 0) {
    playerState.tokens['finesse'] = (playerState.tokens['finesse'] || 0) + bonuses.startingFinesse;
  }
  if (bonuses.startingFocus > 0) {
    playerState.tokens['focus'] = (playerState.tokens['focus'] || 0) + bonuses.startingFocus;
  }

  // 시작 에테르
  if (bonuses.startingEther > 0) {
    playerState.ether = (playerState.ether || 0) + bonuses.startingEther;
  }
}
