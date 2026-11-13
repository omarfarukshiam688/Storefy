'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BillingPolicy() {
  return (
    <Card className="border-violet-100 bg-violet-50/40">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Billing policy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        <p>
          <strong>Monthly prepaid billing.</strong> All plans are billed monthly in advance in Bangladeshi Taka (৳).
        </p>
        <p>
          <strong>7-day free trial.</strong> Start any paid plan with a 7-day free trial. No payment card is required, and
          there is no automatic charge when the trial ends.
        </p>
        <p>
          <strong>Upgrade after verification.</strong> When you upgrade to a higher plan, a payment request is created for
          Storefy to review. Your new plan becomes active only after the payment is verified by our team.
        </p>
        <p>
          <strong>Downgrade next cycle.</strong> Downgrades take effect on your next billing date, not immediately.
        </p>
        <p>
          <strong>3-day grace period.</strong> After your paid period expires, you have 3 days to renew before your
          subscription is suspended.
        </p>
        <p>
          <strong>Cancellation.</strong> Cancelling does not remove access immediately — you keep access until your
          current paid period ends.
        </p>
        <p>
          <strong>No refunds for unused time.</strong> Once a payment is verified, it covers the full period and is not
          refundable for partial use.
        </p>
        <p>
          <strong>Manual verification.</strong> Payments are reviewed by Storefy administrators. You can check the status
          of any payment in your payment history.
        </p>
      </CardContent>
    </Card>
  );
}
