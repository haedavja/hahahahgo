/**
 * @file worker.ts
 * @description Worker thread for parallel battle simulation
 *
 * 주요 기능:
 * - 실제 전투 엔진 시뮬레이션
 * - 이변(Anomaly) 시스템 적용
 * - 적 패턴(cycle/phase) 시스템
 * - 포커 콤보 + 특성 연계 AI
 */

import { parentPort, workerData } from 'worker_threads';
import type { WorkerTask, WorkerResult, BattleResult, SimulationConfig } from '../core/types';

// Worker가 메인 스레드에서 실행될 때 필요한 데이터
interface WorkerData {
  cardData: Record<string, CardData>;
  enemyData: Record<string, EnemyData>;
  relicData: Record<string, RelicData>;
  anomalyData?: Record<string, AnomalyData>;
  patternData?: Record<string, EnemyPatternData>;
}

// 이변 데이터
interface AnomalyData {
  id: string;
  name: string;
  effectType: string;
  getEffect: (level: number) => { type: string; value?: number; description: string };
}

// 적 패턴 데이터
interface EnemyPatternData {
  type: 'cycle' | 'phase' | 'random';
  pattern?: string[];
  phases?: Array<{
    hpThreshold: number;
    pattern: string[];
    description: string;
  }>;
  specialActions?: Record<string, {
    mode: string;
    useCard?: string;
    damage?: number;
    heal?: number;
    ignoreBlock?: boolean;
  }>;
}

interface CardData {
  id: string;
  name: string;
  attack?: number;
  defense?: number;
  cost: number;
  speedCost?: number;
  actionCost?: number;
  priority?: string;
  traits?: string[];
  tags?: string[];
  effects?: Record<string, unknown>;
}

// ==================== 토큰 시스템 ====================

interface TokenDefinition {
  id: string;
  stackable: boolean;
  duration?: number;
  onApply?: (state: CombatantState, stacks: number) => void;
  onTurnEnd?: (state: CombatantState, stacks: number) => number; // 남은 스택 반환
  modifyDamage?: (damage: number, stacks: number) => number;
  modifyBlock?: (block: number, stacks: number) => number;
}

const TOKEN_DEFINITIONS: Record<string, TokenDefinition> = {
  strength: {
    id: 'strength',
    stackable: true,
    modifyDamage: (damage, stacks) => damage + stacks,
  },
  dexterity: {
    id: 'dexterity',
    stackable: true,
    modifyBlock: (block, stacks) => block + stacks,
  },
  vulnerable: {
    id: 'vulnerable',
    stackable: true,
    duration: 1,
    modifyDamage: (damage, _) => Math.floor(damage * 1.5),
    onTurnEnd: (_, stacks) => Math.max(0, stacks - 1),
  },
  weak: {
    id: 'weak',
    stackable: true,
    duration: 1,
    modifyDamage: (damage, _) => Math.floor(damage * 0.75),
    onTurnEnd: (_, stacks) => Math.max(0, stacks - 1),
  },
  burn: {
    id: 'burn',
    stackable: true,
    onTurnEnd: (state, stacks) => {
      state.hp -= stacks;
      return Math.max(0, stacks - 1);
    },
  },
  poison: {
    id: 'poison',
    stackable: true,
    onTurnEnd: (state, stacks) => {
      state.hp -= stacks;
      return Math.max(0, stacks - 1);
    },
  },
  regen: {
    id: 'regen',
    stackable: true,
    onTurnEnd: (state, stacks) => {
      state.hp = Math.min(state.maxHp, state.hp + stacks);
      return Math.max(0, stacks - 1);
    },
  },
  thorns: {
    id: 'thorns',
    stackable: true,
  },
  blur: {
    id: 'blur',
    stackable: true,
    onTurnEnd: (_, stacks) => Math.max(0, stacks - 1),
  },
  offensive: {
    id: 'offensive',
    stackable: true,
    modifyDamage: (damage, stacks) => damage + stacks * 2,
    onTurnEnd: (_, stacks) => Math.max(0, stacks - 1),
  },
  defensive: {
    id: 'defensive',
    stackable: true,
    modifyBlock: (block, stacks) => block + stacks * 2,
    onTurnEnd: (_, stacks) => Math.max(0, stacks - 1),
  },
};

// ==================== 콤보 시스템 ====================

interface ComboDefinition {
  id: string;
  cards: string[];  // 필요 카드 ID (순서 중요)
  bonus: {
    damage?: number;
    block?: number;
    draw?: number;
    energy?: number;
    applyToken?: { token: string; stacks: number; target: 'self' | 'enemy' };
  };
  description: string;
}

