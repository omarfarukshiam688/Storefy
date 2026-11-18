'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/lib/cart/cart-context';
import type { Product } from '@/types';

export function MobilePurchaseBar({
  product,
  imageUrl,
  tenantSlug,
}: {
  product: Product;
  imageUrl: string | null;
  tenantSlug: string;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = React.useState(false);
  const unavailable = product.stock_status === 'out_of_stock';

  const handleAdd = () => {
    if (unavailable) return;
    setIsAdding(true);
    addToCart(product, 1, imageUrl);
    toast.success(`Added ${product.name} to cart`);
    window.setTimeout(() => setIsAdding(false), 400);
  };

  const handleBuyNow = () => {
    if (unavailable) return;
    addToCart(product, 1, imageUrl);
    router.push(`/s/${tenantSlug}/checkout`);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur md:hidden" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={unavailable || isAdding}
          className="flex h-[54px] items-center justify-center rounded-lg bg-[#EAF2FF] text-[15px] font-semibold text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {unavailable ? 'Out of Stock' : 'Add to Cart'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={unavailable}
          className="flex h-[54px] items-center justify-center rounded-lg bg-[#16A34A] text-[15px] font-semibold text-white active:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
