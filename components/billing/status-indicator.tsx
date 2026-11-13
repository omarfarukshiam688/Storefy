'use client';

import * as React from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { derivePaymentStatusLabel } from '@/lib/billing/subscription-state';

interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const info = derivePaymentStatusLabel(status);

  return (
    <StatusBadge variant={info.variant}>
      {info.label}
    </StatusBadge>
  );
}
