'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { formatDateISO } from '@/lib/billing/format-currency';
import { deriveSubscriptionState } from '@/lib/billing/subscription-state';
import { cn } from '@/lib/utils';
import type { Subscription } from '@/types';

interface TrialExperienceProps {
  subscription: Subscription;
  isStaff: boolean;
}

export function TrialExperience({ subscription, isStaff }: TrialExperienceProps) {
  const state = deriveSubscriptionState(subscription);

  // Only show trial experience when in trial or recently expired
  if (state.kind !== 'trial' && state.kind !== 'expired') {
    return null;
  }

  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end).getTime() : null;
  const now = new Date().getTime();
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : null;

  const isExpiringSoon = daysLeft !== null && daysLeft <= 3;
  const isExpired = state.kind === 'expired';

  return (
    <Card
      className={cn(
        'rounded-xl border border-violet-100 bg-white/80 shadow-sm',
        isExpired ? 'border-red-100 bg-red-50/40' : isExpiringSoon ? 'border-amber-100 bg-amber-50/40' : ''
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          {isExpired ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : isExpiringSoon ? (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          ) : (
            <Info className="h-5 w-5 text-sky-600" />
          )}
          <CardTitle className="text-lg font-semibold">
            {isExpired ? 'Trial expired' : 'Free trial active'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Clock className="h-5 w-5" />
            <span className="mt-1 text-[10px] font-bold">{daysLeft ?? 0}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {isExpired
                ? 'Your 7-day free trial has ended.'
                : `Your free trial ends in ${daysLeft} day(s).`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Trial started {formatDateISO(subscription.trial_start)} and expires{' '}
              {formatDateISO(subscription.trial_end)}. No automatic charge will occur.
            </p>
          </div>
        </div>

        {isExpiringSoon && !isExpired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Trial expiring soon
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Choose a paid plan before your trial ends to keep your store active.
                </p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Trial expired — paid plan required
                </p>
                <p className="mt-1 text-sm text-red-800">
                  Your trial has ended. Select a paid plan to continue accessing premium features.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            7-day free trial • No payment card required • No automatic charge
          </span>
          {!isStaff && (
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard/upgrade">View plans</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