const COMBO_DEFINITIONS: ComboDefinition[] = [
  {
    id: 'double_strike',
    cards: ['quick_slash', 'quick_slash'],
    bonus: { damage: 3 },
    description: '빠른 베기 연속 사용: +3 피해',
  },
  {
    id: 'offense_defense',
    cards: ['quick_slash', 'guard'],
    bonus: { block: 2, draw: 1 },
    description: '공방 균형: +2 방어, 1장 드로우',
  },
  {
    id: 'heavy_combo',
    cards: ['charge', 'heavy_strike'],
    bonus: { damage: 5 },
    description: '충전 후 강타: +5 피해',
  },
  {
    id: 'counter_combo',
    cards: ['guard', 'counter_stance'],
    bonus: { applyToken: { token: 'thorns', stacks: 2, target: 'self' } },
    description: '방어 반격: 가시 2 획득',
  },
  {
    id: 'sweep_combo',
    cards: ['dash', 'sweep'],
    bonus: { damage: 4, applyToken: { token: 'vulnerable', stacks: 1, target: 'enemy' } },
    description: '돌진 쓸어베기: +4 피해, 취약 1 부여',
  },
  {
    id: 'venom_bone',
    cards: ['venom_shot', 'bone_crush'],
    bonus: { applyToken: { token: 'weak', stacks: 2, target: 'enemy' } },
    description: '독 분쇄: 약화 2 부여',
  },
  {
    id: 'reinforce_guard',
    cards: ['reinforce', 'guard'],
    bonus: { block: 5, applyToken: { token: 'defensive', stacks: 1, target: 'self' } },
    description: '강화 방어: +5 방어, 수비 1 획득',
  },
];

interface CombatantState {
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  etherPts: number;
  tokens: Record<string, number>;
  deck: string[];
  hand: string[];
  discard: string[];
  energy: number;
  maxEnergy: number;
  relics: string[];
  cardsPlayedThisTurn: string[];
}

interface EnemyData {
  id: string;
  name: string;
  hp: number;
  tier: number;
  deck: string[];
  cardsPerTurn: number;
  passive?: Record<string, unknown>;
  isBoss?: boolean;
}

// 활성 이변 상태
interface ActiveAnomaly {
  id: string;
  level: number;
  effectType: string;
  value?: number;
}

interface RelicData {
  id: string;
  name: string;
  effect: Record<string, unknown>;
}

// ==================== 전투 시뮬레이션 로직 ====================

class BattleSimulator {
  private cards: Record<string, CardData>;
  private enemies: Record<string, EnemyData>;
  private relics: Record<string, RelicData>;
  private patterns: Record<string, EnemyPatternData>;
  private activeAnomalies: ActiveAnomaly[] = [];

  constructor(data: WorkerData) {
    this.cards = data.cardData;
    this.enemies = data.enemyData;
    this.relics = data.relicData;
    this.patterns = data.patternData || {};
  }

  // ==================== 이변 시스템 ====================

  private activateAnomaly(anomalyId: string, level: number = 1): void {
    // 간단한 이변 효과 정의 (실제 게임 데이터와 동기화)
    const anomalyEffects: Record<string, { effectType: string; getValue: (lv: number) => number }> = {
      // 기본 이변
      'deflation_curse': { effectType: 'ETHER_BAN', getValue: () => 1 },
      'energy_drain': { effectType: 'ENERGY_REDUCTION', getValue: (lv) => lv * -1 },
      'time_distortion': { effectType: 'SPEED_REDUCTION', getValue: (lv) => lv * -3 },
      'vulnerability': { effectType: 'VULNERABILITY', getValue: (lv) => lv * 10 },
      'value_down': { effectType: 'VALUE_DOWN', getValue: (lv) => lv * -10 },
      'backflow': { effectType: 'DEFENSE_BACKFIRE', getValue: (lv) => lv * 2 },
      'blood_moon': { effectType: 'DAMAGE_BOOST', getValue: () => 25 },
      'elite_surge': { effectType: 'ENEMY_BOOST', getValue: () => 50 },

      // 추가 이변 (silence, isolation, madness 등)
      'silence': { effectType: 'TRAIT_SILENCE', getValue: (lv) => lv },
      'isolation': { effectType: 'CHAIN_ISOLATION', getValue: (lv) => lv },
      'madness': { effectType: 'FINESSE_BLOCK', getValue: (lv) => lv >= 3 ? 0 : 25 },
      'cognitive_fog': { effectType: 'INSIGHT_REDUCTION', getValue: (lv) => lv * -1 },
      'draw_interference': { effectType: 'DRAW_REDUCTION', getValue: (lv) => lv * -10 },
      'instability': { effectType: 'SPEED_INSTABILITY', getValue: (lv) => lv },

      // 환경 이변
      'toxic_mist': { effectType: 'TOXIC_MIST', getValue: () => 3 },
      'regeneration_field': { effectType: 'REGEN_FIELD', getValue: () => 5 },
    };

    const effect = anomalyEffects[anomalyId];
    if (effect) {
      this.activeAnomalies.push({
        id: anomalyId,
        level,
        effectType: effect.effectType,
        value: effect.getValue(level),
      });
    }
  }

  private getAnomalyEffect(effectType: string): number {
    let total = 0;
    for (const anomaly of this.activeAnomalies) {
      if (anomaly.effectType === effectType && anomaly.value !== undefined) {
        total += anomaly.value;
      }
    }
    return total;
  }

