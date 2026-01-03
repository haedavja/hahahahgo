/**
 * @file item-system.ts
 * @description 시뮬레이터용 아이템 시스템
 *
 * 아이템 사용 시점:
 * - combat: 전투 대응단계에서만
 * - any: 언제든지 (시뮬레이터에서는 턴 시작 시 자동 사용)
 *
 * 아이템 효과:
 * - etherMultiplier: 에테르 획득 배율 증가
 * - etherSteal: 적 에테르 흡수
 * - damage: 즉시 피해
 * - defense: 방어력 획득
 * - grantTokens: 토큰 부여
 * - turnEnergy: 에너지 회복
 * - maxEnergy: 최대 에너지 증가
 * - cardDestroy: 적 카드 파괴
 * - cardFreeze: 적 타임라인 동결
 * - healPercent: 체력 % 회복
 * - statBoost: 스탯 증가 (힘/민첩/통찰)
 */

import type { PlayerState, EnemyState, GameBattleState, EffectValueRecord } from './game-types';
import { ITEMS, type Item, type ItemEffect } from '../../data/items';
import { addToken } from './token-system';

// ==================== 아이템 효과 결과 ====================

export interface ItemEffectResult {
  itemId: string;
  itemName: string;
  consumed: boolean;  // 아이템 소비 여부
  effects: {
    damage?: number;
    heal?: number;
    block?: number;
    energy?: number;
    maxEnergy?: number;
    ether?: number;
    etherMultiplier?: number;
    tokens?: Array<{ id: string; stacks: number }>;
    cardDestroy?: number;
    cardFreeze?: number;
    statBoost?: { stat: string; value: number };
    message?: string;
  };
}

// ==================== 아이템 시스템 클래스 ====================

export class ItemSystem {
  private usedItems: Set<string> = new Set();

  constructor() {}

  /**
   * 턴 시작 시 초기화
   */
  resetTurnState(): void {
    // 턴별 효과 초기화 (에테르 배율 등)
  }

  /**
   * 전투 시작 시 초기화
   */
  resetBattleState(): void {
    this.usedItems.clear();
  }

  /**
   * 아이템 정보 조회
   */
  getItem(itemId: string): Item | null {
    return ITEMS[itemId] || null;
  }

  /**
   * 아이템 사용 가능 여부 확인
   */
  canUseItem(itemId: string, usableIn: 'combat' | 'any', currentPhase: string): boolean {
    const item = this.getItem(itemId);
    if (!item) return false;

    // 이미 사용한 아이템은 사용 불가
    if (this.usedItems.has(itemId)) return false;

    // 전투용 아이템은 대응단계에서만
    if (item.usableIn === 'combat') {
      return currentPhase === 'respond';
    }

    // any 아이템은 언제든 사용 가능
    return true;
  }

