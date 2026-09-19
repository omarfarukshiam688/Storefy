'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutCustomerSchema, type CheckoutCustomerInput } from '@/lib/validation/checkout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/lib/cart/cart-context';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  INR: '₹',
  PKR: '₨',
  CAD: 'C$',
  AUD: 'A$',
};

export default function CheckoutForm({ tenantSlug, onSuccess }: {
  tenantSlug: string;
  onSuccess: (orderNumber: string) => void;
}) {
  const { items, subtotal, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CheckoutCustomerInput>({
    resolver: zodResolver(checkoutCustomerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      district: '',
      deliveryAddress: '',
      notes: '',
    },
  });

  const onSubmit = async (data: CheckoutCustomerInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customer: data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to place order');
        return;
      }

      toast.success('Order placed successfully!');
      clearCart();
      onSuccess(result.orderNumber);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Your cart is empty</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-600">Add some products before checking out.</p>
          <Button className="mt-6" asChild>
            <Link href={`/s/${tenantSlug}/products`}>Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currency = items[0]?.currency || 'USD';
  const symbol = currencySymbols[currency] || currency;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Contact Information</h2>
          <p className="mt-1 text-sm text-muted-foreground">We&apos;ll use this to contact you about your order.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...form.register('name')} placeholder="John Doe" />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" {...form.register('phone')} placeholder="+1 (555) 000-0000" />
            {form.formState.errors.phone && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" {...form.register('email')} placeholder="john@example.com" />
          {form.formState.errors.email && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="district">District</Label>
          <Input id="district" {...form.register('district')} placeholder="Downtown" />
          {form.formState.errors.district && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.district.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryAddress">Delivery address</Label>
          <textarea
            id="deliveryAddress"
            {...form.register('deliveryAddress')}
            placeholder="123 Main St, Apt 4B"
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          />
          {form.formState.errors.deliveryAddress && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.deliveryAddress.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Order notes (optional)</Label>
          <textarea
            id="notes"
            {...form.register('notes')}
            placeholder="Any special instructions..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          />
          {form.formState.errors.notes && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.notes.message}</p>
          )}
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Place Order
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={`/s/${tenantSlug}/cart`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to cart
            </Link>
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold tracking-tight">Order Summary</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="ml-4 font-semibold">
                  {symbol}{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Subtotal</span>
                <span className="text-xl font-bold tracking-[-0.03em]">
                  {symbol}{subtotal.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Shipping and taxes calculated at checkout</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