  private hasAnomalyType(effectType: string): boolean {
    return this.activeAnomalies.some(a => a.effectType === effectType);
  }

  private applyAnomalyDamageModifier(damage: number, isPlayerAttacking: boolean): number {
    let modified = damage;

    // 취약 효과 (VULNERABILITY) - 플레이어가 받는 피해 증가
    if (!isPlayerAttacking) {
      const vulnerabilityPercent = this.getAnomalyEffect('VULNERABILITY');
      if (vulnerabilityPercent > 0) {
        modified = Math.floor(modified * (1 + vulnerabilityPercent / 100));
      }
    }

    // 피의 달 (DAMAGE_BOOST) - 모든 피해 증가
    const damageBoost = this.getAnomalyEffect('DAMAGE_BOOST');
    if (damageBoost > 0) {
      modified = Math.floor(modified * (1 + damageBoost / 100));
    }

    return modified;
  }

  private applyAnomalyDefenseBackfire(player: CombatantState): void {
    const backfireDamage = this.getAnomalyEffect('DEFENSE_BACKFIRE');
    if (backfireDamage > 0) {
      player.hp -= backfireDamage;
    }
  }

  /**
   * 특성 침묵 체크 - 특정 레벨 이상의 특성이 비활성화
   */
  private isTraitSilenced(traitRarity: 'common' | 'rare' | 'epic' | 'legendary'): boolean {
    const silenceLevel = this.getAnomalyEffect('TRAIT_SILENCE');
    if (silenceLevel <= 0) return false;

    const rarityLevels: Record<string, number> = {
      'common': 1,
      'rare': 2,
      'epic': 3,
      'legendary': 4,
    };

    return silenceLevel >= rarityLevels[traitRarity];
  }

  /**
   * 연계 고립 체크 - chain/followup 효과 비활성화
   */
  private isChainIsolated(): boolean {
    return this.getAnomalyEffect('CHAIN_ISOLATION') > 0;
  }

  /**
   * 드로우 수정 - 드로우 감소 이변 적용
   */
  private getModifiedDrawCount(baseCount: number): number {
    const drawReduction = this.getAnomalyEffect('DRAW_REDUCTION');
    if (drawReduction < 0) {
      // drawReduction은 -10%, -20% 등의 퍼센트 감소
      const reduction = Math.floor(baseCount * Math.abs(drawReduction) / 100);
      return Math.max(1, baseCount - reduction);
    }
    return baseCount;
  }

