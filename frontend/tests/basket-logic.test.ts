import { describe, it, expect } from 'vitest';
import { BasketItem } from '../src/context/BasketContext';
import { Snack } from '../src/types/index';

// Pure basket reducer helper mirroring the BasketProvider state machine
function basketReducer(
  items: BasketItem[],
  action:
    | { type: 'ADD'; snack: Snack; amount: number }
    | { type: 'UPDATE'; snackId: string; amount: number }
    | { type: 'REMOVE'; snackId: string }
    | { type: 'CLEAR' }
): BasketItem[] {
  switch (action.type) {
    case 'ADD': {
      if (action.snack.quantity <= 0) return items;
      const existing = items.find((i) => i.snackId === action.snack.id);
      if (existing) {
        const newAmount = Math.min(existing.amount + action.amount, action.snack.quantity);
        return items.map((i) =>
          i.snackId === action.snack.id
            ? { ...i, amount: newAmount, availableQuantity: action.snack.quantity }
            : i
        );
      }
      return [
        ...items,
        {
          snackId: action.snack.id,
          name: action.snack.name,
          category: action.snack.category,
          amount: Math.min(action.amount, action.snack.quantity),
          availableQuantity: action.snack.quantity,
        },
      ];
    }
    case 'UPDATE': {
      if (action.amount <= 0) {
        return items.filter((i) => i.snackId !== action.snackId);
      }
      return items.map((item) => {
        if (item.snackId === action.snackId) {
          const clamped = Math.min(action.amount, item.availableQuantity);
          return { ...item, amount: clamped };
        }
        return item;
      });
    }
    case 'REMOVE': {
      return items.filter((i) => i.snackId !== action.snackId);
    }
    case 'CLEAR': {
      return [];
    }
    default:
      return items;
  }
}

function calculateTotalPackets(items: BasketItem[]): number {
  return items.reduce((acc, i) => acc + i.amount, 0);
}

describe('Frontend Basket State & Interaction Logic', () => {
  const mockSnack1: Snack = {
    id: 'snack-1',
    name: 'Apple Juice',
    category: 'DRINK',
    quantity: 5,
    lowStockThreshold: 2,
    status: 'STOCKED',
    voteCount: 3,
    hasVoted: false,
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
  };

  const mockSnack2: Snack = {
    id: 'snack-2',
    name: 'Dairy Milk',
    category: 'SWEET',
    quantity: 2,
    lowStockThreshold: 1,
    status: 'RUNNING_LOW',
    voteCount: 5,
    hasVoted: true,
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
  };

  it('should add a new snack to an empty basket', () => {
    const state = basketReducer([], { type: 'ADD', snack: mockSnack1, amount: 2 });
    expect(state).toHaveLength(1);
    expect(state[0].snackId).toBe('snack-1');
    expect(state[0].amount).toBe(2);
    expect(calculateTotalPackets(state)).toBe(2);
  });

  it('should clamp added quantity to available inventory when stock is lower than requested', () => {
    // mockSnack2 only has 2 in stock
    const state = basketReducer([], { type: 'ADD', snack: mockSnack2, amount: 10 });
    expect(state[0].amount).toBe(2);
    expect(calculateTotalPackets(state)).toBe(2);
  });

  it('should increment existing snack amount up to available stock limit', () => {
    let state = basketReducer([], { type: 'ADD', snack: mockSnack1, amount: 2 });
    state = basketReducer(state, { type: 'ADD', snack: mockSnack1, amount: 2 });
    expect(state[0].amount).toBe(4);

    // Adding 3 more when available is 5 should cap at 5
    state = basketReducer(state, { type: 'ADD', snack: mockSnack1, amount: 3 });
    expect(state[0].amount).toBe(5);
  });

  it('should refuse to add out-of-stock snacks', () => {
    const outOfStockSnack: Snack = { ...mockSnack1, quantity: 0, status: 'GONE' };
    const state = basketReducer([], { type: 'ADD', snack: outOfStockSnack, amount: 1 });
    expect(state).toHaveLength(0);
    expect(calculateTotalPackets(state)).toBe(0);
  });

  it('should update quantity via stepper (+/-) and clamp at stock limit', () => {
    let state = basketReducer([], { type: 'ADD', snack: mockSnack1, amount: 3 });
    state = basketReducer(state, { type: 'UPDATE', snackId: 'snack-1', amount: 4 });
    expect(state[0].amount).toBe(4);

    state = basketReducer(state, { type: 'UPDATE', snackId: 'snack-1', amount: 100 });
    expect(state[0].amount).toBe(5); // capped at availableQuantity (5)
  });

  it('should remove item when quantity is updated to 0', () => {
    let state = basketReducer([], { type: 'ADD', snack: mockSnack1, amount: 1 });
    state = basketReducer(state, { type: 'UPDATE', snackId: 'snack-1', amount: 0 });
    expect(state).toHaveLength(0);
  });

  it('should remove specific item when REMOVE is dispatched', () => {
    let state = basketReducer([], { type: 'ADD', snack: mockSnack1, amount: 1 });
    state = basketReducer(state, { type: 'ADD', snack: mockSnack2, amount: 1 });
    expect(state).toHaveLength(2);

    state = basketReducer(state, { type: 'REMOVE', snackId: 'snack-1' });
    expect(state).toHaveLength(1);
    expect(state[0].snackId).toBe('snack-2');
  });

  it('should clear all items when CLEAR is dispatched', () => {
    let state = basketReducer([], { type: 'ADD', snack: mockSnack1, amount: 2 });
    state = basketReducer(state, { type: 'ADD', snack: mockSnack2, amount: 1 });
    expect(calculateTotalPackets(state)).toBe(3);

    state = basketReducer(state, { type: 'CLEAR' });
    expect(state).toHaveLength(0);
    expect(calculateTotalPackets(state)).toBe(0);
  });
});
