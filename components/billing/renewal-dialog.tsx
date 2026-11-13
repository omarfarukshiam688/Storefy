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

interface RenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: Plan | null;
}

export function RenewalDialog({
  open,
  onOpenChange,
  currentPlan,
}: RenewalDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    paymentId: string | null;
    idempotent: boolean;
    amount: number | null;
    message: string;
  } | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/subscriptions/payments/renewal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'renewal' }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create renewal payment');
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
      toast.success(data.message || 'Renewal payment created');
    } catch {
      toast.error('Unexpected error creating renewal payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={!currentPlan} variant="outline">
          Renew subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew subscription</DialogTitle>
          <DialogDescription>
            Renew your <strong>{currentPlan?.name}</strong> plan for another month.
            Payment will be verified before your subscription is extended.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium text-slate-900">{currentPlan?.name}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How it works
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>
                &bull; A renewal payment request is created with status &quot;Verification required.&quot;
              </li>
              <li>
                &bull; Your subscription extends only after a Storefy admin verifies the payment.
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
                  Renewal amount: ৳{result.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                disabled={isLoading || !currentPlan}
                className="w-full bg-violet-600 text-white hover:bg-violet-700"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Creating payment…</span>
                  </>
                ) : (
                  'Confirm renewal'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