  /**
   * 아이템 사용 처리
   */
  useItem(
    itemId: string,
    player: PlayerState,
    enemy: EnemyState,
    state: GameBattleState
  ): ItemEffectResult | null {
    const item = this.getItem(itemId);
    if (!item) return null;

    const result: ItemEffectResult = {
      itemId: item.id,
      itemName: item.name,
      consumed: true,
      effects: {},
    };

    const effect = item.effect;

    switch (effect.type) {
      case 'etherMultiplier':
        // 에테르 획득 배율 설정 (턴 종료까지)
        result.effects.etherMultiplier = effect.value;
        result.effects.message = `에테르 획득 ${effect.value}배`;
        break;

      case 'etherSteal':
        // 적 에테르 흡수
        const stealAmount = Math.min(effect.value, enemy.ether || 0);
        result.effects.ether = stealAmount;
        result.effects.message = `에테르 ${stealAmount} 흡수`;
        break;

      case 'damage':
        // 즉시 피해
        result.effects.damage = effect.value;
        result.effects.message = `${effect.value} 피해`;
        break;

      case 'defense':
        // 방어력 획득
        result.effects.block = effect.value;
        result.effects.message = `방어력 ${effect.value} 획득`;
        break;

      case 'grantTokens':
        // 토큰 부여
        result.effects.tokens = effect.tokens;
        const tokenNames = effect.tokens.map(t => `${t.id} ${t.stacks}`).join(', ');
        result.effects.message = `토큰 획득: ${tokenNames}`;
        break;

      case 'turnEnergy':
        // 에너지 회복
        result.effects.energy = effect.value;
        result.effects.message = `에너지 ${effect.value} 회복`;
        break;

      case 'maxEnergy':
        // 최대 에너지 증가
        result.effects.maxEnergy = effect.value;
        result.effects.message = `최대 에너지 +${effect.value}`;
        break;

      case 'cardDestroy':
        // 적 카드 파괴
        result.effects.cardDestroy = effect.value;
        result.effects.message = `적 카드 ${effect.value}장 파괴`;
        break;

      case 'cardFreeze':
        // 적 타임라인 동결
        result.effects.cardFreeze = effect.value;
        result.effects.message = `적 타임라인 ${effect.value}턴 동결`;
        break;

      case 'healPercent':
        // 체력 % 회복
        const healAmount = Math.floor(player.maxHp * (effect.value / 100));
        result.effects.heal = healAmount;
        result.effects.message = `체력 ${healAmount} 회복 (${effect.value}%)`;
        break;

      case 'statBoost':
        // 스탯 증가
        result.effects.statBoost = { stat: effect.stat, value: effect.value };
        result.effects.message = `${effect.stat} +${effect.value}`;
        break;
    }

    // 아이템 사용 완료 표시
    this.usedItems.add(itemId);

    return result;
  }

  /**
   * AI 전략: 어떤 아이템을 사용할지 결정
   * 시뮬레이터에서 자동으로 최적의 아이템 선택
   */
  selectItemToUse(
    items: string[],
    player: PlayerState,
    enemy: EnemyState,
    phase: string
  ): string | null {
    if (!items || items.length === 0) return null;

    // 사용 가능한 아이템 필터링
    const usableItems = items.filter(id => {
      const item = this.getItem(id);
      if (!item) return false;
      if (this.usedItems.has(id)) return false;

      // 전투용 아이템은 대응단계에서만
      if (item.usableIn === 'combat' && phase !== 'respond') return false;

      return true;
    });

    if (usableItems.length === 0) return null;

    // 우선순위에 따라 아이템 선택
    // 1. 체력이 낮으면 치유제 우선
    if (player.hp < player.maxHp * 0.3) {
      const healItem = usableItems.find(id => {
        const item = this.getItem(id);
        return item?.effect.type === 'healPercent';
      });
      if (healItem) return healItem;
    }

    // 2. 에너지가 부족하면 에너지 충전기
    if (player.energy <= 1) {
      const energyItem = usableItems.find(id => {
        const item = this.getItem(id);
        return item?.effect.type === 'turnEnergy';
      });
      if (energyItem) return energyItem;
    }

    // 3. 폭발물: 적 체력 50% 이하면 적극 사용
    if (enemy.hp < enemy.maxHp * 0.5) {
      const damageItem = usableItems.find(id => {
        const item = this.getItem(id);
        return item?.effect.type === 'damage';
      });
      if (damageItem) return damageItem;
    }

    // 4. 빙결 장치: 대응단계에서 적 카드가 많으면 사용
    if (phase === 'respond') {
      const freezeItem = usableItems.find(id => {
        const item = this.getItem(id);
        return item?.effect.type === 'cardFreeze';
      });
      if (freezeItem) return freezeItem;
    }

    // 5. 대응단계면 에테르 증폭제
    if (phase === 'respond') {
      const etherItem = usableItems.find(id => {
        const item = this.getItem(id);
        return item?.effect.type === 'etherMultiplier';
      });
      if (etherItem) return etherItem;
    }

    // 6. 그 외에는 첫 번째 아이템 사용
    return usableItems[0];
  }
}

// ==================== 싱글톤 인스턴스 ====================

let instance: ItemSystem | null = null;

export function getItemSystem(): ItemSystem {
  if (!instance) {
    instance = new ItemSystem();
  }
  return instance;
}

