/**
 * @file validation.ts
 * @description 데이터 검증 시스템 - 카드, 적, 유물 데이터 유효성 검사
 */

import type { CardDefinition, CardEffects } from './battle-engine';

// ==================== 검증 결과 타입 ====================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  code: ErrorCode;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export type ErrorCode =
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_TYPE'
  | 'INVALID_VALUE'
  | 'OUT_OF_RANGE'
  | 'DUPLICATE_ID'
  | 'REFERENCE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'CIRCULAR_REFERENCE';

// ==================== 스키마 정의 ====================

interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
  validator?: (value: unknown, context?: ValidationContext) => string | null;
}

interface ValidationContext {
  allCards?: Map<string, CardDefinition>;
  allEnemies?: Map<string, EnemyDefinition>;
  allRelics?: Map<string, RelicDefinition>;
  currentPath?: string;
}

// ==================== 게임 데이터 타입 ====================

export interface EnemyDefinition {
  id: string;
  name: string;
  hp: number;
  deck: string[];
  cardsPerTurn: number;
  patterns?: EnemyPattern[];
  traits?: string[];
}

export interface EnemyPattern {
  condition: string;
  action: string;
  priority: number;
}

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  effect: RelicEffect;
}

export interface RelicEffect {
  trigger: string;
  action: string;
  value?: number;
}

// ==================== 스키마 정의 ====================

const CARD_SCHEMA: Record<string, SchemaField> = {
  id: {
    type: 'string',
    required: true,
    pattern: /^[a-z][a-z0-9_]*$/,
  },
  name: {
    type: 'string',
    required: true,
    min: 1,
    max: 50,
  },
  type: {
    type: 'string',
    required: true,
    enum: ['attack', 'defense', 'skill'],
  },
  cost: {
    type: 'number',
    required: true,
    min: 0,
    max: 10,
  },
  damage: {
    type: 'number',
    min: 0,
    max: 999,
  },
  block: {
    type: 'number',
    min: 0,
    max: 999,
  },
  hits: {
    type: 'number',
    min: 1,
    max: 10,
  },
  speedCost: {
    type: 'number',
    min: 0,
    max: 12,
  },
  traits: {
    type: 'array',
    items: {
      type: 'string',
      enum: [
        'chain', 'followup', 'finisher', 'cross', 'crush', 'execute',
        'counter', 'training', 'swift', 'thorns', 'echo', 'leech',
        'pierce', 'momentum', 'protect', 'focus',
      ],
    },
  },
  effects: {
    type: 'object',
    properties: {
      applyVulnerable: { type: 'number', min: 0, max: 99 },
      applyWeak: { type: 'number', min: 0, max: 99 },
      applyBurn: { type: 'number', min: 0, max: 99 },
      applyPoison: { type: 'number', min: 0, max: 99 },
      addStrength: { type: 'number', min: -99, max: 99 },
      addDexterity: { type: 'number', min: -99, max: 99 },
      heal: { type: 'number', min: 0, max: 999 },
      draw: { type: 'number', min: 0, max: 10 },
      energy: { type: 'number', min: -10, max: 10 },
      stun: { type: 'boolean' },
      knockback: { type: 'number', min: 0, max: 12 },
      advance: { type: 'number', min: 0, max: 12 },
      executeThreshold: { type: 'number', min: 0, max: 1 },
      lifesteal: { type: 'number', min: 0, max: 1 },
    },
  },
};

const ENEMY_SCHEMA: Record<string, SchemaField> = {
  id: {
    type: 'string',
    required: true,
    pattern: /^[a-z][a-z0-9_]*$/,
  },
  name: {
    type: 'string',
    required: true,
    min: 1,
    max: 50,
  },
  hp: {
    type: 'number',
    required: true,
    min: 1,
    max: 9999,
  },
  deck: {
    type: 'array',
    required: true,
    items: { type: 'string' },
    validator: (value: unknown, ctx?: ValidationContext) => {
      if (!Array.isArray(value)) return null;
      if (value.length === 0) return '적은 최소 1개의 카드가 필요합니다';
      if (ctx?.allCards) {
        const missing = value.filter(id => !ctx.allCards!.has(id));
        if (missing.length > 0) {
          return `존재하지 않는 카드 참조: ${missing.join(', ')}`;
        }
      }
      return null;
    },
  },
  cardsPerTurn: {
    type: 'number',
    required: true,
    min: 1,
    max: 5,
  },
  patterns: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        condition: { type: 'string', required: true },
        action: { type: 'string', required: true },
        priority: { type: 'number', min: 0, max: 100 },
      },
    },
  },
};

