'use client';

import * as React from 'react';
import type { CartItem } from './types';
import type { Product } from '@/types';

const STORAGE_PREFIX = 'storefy-cart-';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, imageUrl?: string | null) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  tenantSlug: string;
}

const CartContext = React.createContext<CartContextType | null>(null);

export function useCart(): CartContextType {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

interface CartProviderProps {
  tenantId: string;
  tenantSlug: string;
  children: React.ReactNode;
}

export function CartProvider({ tenantId, tenantSlug, children }: CartProviderProps) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);

  const storageKey = `${STORAGE_PREFIX}${tenantId}`;
  const isInitialLoadRef = React.useRef(true);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed); // eslint-disable-line react-hooks/set-state-in-effect -- legitimate localStorage hydration
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      isInitialLoadRef.current = false;
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (isInitialLoadRef.current) {
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }, [items, storageKey]);

  const addToCart = React.useCallback((product: Product, quantity: number = 1, imageUrl: string | null = null) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency,
          imageUrl,
          quantity: Math.min(quantity, 99),
        },
      ];
    });
  }, []);

  const removeFromCart = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = React.useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) {
        removeFromCart(productId);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.min(quantity, 99) } : item
        )
      );
    },
    [removeFromCart]
  );

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  const cartCount = React.useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const subtotal = React.useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const openCart = React.useCallback(() => setIsCartOpen(true), []);
  const closeCart = React.useCallback(() => setIsCartOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        isCartOpen,
        openCart,
        closeCart,
        tenantSlug,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