  /**
   * 턴 종료 환경 효과 적용
   */
  private applyEnvironmentEffects(player: CombatantState, enemy: CombatantState, log: string[]): void {
    // 독 안개 - 모두에게 피해
    const toxicDamage = this.getAnomalyEffect('TOXIC_MIST');
    if (toxicDamage > 0) {
      player.hp -= toxicDamage;
      enemy.hp -= toxicDamage;
      log.push(`☠️ 독 안개: 모두 ${toxicDamage} 피해`);
    }

    // 재생 필드 - 모두 회복
    const regenAmount = this.getAnomalyEffect('REGEN_FIELD');
    if (regenAmount > 0) {
      player.hp = Math.min(player.maxHp, player.hp + regenAmount);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + regenAmount);
      log.push(`💚 재생 필드: 모두 ${regenAmount} 회복`);
    }
  }

  // ==================== 적 패턴 시스템 ====================

  private getPatternAction(enemyId: string, turn: number, currentHp: number, maxHp: number): string | null {
    const pattern = this.patterns[enemyId];
    if (!pattern) return null;

    if (pattern.type === 'cycle' && pattern.pattern) {
      const index = (turn - 1) % pattern.pattern.length;
      return pattern.pattern[index];
    }

    if (pattern.type === 'phase' && pattern.phases) {
      const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 100;
      // HP 비율에 맞는 페이즈 찾기
      const phase = [...pattern.phases]
        .sort((a, b) => a.hpThreshold - b.hpThreshold)
        .find(p => hpPercent <= p.hpThreshold);

      if (phase) {
        const index = (turn - 1) % phase.pattern.length;
        return phase.pattern[index];
      }
    }

    return null;
  }

  private selectEnemyCardsFromPattern(
    enemyState: CombatantState & { id: string; deck: string[]; cardsPerTurn: number },
    turn: number
  ): string[] {
    const action = this.getPatternAction(enemyState.id, turn, enemyState.hp, enemyState.maxHp);

    if (!action) {
      // 패턴 없으면 기본 동작
      return enemyState.deck.slice(0, enemyState.cardsPerTurn);
    }

    const pattern = this.patterns[enemyState.id];

    // 특수 행동 체크
    if (pattern?.specialActions?.[action]) {
      const special = pattern.specialActions[action];
      if (special.useCard && this.cards[special.useCard]) {
        return [special.useCard];
      }
    }

    // 패턴 행동에 따른 카드 선택
    const attackCards = enemyState.deck.filter(id => this.cards[id]?.attack);
    const defenseCards = enemyState.deck.filter(id => this.cards[id]?.defense);

    switch (action) {
      case 'attack':
      case 'big_attack':
      case 'rage':
        return attackCards.length > 0 ? [attackCards[0]] : enemyState.deck.slice(0, 1);
      case 'defense':
      case 'charging':
      case 'rest':
        return defenseCards.length > 0 ? [defenseCards[0]] : enemyState.deck.slice(0, 1);
      case 'buff':
        // 버프 카드나 방어 선택
        return defenseCards.length > 0 ? [defenseCards[0]] : enemyState.deck.slice(0, 1);
      default:
        return enemyState.deck.slice(0, enemyState.cardsPerTurn);
    }
  }

  simulateBattle(config: SimulationConfig): BattleResult {
    const enemyId = config.enemyIds[0] || 'ghoul';
    const enemy = this.enemies[enemyId] || this.getDefaultEnemy(enemyId);

    // 이변 초기화
    this.activeAnomalies = [];
    if (config.anomalyId) {
      const anomalyLevel = config.anomalyLevel || 1;
      // anomalyId가 쉼표로 구분된 여러 이변일 수 있음
      const anomalyIds = config.anomalyId.split(',').map(s => s.trim());
      for (const id of anomalyIds) {
        this.activateAnomaly(id, anomalyLevel);
      }
    }

    // 적 HP 부스트 (elite_surge 등)
    let enemyHpMultiplier = 1;
    const enemyBoost = this.getAnomalyEffect('ENEMY_BOOST');
    if (enemyBoost > 0) {
      enemyHpMultiplier = 1 + enemyBoost / 100;
    }

    // 에너지 감소 효과
    const energyReduction = this.getAnomalyEffect('ENERGY_REDUCTION');
    const playerMaxEnergy = Math.max(1, 3 + energyReduction);

    // 플레이어 초기화
    const player: CombatantState = {
      hp: config.playerStats?.hp || 100,
      maxHp: config.playerStats?.maxHp || 100,
      block: 0,
      strength: 0,
      etherPts: 0,
      tokens: {},
      deck: [...config.playerDeck],
      hand: [],
      discard: [],
      energy: config.playerStats?.energy || playerMaxEnergy,
      maxEnergy: playerMaxEnergy,
      relics: config.playerRelics || [],
      cardsPlayedThisTurn: [],
    };

    // 적 초기화 (이변 부스트 적용)
    const boostedHp = Math.floor(enemy.hp * enemyHpMultiplier);
    const enemyState: CombatantState & { id: string; name: string; cardsPerTurn: number } = {
      hp: boostedHp,
      maxHp: boostedHp,
      block: 0,
      strength: 0,
      etherPts: 0,
      tokens: {},
      id: enemy.id,
      name: enemy.name,
      deck: [...enemy.deck],
      hand: [],
      discard: [],
      energy: 3,
      maxEnergy: 3,
      relics: [],
      cardsPerTurn: enemy.cardsPerTurn,
      cardsPlayedThisTurn: [],
    };

    const battleLog: string[] = [];
    const cardUsage: Record<string, number> = {};
    const comboStats: Record<string, number> = {};
    let turn = 0;
    let playerDamageDealt = 0;
    let enemyDamageDealt = 0;

    // 덱 셔플
    this.shuffle(player.deck);

    // 전투 루프
    while (turn < config.maxTurns && player.hp > 0 && enemyState.hp > 0) {
      turn++;
      player.cardsPlayedThisTurn = [];

      // 턴 시작 토큰 처리 (공격/방어 토큰 등)
      this.processTurnStartTokens(player, battleLog);

      // 카드 드로우 (드로우 감소 이변 적용)
      const drawCount = this.getModifiedDrawCount(5);
      this.drawCards(player, drawCount);

      // 플레이어 턴: AI 카드 선택
      const playableCards = player.hand.filter(cardId => {
        const card = this.cards[cardId];
        return card && (card.cost || card.actionCost || 1) <= player.energy;
      });

      // AI: 상황에 맞는 카드 선택
      const sortedCards = this.selectCardsAI(playableCards, player, enemyState);

      // 최대 3장 사용
      const cardsToPlay = sortedCards.slice(0, 3);

      for (const cardId of cardsToPlay) {
        const card = this.cards[cardId];
        if (!card) continue;
        if ((card.cost || card.actionCost || 1) > player.energy) continue;

        // 카드 사용 기록
        cardUsage[cardId] = (cardUsage[cardId] || 0) + 1;
        player.energy -= (card.cost || card.actionCost || 1);
        player.cardsPlayedThisTurn.push(cardId);

        // 콤보 체크 및 보너스 적용
        const combo = this.checkCombo(player.cardsPlayedThisTurn);
        let bonusDamage = 0;
        let bonusBlock = 0;

        if (combo) {
          comboStats[combo.id] = (comboStats[combo.id] || 0) + 1;
          bonusDamage = combo.bonus.damage || 0;
          bonusBlock = combo.bonus.block || 0;
          battleLog.push(`💥 콤보 발동: ${combo.description}`);

          // 콤보 토큰 적용
          if (combo.bonus.applyToken) {
            const target = combo.bonus.applyToken.target === 'self' ? player : enemyState;
            this.applyToken(target, combo.bonus.applyToken.token, combo.bonus.applyToken.stacks);
          }

          // 콤보 드로우
          if (combo.bonus.draw) {
            this.drawCards(player, combo.bonus.draw);
          }

          // 콤보 에너지
          if (combo.bonus.energy) {
            player.energy += combo.bonus.energy;
          }
        }

        // 공격 처리
        if (card.attack) {
          let damage = card.attack + player.strength + bonusDamage;

          // 공세 토큰
          if (player.tokens['offensive']) {
            damage = this.modifyDamageWithToken(damage, 'offensive', player.tokens['offensive']);
          }

          // 약화 체크 (플레이어)
          if (player.tokens['weak']) {
            damage = this.modifyDamageWithToken(damage, 'weak', player.tokens['weak']);
          }

          // 취약 체크 (적)
          if (enemyState.tokens['vulnerable']) {
            damage = Math.floor(damage * 1.5);
          }

          // 이변 피해 수정 적용
          damage = this.applyAnomalyDamageModifier(damage, true);

          // 피해 적용
          const actualDamage = this.applyDamage(enemyState, damage);
          playerDamageDealt += actualDamage;

          // 가시 반격
          if (enemyState.tokens['thorns'] && actualDamage > 0) {
            const thornsDamage = enemyState.tokens['thorns'];
            player.hp -= thornsDamage;
            battleLog.push(`🌹 가시 반격: ${thornsDamage} 피해`);
          }

          battleLog.push(`플레이어가 ${card.name}으로 ${actualDamage} 피해`);
        }

        // 방어 처리
        if (card.defense) {
          let block = card.defense + bonusBlock;

          // 수비 토큰
          if (player.tokens['defensive']) {
            block = this.modifyBlockWithToken(block, 'defensive', player.tokens['defensive']);
          }

          // 민첩 토큰
          if (player.tokens['dexterity']) {
            block = this.modifyBlockWithToken(block, 'dexterity', player.tokens['dexterity']);
          }

          player.block += block;
          battleLog.push(`플레이어가 ${card.name}으로 ${block} 방어`);

          // 이변: 방어 시 자해 (backflow)
          this.applyAnomalyDefenseBackfire(player);
        }

        // 카드 효과 처리
        this.processCardEffects(card, player, enemyState, battleLog);

        // 사용한 카드 버리기
        const handIdx = player.hand.indexOf(cardId);
        if (handIdx >= 0) {
          player.hand.splice(handIdx, 1);
          player.discard.push(cardId);
        }
      }

      // 적 생존 체크
      if (enemyState.hp <= 0) break;

      // 적 턴 - 패턴 기반 카드 선택
      const enemyCards = this.selectEnemyCardsFromPattern(enemyState, turn);
      for (const cardId of enemyCards) {
        const card = this.cards[cardId];
        if (!card) continue;

        if (card.attack) {
          let damage = card.attack + enemyState.strength;

          // 약화 체크 (적)
          if (enemyState.tokens['weak']) {
            damage = this.modifyDamageWithToken(damage, 'weak', enemyState.tokens['weak']);
          }

          // 취약 체크 (플레이어)
          if (player.tokens['vulnerable']) {
            damage = Math.floor(damage * 1.5);
          }

          // 이변 피해 수정 적용 (적 공격 → 플레이어 취약)
          damage = this.applyAnomalyDamageModifier(damage, false);

          const actualDamage = this.applyDamage(player, damage);
          enemyDamageDealt += actualDamage;

          // 가시 반격
          if (player.tokens['thorns'] && actualDamage > 0) {
            const thornsDamage = player.tokens['thorns'];
            enemyState.hp -= thornsDamage;
            battleLog.push(`🌹 가시 반격: ${thornsDamage} 피해`);
          }

          battleLog.push(`${enemyState.name}이 ${card.name}으로 ${actualDamage} 피해`);
        }

        if (card.defense) {
          enemyState.block += card.defense;
        }

        // 적 카드 효과
        this.processCardEffects(card, enemyState, player, battleLog);
      }

      // 턴 종료 처리
      this.processTurnEndTokens(player, battleLog, '플레이어');
      this.processTurnEndTokens(enemyState, battleLog, enemyState.name);

      // 환경 이변 효과 적용
      this.applyEnvironmentEffects(player, enemyState, battleLog);

      // 흐릿함(blur) 체크 - 있으면 블록 유지
      if (!player.tokens['blur']) {
        player.block = 0;
      }
      if (!enemyState.tokens['blur']) {
        enemyState.block = 0;
      }

      player.energy = player.maxEnergy;

      // 남은 핸드 버리기
      player.discard.push(...player.hand);
      player.hand = [];
    }

    // 승자 결정
    let winner: 'player' | 'enemy' | 'draw';
    if (enemyState.hp <= 0 && player.hp > 0) {
      winner = 'player';
    } else if (player.hp <= 0 && enemyState.hp > 0) {
      winner = 'enemy';
    } else if (player.hp <= 0 && enemyState.hp <= 0) {
      winner = 'draw';
    } else {
      winner = player.hp > enemyState.hp ? 'player' : 'enemy';
    }

    return {
      winner,
      turns: turn,
      playerDamageDealt,
      enemyDamageDealt,
      playerFinalHp: Math.max(0, player.hp),
      enemyFinalHp: Math.max(0, enemyState.hp),
      battleLog,
      cardUsage,
      comboStats,
    };
  }

  // ==================== 토큰 처리 ====================

  private applyToken(state: CombatantState, tokenId: string, stacks: number): void {
    const def = TOKEN_DEFINITIONS[tokenId];
    if (!def) {
      state.tokens[tokenId] = (state.tokens[tokenId] || 0) + stacks;
      return;
    }

    if (def.stackable) {
      state.tokens[tokenId] = (state.tokens[tokenId] || 0) + stacks;
    } else {
      state.tokens[tokenId] = stacks;
    }

    if (def.onApply) {
      def.onApply(state, stacks);
    }
  }

  private modifyDamageWithToken(damage: number, tokenId: string, stacks: number): number {
    const def = TOKEN_DEFINITIONS[tokenId];
    if (def?.modifyDamage) {
      return def.modifyDamage(damage, stacks);
    }
    return damage;
  }

  private modifyBlockWithToken(block: number, tokenId: string, stacks: number): number {
    const def = TOKEN_DEFINITIONS[tokenId];
    if (def?.modifyBlock) {
      return def.modifyBlock(block, stacks);
    }
    return block;
  }

  private processTurnStartTokens(state: CombatantState, log: string[]): void {
    // 턴 시작 시 특별 토큰 처리 (필요시 추가)
  }

  private processTurnEndTokens(state: CombatantState, log: string[], name: string): void {
    for (const [tokenId, stacks] of Object.entries(state.tokens)) {
      if (stacks <= 0) continue;

      const def = TOKEN_DEFINITIONS[tokenId];
      if (def?.onTurnEnd) {
        const hpBefore = state.hp;
        const remaining = def.onTurnEnd(state, stacks);
        state.tokens[tokenId] = remaining;

        if (state.hp < hpBefore) {
          log.push(`🔥 ${name}: ${tokenId}로 ${hpBefore - state.hp} 피해`);
        }
        if (state.hp > hpBefore) {
          log.push(`💚 ${name}: ${tokenId}로 ${state.hp - hpBefore} 회복`);
        }
      }

      // 0 이하면 제거
      if (state.tokens[tokenId] <= 0) {
        delete state.tokens[tokenId];
      }
    }
  }

  // ==================== 콤보 처리 ====================

  private checkCombo(cardsPlayed: string[]): ComboDefinition | null {
    for (const combo of COMBO_DEFINITIONS) {
      if (this.matchesCombo(cardsPlayed, combo.cards)) {
        return combo;
      }
    }
    return null;
  }

  private matchesCombo(played: string[], required: string[]): boolean {
    if (played.length < required.length) return false;

    // 마지막 N장이 콤보와 일치하는지 확인
    const lastN = played.slice(-required.length);

    for (let i = 0; i < required.length; i++) {
      if (lastN[i] !== required[i]) return false;
    }
    return true;
  }

  // ==================== 카드 효과 처리 ====================

  private processCardEffects(
    card: CardData,
    user: CombatantState,
    target: CombatantState,
    log: string[]
  ): void {
    if (!card.effects) return;

    const effects = card.effects;

    // 토큰 부여
    if (effects.applyVulnerable) {
      this.applyToken(target, 'vulnerable', effects.applyVulnerable as number);
      log.push(`취약 ${effects.applyVulnerable} 부여`);
    }

    if (effects.applyWeak) {
      this.applyToken(target, 'weak', effects.applyWeak as number);
      log.push(`약화 ${effects.applyWeak} 부여`);
    }

    if (effects.applyBurn) {
      this.applyToken(target, 'burn', effects.applyBurn as number);
      log.push(`화상 ${effects.applyBurn} 부여`);
    }

    if (effects.applyPoison) {
      this.applyToken(target, 'poison', effects.applyPoison as number);
      log.push(`독 ${effects.applyPoison} 부여`);
    }

    if (effects.applyStrength) {
      this.applyToken(user, 'strength', effects.applyStrength as number);
      log.push(`힘 ${effects.applyStrength} 획득`);
    }

    if (effects.applyOffensive) {
      this.applyToken(user, 'offensive', effects.applyOffensive as number);
      log.push(`공세 ${effects.applyOffensive} 획득`);
    }

    if (effects.applyDefensive) {
      this.applyToken(user, 'defensive', effects.applyDefensive as number);
      log.push(`수비 ${effects.applyDefensive} 획득`);
    }

    if (effects.applyBlur) {
      this.applyToken(user, 'blur', effects.applyBlur as number);
      log.push(`흐릿함 ${effects.applyBlur} 획득`);
    }

    // 회복
    if (effects.heal) {
      const healAmount = effects.heal as number;
      user.hp = Math.min(user.maxHp, user.hp + healAmount);
      log.push(`${healAmount} 회복`);
    }

    // 드로우
    if (effects.draw) {
      this.drawCards(user, effects.draw as number);
      log.push(`${effects.draw}장 드로우`);
    }

    // 에너지
    if (effects.energy) {
      user.energy += effects.energy as number;
      log.push(`에너지 +${effects.energy}`);
    }

    // 다중 히트
    if (effects.hits && card.attack) {
      const hits = (effects.hits as number) - 1; // 첫 번째는 이미 처리됨
      for (let i = 0; i < hits; i++) {
        let damage = card.attack + user.strength;
        if (target.tokens['vulnerable']) {
          damage = Math.floor(damage * 1.5);
        }
        const actualDamage = this.applyDamage(target, damage);
        log.push(`추가 타격: ${actualDamage} 피해`);
      }
    }
  }

  // ==================== AI 카드 선택 ====================

  private selectCardsAI(
    playable: string[],
    player: CombatantState,
    enemy: CombatantState
  ): string[] {
    // 상황 분석
    const playerHpRatio = player.hp / player.maxHp;
    const enemyHpRatio = enemy.hp / enemy.maxHp;

    return playable.sort((a, b) => {
      const cardA = this.cards[a];
      const cardB = this.cards[b];

      let scoreA = 0;
      let scoreB = 0;

      // 마무리 가능하면 최우선
      if (cardA?.attack && cardA.attack >= enemy.hp) scoreA += 100;
      if (cardB?.attack && cardB.attack >= enemy.hp) scoreB += 100;

      // 체력 낮으면 방어 우선
      if (playerHpRatio < 0.3) {
        scoreA += (cardA?.defense || 0) * 3;
        scoreB += (cardB?.defense || 0) * 3;
      }

      // 적 체력 낮으면 공격 우선
      if (enemyHpRatio < 0.3) {
        scoreA += (cardA?.attack || 0) * 2;
        scoreB += (cardB?.attack || 0) * 2;
      }

      // 기본 점수
      scoreA += (cardA?.attack || 0) * 1.5 + (cardA?.defense || 0);
      scoreB += (cardB?.attack || 0) * 1.5 + (cardB?.defense || 0);

      // 콤보 가능성 체크 (가중치 상향 - 핵심 메커니즘)
      const comboA = this.checkPotentialCombo([...player.cardsPlayedThisTurn, a]);
      const comboB = this.checkPotentialCombo([...player.cardsPlayedThisTurn, b]);
      if (comboA) scoreA += 25;  // 10 → 25
      if (comboB) scoreB += 25;

      // 연계 특성 보너스 (연계 고립 시 비활성화)
      if (!this.isChainIsolated()) {
        if (cardA?.traits?.includes('chain')) scoreA += 15;
        if (cardB?.traits?.includes('chain')) scoreB += 15;
        if (cardA?.traits?.includes('followup')) scoreA += 12;
        if (cardB?.traits?.includes('followup')) scoreB += 12;
        if (cardA?.traits?.includes('finisher')) scoreA += 18;
        if (cardB?.traits?.includes('finisher')) scoreB += 18;
      }

      // 같은 actionCost 카드 선호 (포커 콤보용)
      const sameActionCostA = playable.filter(c =>
        this.cards[c]?.actionCost === cardA?.actionCost
      ).length;
      const sameActionCostB = playable.filter(c =>
        this.cards[c]?.actionCost === cardB?.actionCost
      ).length;
      if (sameActionCostA >= 2) scoreA += sameActionCostA * 5;
      if (sameActionCostB >= 2) scoreB += sameActionCostB * 5;

      // 포커 콤보 랭크 보너스
      const pokerA = this.getPokerComboRank([...player.cardsPlayedThisTurn, a]);
      const pokerB = this.getPokerComboRank([...player.cardsPlayedThisTurn, b]);
      scoreA += pokerA.bonus;
      scoreB += pokerB.bonus;

      // 연계 특성 콤보 보너스
      const chainA = this.checkTraitChain([...player.cardsPlayedThisTurn, a]);
      const chainB = this.checkTraitChain([...player.cardsPlayedThisTurn, b]);
      scoreA += chainA.bonus;
      scoreB += chainB.bonus;

      return scoreB - scoreA;
    });
  }

  private checkPotentialCombo(cardsPlayed: string[]): boolean {
    return this.checkCombo(cardsPlayed) !== null;
  }

  // ==================== 포커 콤보 시스템 ====================

  /**
   * 카드 조합의 포커 랭크 계산
   * actionCost를 기준으로 포커 조합 판정
   */
  private getPokerComboRank(cardIds: string[]): { rank: number; name: string; bonus: number } {
    if (cardIds.length < 2) {
      return { rank: 0, name: 'none', bonus: 0 };
    }

    const actionCosts = cardIds
      .map(id => this.cards[id]?.actionCost || 0)
      .filter(cost => cost > 0);

    if (actionCosts.length < 2) {
      return { rank: 0, name: 'none', bonus: 0 };
    }

    // actionCost 빈도 계산
    const costCounts = new Map<number, number>();
    for (const cost of actionCosts) {
      costCounts.set(cost, (costCounts.get(cost) || 0) + 1);
    }

    const counts = Array.from(costCounts.values()).sort((a, b) => b - a);

    // 포커 랭크 판정
    // 5장: Five of a Kind (같은 actionCost 5장)
    if (counts[0] >= 5) {
      return { rank: 10, name: 'five_of_kind', bonus: 100 };
    }
    // 4장: Four of a Kind
    if (counts[0] >= 4) {
      return { rank: 8, name: 'four_of_kind', bonus: 60 };
    }
    // 풀하우스 (3+2)
    if (counts[0] >= 3 && counts[1] >= 2) {
      return { rank: 7, name: 'full_house', bonus: 50 };
    }
    // 트리플
    if (counts[0] >= 3) {
      return { rank: 4, name: 'three_of_kind', bonus: 30 };
    }
    // 투페어 (2+2)
    if (counts[0] >= 2 && counts[1] >= 2) {
      return { rank: 3, name: 'two_pair', bonus: 20 };
    }
    // 원페어
    if (counts[0] >= 2) {
      return { rank: 2, name: 'pair', bonus: 10 };
    }

    return { rank: 0, name: 'none', bonus: 0 };
  }

  /**
   * 연계 콤보 체크 (chain → followup → finisher)
   * 연계 고립 이변이 활성화되면 보너스 없음
   */
  private checkTraitChain(cardsPlayed: string[]): { complete: boolean; bonus: number } {
    // 연계 고립 시 콤보 비활성화
    if (this.isChainIsolated()) {
      return { complete: false, bonus: 0 };
    }

    if (cardsPlayed.length < 2) {
      return { complete: false, bonus: 0 };
    }

    let hasChain = false;
    let hasFollowup = false;
    let hasFinisher = false;

    for (const cardId of cardsPlayed) {
      const card = this.cards[cardId];
      if (card?.traits?.includes('chain')) hasChain = true;
      if (card?.traits?.includes('followup')) hasFollowup = true;
      if (card?.traits?.includes('finisher')) hasFinisher = true;
    }

    // 완전한 연계 콤보
    if (hasChain && hasFollowup && hasFinisher) {
      return { complete: true, bonus: 50 };
    }
    // 부분 연계
    if (hasChain && hasFollowup) {
      return { complete: false, bonus: 25 };
    }
    if (hasChain || hasFollowup) {
      return { complete: false, bonus: 10 };
    }

    return { complete: false, bonus: 0 };
  }

  // ==================== 유틸리티 ====================

  private applyDamage(target: CombatantState, damage: number): number {
    const actualDamage = Math.max(0, damage - target.block);
    target.block = Math.max(0, target.block - damage);
    target.hp -= actualDamage;
    return actualDamage;
  }

  private drawCards(state: CombatantState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        state.deck = [...state.discard];
        state.discard = [];
        this.shuffle(state.deck);
      }
      if (state.deck.length > 0) {
        state.hand.push(state.deck.pop()!);
      }
    }
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private getDefaultEnemy(id: string): EnemyData {
    return {
      id,
      name: id,
      hp: 50,
      tier: 1,
      deck: ['ghoul_attack', 'ghoul_attack', 'ghoul_block'],
      cardsPerTurn: 2,
    };
  }
}

// ==================== Worker 메시지 핸들러 ====================

if (parentPort) {
  const data = workerData as WorkerData;
  const simulator = new BattleSimulator(data);

  parentPort.on('message', (task: WorkerTask) => {
    const startTime = Date.now();

    try {
      const results: BattleResult[] = [];
      const batchSize = task.batchSize || task.config.battles;

      for (let i = 0; i < batchSize; i++) {
        const result = simulator.simulateBattle(task.config);
        results.push(result);

        // 진행률 보고 (10% 단위)
        if (i > 0 && i % Math.max(1, Math.floor(batchSize / 10)) === 0) {
          parentPort!.postMessage({
            type: 'progress',
            payload: {
              taskId: task.id,
              completed: i,
              total: batchSize,
            },
          });
        }
      }

      const response: WorkerResult = {
        id: task.id,
        type: task.type,
        results,
        duration: Date.now() - startTime,
      };

      parentPort!.postMessage({ type: 'result', payload: response });
    } catch (error) {
      parentPort!.postMessage({
        type: 'error',
        payload: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Worker 준비 완료 알림
  parentPort.postMessage({ type: 'ready' });
}

export { BattleSimulator };
