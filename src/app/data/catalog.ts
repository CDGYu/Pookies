export type CatalogCategory = 'cookies' | 'drinks' | 'bundles';

export interface ProductVariant {
  id: string;
  label: string;
  price: number;       // ₱ — provisional, editable here
  recipeSku: string;   // key into RECIPE_BOOK (or 'c4' for the mixed box)
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: CatalogCategory;
  icon: string;        // emoji
  variants: ProductVariant[];
  isMixedBox?: boolean;
}

export const CATEGORY_TABS: { id: CatalogCategory; label: string }[] = [
  { id: 'cookies', label: 'Cookies' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'bundles', label: 'Boxes & Bundles' },
];

export const CATALOG: CatalogProduct[] = [
  {
    id: 'classic', name: 'Classic Choc Chip', category: 'cookies', icon: '🍪',
    variants: [
      { id: 'classic-piece', label: 'Single piece', price: 30,  recipeSku: 'c1_piece' },
      { id: 'classic-mini3', label: 'Mini Box (3)', price: 85,  recipeSku: 'c1_mini3' },
      { id: 'classic-box5',  label: 'Box of 5',     price: 135, recipeSku: 'c1_box5'  },
      { id: 'classic-pack6', label: 'Pack of 6',    price: 150, recipeSku: 'c1_pack6' },
    ],
  },
  {
    id: 'redvelvet', name: 'Red Velvet', category: 'cookies', icon: '❤️',
    variants: [
      { id: 'rv-piece', label: 'Single piece', price: 35,  recipeSku: 'c2_piece' },
      { id: 'rv-mini3', label: 'Mini Box (3)', price: 95,  recipeSku: 'c2_mini3' },
      { id: 'rv-box5',  label: 'Box of 5',     price: 150, recipeSku: 'c2_box5'  },
      { id: 'rv-pack6', label: 'Pack of 6',    price: 170, recipeSku: 'c2_pack6' },
    ],
  },
  {
    id: 'smores', name: "S'mores", category: 'cookies', icon: '🔥',
    variants: [
      { id: 'smores-piece', label: 'Single piece', price: 35,  recipeSku: 'c3_piece' },
      { id: 'smores-mini3', label: 'Mini Box (3)', price: 95,  recipeSku: 'c3_mini3' },
      { id: 'smores-box5',  label: 'Box of 5',     price: 150, recipeSku: 'c3_box5'  },
      { id: 'smores-pack6', label: 'Pack of 6',    price: 170, recipeSku: 'c3_pack6' },
    ],
  },
  {
    id: 'dubai', name: 'Dubai Cookie', category: 'cookies', icon: '🟢',
    variants: [
      { id: 'dubai-piece', label: 'Single piece', price: 130, recipeSku: 'c5' },
    ],
  },
  {
    id: 'matcha', name: 'Matcha Latte', category: 'drinks', icon: '🍵',
    variants: [
      { id: 'matcha-12', label: '12 oz', price: 135, recipeSku: 'm1_12oz' },
      { id: 'matcha-16', label: '16 oz', price: 160, recipeSku: 'm1_16oz' },
    ],
  },
  {
    id: 'mixed-box', name: 'Mixed Box (5)', category: 'bundles', icon: '🎁', isMixedBox: true,
    variants: [
      { id: 'mixed-box-5', label: 'Build your own (5)', price: 150, recipeSku: 'c4' },
    ],
  },
];

/** Flavors selectable inside the Mixed Box builder → base SKU ids understood by resolveMixedBox. */
export const MIXED_BOX_FLAVORS = [
  { baseSku: 'c1', name: 'Classic', icon: '🍪' },
  { baseSku: 'c2', name: 'Red Velvet', icon: '❤️' },
  { baseSku: 'c3', name: "S'mores", icon: '🔥' },
];
export const MIXED_BOX_SLOTS = 5;
