'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Plan, Subscription } from '@/types';

interface DowngradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: Plan | null;
  targetPlan: Plan | null;
  subscription: Subscription | null;
}

export function DowngradeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  subscription,
}: DowngradeDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    paymentId: string | null;
    idempotent: boolean;
    amount: number | null;
    message: string;
  } | null>(null);

  const handleConfirm = async () => {
    if (!targetPlan) return;
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/subscriptions/payments/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'downgrade',
          targetPlanId: targetPlan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create downgrade payment');
        setIsLoading(false);
        return;
      }

      setResult({
        success: true,
        paymentId: data.payment?.id ?? null,
        idempotent: data.payment?.idempotent ?? false,
        amount: data.payment?.amount ?? null,
        message: data.message,
      });
      toast.success(data.message || 'Downgrade payment created');
    } catch {
      toast.error('Unexpected error creating downgrade payment');
    } finally {
      setIsLoading(false);
    }
  };

  const effectiveDate = subscription?.scheduled_plan_change_at
    ? new Date(subscription.scheduled_plan_change_at).toLocaleDateString('en-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Confirm downgrade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Downgrade plan</DialogTitle>
          <DialogDescription>
            Move from <strong>{currentPlan?.name}</strong> to{' '}
            <strong>{targetPlan?.name}</strong>. Takes effect on your next billing date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-muted-foreground">Current plan</span>
              <span className="text-sm font-medium text-slate-900">{currentPlan?.name}</span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-muted-foreground">Target plan</span>
              <span className="text-sm font-medium text-slate-900">{targetPlan?.name}</span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-muted-foreground">Effective date</span>
              <span className="text-sm font-medium text-slate-900">
                {effectiveDate || 'Next billing date'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Downgrade amount</span>
              <span className="text-sm font-bold text-slate-900">
                ৳0.00
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How it works
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>
                &bull; No immediate payment is collected for downgrades.
              </li>
              <li>
                &bull; A downgrade payment request is created for audit and verification.
              </li>
              <li>
                &bull; Your current plan remains active until your next billing date.
              </li>
              <li>
                &bull; On the effective date, your plan changes automatically.
              </li>
            </ul>
          </div>

          {result && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {result.message}
              </p>
              {result.paymentId && (
                <p className="mt-1 text-xs text-emerald-700">
                  Payment reference: {result.paymentId}
                </p>
              )}
              {result.idempotent && (
                <p className="mt-1 text-xs text-emerald-700">
                  An existing payment was returned (no duplicate created).
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || !targetPlan || !currentPlan}
                className="w-full bg-violet-600 text-white hover:bg-violet-700"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Creating payment…</span>
                  </>
                ) : (
                  'Confirm downgrade'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
