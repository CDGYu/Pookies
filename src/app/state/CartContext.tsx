import { createContext, useContext, useReducer, ReactNode } from 'react';

export interface NewLine {
  productId: string;
  variantId: string;
  name: string;
  unitPrice: number;
  recipeSku: string;
  customizationLabel?: string;
}

export interface CartLine extends NewLine {
  lineId: string;
  quantity: number;
}

export type CartAction =
  | { type: 'ADD'; line: NewLine }
  | { type: 'INC'; lineId: string }
  | { type: 'DEC'; lineId: string }
  | { type: 'REMOVE'; lineId: string }
  | { type: 'CLEAR' };

function sameLine(a: CartLine, b: NewLine): boolean {
  return a.variantId === b.variantId && (a.customizationLabel ?? '') === (b.customizationLabel ?? '');
}

let counter = 0;
const nextId = () => `line_${Date.now()}_${counter++}`;

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(l => sameLine(l, action.line));
      if (existing) return state.map(l => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...state, { ...action.line, lineId: nextId(), quantity: 1 }];
    }
    case 'INC':
      return state.map(l => (l.lineId === action.lineId ? { ...l, quantity: l.quantity + 1 } : l));
    case 'DEC':
      return state
        .map(l => (l.lineId === action.lineId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter(l => l.quantity > 0);
    case 'REMOVE':
      return state.filter(l => l.lineId !== action.lineId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

interface CartCtx {
  lines: CartLine[];
  add: (line: NewLine) => void;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  total: number;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const value: CartCtx = {
    lines,
    add: line => dispatch({ type: 'ADD', line }),
    inc: lineId => dispatch({ type: 'INC', lineId }),
    dec: lineId => dispatch({ type: 'DEC', lineId }),
    remove: lineId => dispatch({ type: 'REMOVE', lineId }),
    clear: () => dispatch({ type: 'CLEAR' }),
    total: cartTotal(lines),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