const RELIC_SCHEMA: Record<string, SchemaField> = {
  id: {
    type: 'string',
    required: true,
    pattern: /^[a-z][a-z0-9_]*$/,
  },
  name: {
    type: 'string',
    required: true,
    min: 1,
    max: 50,
  },
  description: {
    type: 'string',
    required: true,
    min: 1,
    max: 200,
  },
  rarity: {
    type: 'string',
    required: true,
    enum: ['common', 'uncommon', 'rare', 'legendary'],
  },
  effect: {
    type: 'object',
    required: true,
    properties: {
      trigger: {
        type: 'string',
        required: true,
        enum: [
          'on_battle_start', 'on_battle_end', 'on_turn_start', 'on_turn_end',
          'on_card_play', 'on_damage_dealt', 'on_damage_received', 'on_heal',
          'on_combo', 'on_kill', 'on_draw', 'passive',
        ],
      },
      action: {
        type: 'string',
        required: true,
      },
      value: {
        type: 'number',
      },
    },
  },
};

// ==================== 검증기 클래스 ====================

export class DataValidator {
  private context: ValidationContext = {};

  /**
   * 검증 컨텍스트 설정 (참조 검증용)
   */
  setContext(context: Partial<ValidationContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 카드 검증
   */
  validateCard(card: unknown): ValidationResult {
    return this.validateAgainstSchema(card, CARD_SCHEMA, 'card');
  }

  /**
   * 여러 카드 검증
   */
  validateCards(cards: unknown[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as Record<string, unknown>;
      const result = this.validateCard(card);

      // 인덱스 추가
      for (const error of result.errors) {
        error.field = `[${i}].${error.field}`;
        allErrors.push(error);
      }
      for (const warning of result.warnings) {
        warning.field = `[${i}].${warning.field}`;
        allWarnings.push(warning);
      }

      // 중복 ID 체크
      if (card.id && typeof card.id === 'string') {
        if (seenIds.has(card.id)) {
          allErrors.push({
            field: `[${i}].id`,
            message: `중복된 카드 ID: ${card.id}`,
            value: card.id,
            code: 'DUPLICATE_ID',
          });
        }
        seenIds.add(card.id);
      }
    }

    // 밸런스 경고
    const balanceWarnings = this.checkCardBalance(cards as CardDefinition[]);
    allWarnings.push(...balanceWarnings);

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * 적 검증
   */
  validateEnemy(enemy: unknown): ValidationResult {
    return this.validateAgainstSchema(enemy, ENEMY_SCHEMA, 'enemy');
  }

  /**
   * 여러 적 검증
   */
  validateEnemies(enemies: unknown[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i] as Record<string, unknown>;
      const result = this.validateEnemy(enemy);

      for (const error of result.errors) {
        error.field = `[${i}].${error.field}`;
        allErrors.push(error);
      }
      for (const warning of result.warnings) {
        warning.field = `[${i}].${warning.field}`;
        allWarnings.push(warning);
      }

      if (enemy.id && typeof enemy.id === 'string') {
        if (seenIds.has(enemy.id)) {
          allErrors.push({
            field: `[${i}].id`,
            message: `중복된 적 ID: ${enemy.id}`,
            value: enemy.id,
            code: 'DUPLICATE_ID',
          });
        }
        seenIds.add(enemy.id);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * 유물 검증
   */
  validateRelic(relic: unknown): ValidationResult {
    return this.validateAgainstSchema(relic, RELIC_SCHEMA, 'relic');
  }

  /**
   * 덱 검증
   */
  validateDeck(deck: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(deck)) {
      errors.push({
        field: 'deck',
        message: '덱은 배열이어야 합니다',
        code: 'INVALID_TYPE',
      });
      return { valid: false, errors, warnings };
    }

    if (deck.length < 5) {
      errors.push({
        field: 'deck',
        message: '덱에는 최소 5장의 카드가 필요합니다',
        value: deck.length,
        code: 'OUT_OF_RANGE',
      });
    }

    if (deck.length > 50) {
      warnings.push({
        field: 'deck',
        message: '덱이 50장을 초과합니다. 게임 밸런스에 영향을 줄 수 있습니다.',
        suggestion: '덱 크기를 20-30장으로 유지하는 것을 권장합니다',
      });
    }

    // 카드 참조 검증
    if (this.context.allCards) {
      const missing = deck.filter(id => !this.context.allCards!.has(id));
      for (const id of missing) {
        errors.push({
          field: 'deck',
          message: `존재하지 않는 카드: ${id}`,
          value: id,
          code: 'REFERENCE_NOT_FOUND',
        });
      }
    }

    // 카드 분포 분석
    const typeCounts: Record<string, number> = { attack: 0, defense: 0, skill: 0 };
    if (this.context.allCards) {
      for (const cardId of deck) {
        const card = this.context.allCards.get(cardId);
        if (card) {
          typeCounts[card.type] = (typeCounts[card.type] || 0) + 1;
        }
      }

      const total = deck.length;
      if (typeCounts.attack / total > 0.8) {
        warnings.push({
          field: 'deck',
          message: '공격 카드 비율이 80%를 초과합니다',
          suggestion: '방어/스킬 카드를 추가해 밸런스를 맞추세요',
        });
      }
      if (typeCounts.defense / total < 0.1) {
        warnings.push({
          field: 'deck',
          message: '방어 카드가 10% 미만입니다',
          suggestion: '방어 카드를 추가해 생존력을 높이세요',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 스키마 기반 검증
   */
  private validateAgainstSchema(
    data: unknown,
    schema: Record<string, SchemaField>,
    rootName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push({
        field: rootName,
        message: `${rootName}은 객체여야 합니다`,
        code: 'INVALID_TYPE',
      });
      return { valid: false, errors, warnings };
    }

    const obj = data as Record<string, unknown>;

    for (const [field, fieldSchema] of Object.entries(schema)) {
      const value = obj[field];
      const fieldPath = field;

      // 필수 필드 체크
      if (fieldSchema.required && (value === undefined || value === null)) {
        errors.push({
          field: fieldPath,
          message: `필수 필드 누락: ${field}`,
          code: 'REQUIRED_FIELD_MISSING',
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // 타입 체크
      const typeError = this.checkType(value, fieldSchema.type, fieldPath);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // 범위 체크
      if (fieldSchema.type === 'number' && typeof value === 'number') {
        if (fieldSchema.min !== undefined && value < fieldSchema.min) {
          errors.push({
            field: fieldPath,
            message: `${field}는 ${fieldSchema.min} 이상이어야 합니다`,
            value,
            code: 'OUT_OF_RANGE',
          });
        }
        if (fieldSchema.max !== undefined && value > fieldSchema.max) {
          errors.push({
            field: fieldPath,
            message: `${field}는 ${fieldSchema.max} 이하여야 합니다`,
            value,
            code: 'OUT_OF_RANGE',
          });
        }
      }

      // 문자열 길이/패턴 체크
      if (fieldSchema.type === 'string' && typeof value === 'string') {
        if (fieldSchema.min !== undefined && value.length < fieldSchema.min) {
          errors.push({
            field: fieldPath,
            message: `${field}는 최소 ${fieldSchema.min}자 이상이어야 합니다`,
            value,
            code: 'OUT_OF_RANGE',
          });
        }
        if (fieldSchema.max !== undefined && value.length > fieldSchema.max) {
          errors.push({
            field: fieldPath,
            message: `${field}는 최대 ${fieldSchema.max}자 이하여야 합니다`,
            value,
            code: 'OUT_OF_RANGE',
          });
        }
        if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
          errors.push({
            field: fieldPath,
            message: `${field}가 올바른 형식이 아닙니다`,
            value,
            code: 'INVALID_FORMAT',
          });
        }
      }

      // Enum 체크
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push({
          field: fieldPath,
          message: `${field}는 다음 중 하나여야 합니다: ${fieldSchema.enum.join(', ')}`,
          value,
          code: 'INVALID_VALUE',
        });
      }

      // 배열 아이템 체크
      if (fieldSchema.type === 'array' && Array.isArray(value) && fieldSchema.items) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (fieldSchema.items.enum && !fieldSchema.items.enum.includes(item)) {
            errors.push({
              field: `${fieldPath}[${i}]`,
              message: `올바르지 않은 값: ${item}`,
              value: item,
              code: 'INVALID_VALUE',
            });
          }
        }
      }

      // 중첩 객체 체크
      if (fieldSchema.type === 'object' && fieldSchema.properties && typeof value === 'object') {
        const nestedResult = this.validateAgainstSchema(
          value,
          fieldSchema.properties,
          fieldPath
        );
        for (const error of nestedResult.errors) {
          error.field = `${fieldPath}.${error.field}`;
          errors.push(error);
        }
        warnings.push(...nestedResult.warnings);
      }

      // 커스텀 검증
      if (fieldSchema.validator) {
        const error = fieldSchema.validator(value, this.context);
        if (error) {
          errors.push({
            field: fieldPath,
            message: error,
            value,
            code: 'INVALID_VALUE',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 타입 체크
   */
  private checkType(value: unknown, expectedType: string, field: string): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      return {
        field,
        message: `${field}는 ${expectedType} 타입이어야 합니다 (현재: ${actualType})`,
        value,
        code: 'INVALID_TYPE',
      };
    }

    return null;
  }

  /**
   * 카드 밸런스 체크
   */
  private checkCardBalance(cards: CardDefinition[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    for (const card of cards) {
      if (!card.damage && !card.block && !card.effects) {
        warnings.push({
          field: `${card.id}`,
          message: '카드에 피해, 방어, 효과가 모두 없습니다',
          suggestion: '카드에 최소 하나의 효과를 추가하세요',
        });
      }

      // 비용 대비 효율 체크
      if (card.damage && card.cost > 0) {
        const efficiency = card.damage / card.cost;
        if (efficiency > 15) {
          warnings.push({
            field: `${card.id}`,
            message: `비용 대비 피해가 매우 높습니다 (${efficiency.toFixed(1)}/cost)`,
            suggestion: '비용을 높이거나 피해를 줄이는 것을 고려하세요',
          });
        }
        if (efficiency < 3) {
          warnings.push({
            field: `${card.id}`,
            message: `비용 대비 피해가 낮습니다 (${efficiency.toFixed(1)}/cost)`,
            suggestion: '특별한 효과가 없다면 피해를 높이는 것을 고려하세요',
          });
        }
      }
    }

    return warnings;
  }
}

// ==================== 싱글톤 인스턴스 ====================

export const validator = new DataValidator();

// ==================== 헬퍼 함수 ====================

/**
 * 빠른 카드 검증
 */
export function validateCard(card: unknown): ValidationResult {
  return validator.validateCard(card);
}

/**
 * 빠른 덱 검증
 */
export function validateDeck(deck: string[]): ValidationResult {
  return validator.validateDeck(deck);
}

/**
 * 검증 결과 포매팅
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✅ 검증 통과');
  } else {
    lines.push('❌ 검증 실패');
  }

  if (result.errors.length > 0) {
    lines.push(`\n오류 (${result.errors.length}개):`);
    for (const error of result.errors) {
      lines.push(`  - [${error.code}] ${error.field}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\n경고 (${result.warnings.length}개):`);
    for (const warning of result.warnings) {
      lines.push(`  - ${warning.field}: ${warning.message}`);
      if (warning.suggestion) {
        lines.push(`    💡 ${warning.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}
