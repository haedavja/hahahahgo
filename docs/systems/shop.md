# 상점 시스템

## 개요

플레이어가 골드를 사용하여 아이템, 카드, 상징을 구매하거나 서비스를 이용할 수 있는 공간입니다.

## 상인 타입

| 타입 | 설명 | 특징 |
|-----|-----|-----|
| shop | 일반 상점 | 모든 탭 사용 가능 |
| card_merchant | 카드 상인 | 카드 위주 판매 |
| item_merchant | 아이템 상인 | 소비 아이템 위주 |
| relic_merchant | 유물 상인 | 상징 위주 판매 |
| service_merchant | 서비스 상인 | 치료, 강화 서비스 |

## 탭 구조

### BuyTab (구매)

- **상징(Relics)**: 영구 버프 효과
- **아이템(Items)**: 전투 중 사용 가능한 소비품
- **카드(Cards)**: 덱에 추가할 카드

### SellTab (판매)

- 보유 아이템을 골드로 교환
- 판매가는 상인 타입에 따라 달라짐

### ServiceTab (서비스)

- **체력 회복**: 30% / 전체 회복
- **상품 교체**: 새로운 상품 생성
- **카드 제거**: 덱에서 카드 삭제
- **카드 강화**: 카드 등급 상승

## 사용 예시

```tsx
<ShopModal
  merchantType="shop"
  onClose={handleClose}
/>
```

## 데이터 흐름

```
generateShopInventory() → inventory state
     ↓
BuyTab / SellTab / ServiceTab
     ↓
handleBuy* / handleSell / handleUseService
     ↓
useGameStore (gold, relics, items 업데이트)
```

## 가격 정책

### 구매가
- 일반 상징: 50~100 골드
- 희귀 상징: 150~250 골드
- 특별 상징: 300~500 골드
- 아이템: 10~50 골드
- 카드: 등급에 따라 다름

### 판매가
- 기본적으로 구매가의 50%
- 상인 타입에 따라 보너스 적용

## 관련 파일

- `src/components/shop/ShopModal.tsx`
- `src/components/shop/ShopTabs.tsx`
- `src/data/shop.ts`
- `src/data/relics.ts`
- `src/data/items.ts`
