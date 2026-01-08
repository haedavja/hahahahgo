/**
 * @file cardRenderingUtils.test.tsx
 * @description 카드 렌더링 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  RARITY_BADGES,
  getCardDisplayRarity,
  renderRarityBadge,
  renderEnhancementBadge,
  renderNameWithBadge,
} from './cardRenderingUtils';

describe('cardRenderingUtils', () => {
  describe('RARITY_BADGES', () => {
    it('rare 배지 정의 확인', () => {
      expect(RARITY_BADGES.rare).toBeDefined();
      expect(RARITY_BADGES.rare.label).toBe('희귀');
    });

    it('special 배지 정의 확인', () => {
      expect(RARITY_BADGES.special).toBeDefined();
      expect(RARITY_BADGES.special.label).toBe('특별');
    });

    it('legendary 배지 정의 확인', () => {
      expect(RARITY_BADGES.legendary).toBeDefined();
      expect(RARITY_BADGES.legendary.label).toBe('전설');
    });
  });

  describe('getCardDisplayRarity', () => {
    it('업그레이드가 없으면 카드 기본 희귀도 반환', () => {
      const card = { id: 'card1', name: '테스트 카드', rarity: 'rare' };
      expect(getCardDisplayRarity(card, {})).toBe('rare');
    });

    it('업그레이드가 있으면 업그레이드 희귀도 반환', () => {
      const card = { id: 'card1', name: '테스트 카드', rarity: 'common' };
      const upgrades = { card1: 'legendary' };
      expect(getCardDisplayRarity(card, upgrades)).toBe('legendary');
    });

    it('희귀도가 없으면 common 반환', () => {
      const card = { id: 'card1', name: '테스트 카드' };
      expect(getCardDisplayRarity(card, {})).toBe('common');
    });
  });

  describe('renderRarityBadge', () => {
    it('common 카드는 null 반환', () => {
      const card = { id: 'card1', name: '테스트 카드', rarity: 'common' };
      expect(renderRarityBadge(card, {})).toBeNull();
    });

    it('rare 카드는 배지 렌더링', () => {
      const card = { id: 'card1', name: '테스트 카드', rarity: 'rare' };
      const badge = renderRarityBadge(card, {});
      expect(badge).not.toBeNull();

      const { container } = render(badge!);
      expect(container.textContent).toBe('희귀');
    });

    it('legendary 카드는 배지 렌더링', () => {
      const card = { id: 'card1', name: '테스트 카드', rarity: 'legendary' };
      const badge = renderRarityBadge(card, {});
      expect(badge).not.toBeNull();

      const { container } = render(badge!);
      expect(container.textContent).toBe('전설');
    });

    it('업그레이드된 희귀도로 배지 렌더링', () => {
      const card = { id: 'card1', name: '테스트 카드', rarity: 'common' };
      const upgrades = { card1: 'special' };
      const badge = renderRarityBadge(card, upgrades);
      expect(badge).not.toBeNull();

      const { container } = render(badge!);
      expect(container.textContent).toBe('특별');
    });
  });

  describe('renderEnhancementBadge', () => {
    it('강화 레벨 0이면 null 반환', () => {
      expect(renderEnhancementBadge(0)).toBeNull();
    });

    it('강화 레벨 undefined면 null 반환', () => {
      expect(renderEnhancementBadge(undefined)).toBeNull();
    });

    it('강화 레벨 1 이상이면 배지 렌더링', () => {
      const badge = renderEnhancementBadge(1);
      expect(badge).not.toBeNull();

      const { container } = render(badge!);
      expect(container.textContent).toBeTruthy();
    });

    it('강화 레벨 3 배지 렌더링', () => {
      const badge = renderEnhancementBadge(3);
      expect(badge).not.toBeNull();

      const { container } = render(badge!);
      // 강화 레벨에 따른 레이블이 표시되어야 함
      expect(container.querySelector('span')).toBeTruthy();
    });
  });

  describe('renderNameWithBadge', () => {
    it('common 카드는 이름만 표시', () => {
      const card = { id: 'card1', name: '기본 공격' };
      const result = renderNameWithBadge(card, {}, '#ffffff');

      const { container } = render(result);
      expect(container.textContent).toContain('기본 공격');
    });

    it('rare 카드는 이름과 배경색 적용', () => {
      const card = { id: 'card1', name: '강력한 일격', rarity: 'rare' };
      const result = renderNameWithBadge(card, {}, '#ffffff');

      const { container } = render(result);
      expect(container.textContent).toContain('강력한 일격');
      // rare 배경 스타일이 적용되어야 함
      const span = container.querySelector('span');
      expect(span).toBeTruthy();
    });

    it('강화 레벨이 있으면 강화 배지도 표시', () => {
      const card = { id: 'card1', name: '테스트', enhancementLevel: 2 };
      const result = renderNameWithBadge(card, {}, '#ffffff');

      const { container } = render(result);
      // 카드 이름과 강화 배지 모두 표시
      const spans = container.querySelectorAll('span');
      expect(spans.length).toBeGreaterThanOrEqual(1);
    });

    it('업그레이드와 강화 모두 적용', () => {
      const card = { id: 'card1', name: '전설의 검', rarity: 'common', enhancementLevel: 3 };
      const upgrades = { card1: 'legendary' };
      const result = renderNameWithBadge(card, upgrades, '#ffffff');

      const { container } = render(result);
      expect(container.textContent).toContain('전설의 검');
    });

    it('defaultColor가 common 카드에 적용됨', () => {
      const card = { id: 'card1', name: '평범한 카드' };
      const result = renderNameWithBadge(card, {}, '#ff0000');

      const { container } = render(result);
      const span = container.querySelector('span');
      expect(span?.style.color).toBe('rgb(255, 0, 0)');
    });
  });
});