export function resetItemSystem(): void {
  instance = null;
}

/**
 * 아이템 효과를 플레이어/적 상태에 적용
 */
export function applyItemEffect(
  result: ItemEffectResult,
  player: PlayerState,
  enemy: EnemyState,
  state: GameBattleState
): void {
  const { effects } = result;

  // 피해 적용
  if (effects.damage) {
    const blocked = Math.min(effects.damage, enemy.block);
    const actualDamage = effects.damage - blocked;
    enemy.block -= blocked;
    enemy.hp -= actualDamage;
    state.playerDamageDealt = (state.playerDamageDealt || 0) + actualDamage;
  }

  // 회복 적용
  if (effects.heal) {
    player.hp = Math.min(player.maxHp, player.hp + effects.heal);
  }

  // 방어력 적용
  if (effects.block) {
    player.block += effects.block;
  }

  // 에너지 적용
  if (effects.energy) {
    player.energy += effects.energy;
  }

  // 최대 에너지 적용
  if (effects.maxEnergy) {
    player.maxEnergy += effects.maxEnergy;
    player.energy += effects.maxEnergy;
  }

  // 에테르 적용
  if (effects.ether) {
    player.ether += effects.ether;
    if (enemy.ether !== undefined) {
      enemy.ether = Math.max(0, (enemy.ether || 0) - effects.ether);
    }
  }

  // 에테르 배율 적용
  if (effects.etherMultiplier) {
    player.etherMultiplier = (player.etherMultiplier || 1) * effects.etherMultiplier;
  }

  // 토큰 적용
  if (effects.tokens) {
    for (const token of effects.tokens) {
      player.tokens = addToken(player.tokens, token.id, token.stacks);
    }
  }

  // 카드 파괴
  if (effects.cardDestroy && effects.cardDestroy > 0) {
    for (let i = 0; i < effects.cardDestroy; i++) {
      if (enemy.hand && enemy.hand.length > 0) {
        enemy.hand.pop();
      } else if (enemy.deck.length > 0) {
        enemy.deck.pop();
      }
    }
  }

  // 타임라인 동결
  if (effects.cardFreeze) {
    player.frozenTurns = (player.frozenTurns || 0) + effects.cardFreeze;
  }

  // 스탯 부스트
  if (effects.statBoost) {
    switch (effects.statBoost.stat) {
      case 'strength':
        player.tokens = addToken(player.tokens, 'strength', effects.statBoost.value);
        break;
      case 'agility':
        player.tokens = addToken(player.tokens, 'agility', effects.statBoost.value);
        break;
      case 'insight':
        player.insight = (player.insight || 0) + effects.statBoost.value;
        break;
    }
  }

  // 아이템 효과 추적
  if (state.itemEffects) {
    if (!state.itemEffects[result.itemId]) {
      state.itemEffects[result.itemId] = {
        count: 0,
        totalDamage: 0,
        totalBlock: 0,
        totalHealing: 0,
        totalEther: 0,
        otherEffects: {},
      };
    }
    const record = state.itemEffects[result.itemId];
    record.count++;
    if (effects.damage) record.totalDamage += effects.damage;
    if (effects.block) record.totalBlock += effects.block;
    if (effects.heal) record.totalHealing += effects.heal;
    if (effects.ether) record.totalEther += effects.ether;
    if (effects.energy) record.otherEffects['energy'] = (record.otherEffects['energy'] || 0) + effects.energy;
    if (effects.maxEnergy) record.otherEffects['maxEnergy'] = (record.otherEffects['maxEnergy'] || 0) + effects.maxEnergy;
    if (effects.etherMultiplier) record.otherEffects['etherMultiplier'] = effects.etherMultiplier;
    if (effects.cardDestroy) record.otherEffects['cardDestroy'] = (record.otherEffects['cardDestroy'] || 0) + effects.cardDestroy;
    if (effects.cardFreeze) record.otherEffects['cardFreeze'] = (record.otherEffects['cardFreeze'] || 0) + effects.cardFreeze;
  }
}
