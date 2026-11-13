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
import type { Plan } from '@/types';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: Plan | null;
  targetPlan: Plan | null;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
}: UpgradeDialogProps) {
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
      const res = await fetch('/api/subscriptions/payments/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'upgrade',
          targetPlanId: targetPlan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create upgrade payment');
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
      toast.success(data.message || 'Upgrade payment created');
    } catch {
      toast.error('Unexpected error creating upgrade payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={!targetPlan || !currentPlan} variant="outline">
          Configure upgrade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade plan</DialogTitle>
          <DialogDescription>
            Moving from <strong>{currentPlan?.name}</strong> to{' '}
            <strong>{targetPlan?.name}</strong>. The new plan activates after your payment is verified.
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
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How it works
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>
                &bull; The prorated upgrade amount is calculated server-side based on your remaining billing days.
              </li>
              <li>
                &bull; A payment request is created with status &quot;Verification required.&quot;
              </li>
              <li>
                &bull; Your plan upgrades only after a Storefy admin verifies the payment.
              </li>
              <li>
                &bull; No automatic card charge — payment is reviewed manually.
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
              {result.amount !== null && (
                <p className="mt-1 text-xs text-emerald-700">
                  Prorated amount: ৳{result.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                  'Confirm upgrade'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
