'use client';

import * as React from 'react';
import { useCart } from '@/lib/cart/cart-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Product } from '@/types';

const MAX_QTY = 99;

export default function AddToCart({ product, imageUrl }: { product: Product; imageUrl?: string | null }) {
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);
  const { addToCart } = useCart();

  const isOutOfStock = product.stock_status === 'out_of_stock';

  const handleAdd = () => {
    if (isOutOfStock) return;
    setIsAdding(true);
    addToCart(product, quantity, imageUrl || null);
    toast.success(`Added ${quantity} × ${product.name} to cart`);
    setQuantity(1);
    setTimeout(() => setIsAdding(false), 400);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-none"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= MAX_QTY) {
                setQuantity(val);
              } else if (e.target.value === '') {
                setQuantity(1);
              }
            }}
            className="h-10 w-16 rounded-none border-x-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={1}
            max={MAX_QTY}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-none"
            onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
            disabled={quantity >= MAX_QTY}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">Max {MAX_QTY} per order</span>
      </div>

      <Button
        size="lg"
        className="w-full sm:w-auto"
        onClick={handleAdd}
        disabled={isOutOfStock || isAdding}
      >
        {isOutOfStock ? (
          'Out of Stock'
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        )}
      </Button>
    </div>
  );
}
