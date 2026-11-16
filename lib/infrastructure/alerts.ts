import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/in-app';
import type { InfrastructureOverview } from './usage';

type AlertInput = {
  scope: 'infrastructure' | 'tenant';
  metric: 'storage' | 'database';
  thresholdPercent: number;
  severity: 'warning' | 'high' | 'critical';
  isActive: boolean;
  tenantId?: string | null;
  tenantName?: string | null;
  usagePercent?: number | null;
  valueBytes?: number | null;
  capacityBytes?: number | null;
};

async function getSuperAdminUserIds(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('super_admins').select('user_id');
  if (error || !data) return [];
  return data.map((r) => String(r.user_id));
}

function titleFor(a: AlertInput): string {
  const target = a.scope === 'tenant' ? `Tenant ${a.tenantName ?? a.tenantId ?? ''}` : 'Infrastructure';
  const metric = a.metric === 'storage' ? 'storage' : 'database';
  return `${target} ${metric} usage ${a.isActive ? 'exceeded' : 'recovered from'} ${a.thresholdPercent}%`;
}

function messageFor(a: AlertInput): string {
  const pct = a.usagePercent != null ? ` Current: ${a.usagePercent}%.` : '';
  return a.isActive
    ? `Threshold ${a.thresholdPercent}% (${a.severity}) crossed.${pct}`
    : `Usage dropped below ${a.thresholdPercent}% threshold.${pct}`;
}

/**
 * Persist alert state and dispatch notifications only on meaningful transitions.
 * Returns the number of alerts that changed state.
 */
export async function persistAndNotifyInfraAlerts(alerts: AlertInput[]): Promise<number> {
  const supabase = createServiceClient();
  const superAdmins = await getSuperAdminUserIds();
  let changedCount = 0;

  for (const a of alerts) {
    try {
      const { data } = await supabase.rpc('upsert_infrastructure_alert_state', {
        p_alert_scope: a.scope,
        p_metric_type: a.metric,
        p_tenant_id: a.scope === 'tenant' ? (a.tenantId ?? null) : null,
        p_threshold_percent: a.thresholdPercent,
        p_is_active: a.isActive,
        p_value_bytes: a.valueBytes ?? null,
        p_capacity_bytes: a.capacityBytes ?? null,
        p_usage_percent: a.usagePercent ?? null,
        p_metadata: { usage_percent: a.usagePercent ?? null, tenant_name: a.tenantName ?? null },
      });
      const res = (data ?? {}) as { success?: boolean; changed?: boolean; is_active?: boolean };

      if (!res.success) continue;
      // Only dispatch notifications on meaningful state transitions
      if (!res.changed) continue;

      changedCount += 1;

      for (const userId of superAdmins) {
        try {
          await createNotification({
            tenantId: null,
            recipientUserId: userId,
            type: 'announcement.published',
            title: titleFor(a),
            message: messageFor(a),
            targetType: 'infrastructure_usage',
            targetId: a.scope === 'tenant' ? (a.tenantId ?? null) : null,
          });
        } catch {
          // best-effort notification; do not fail monitoring
        }
      }
    } catch {
      // best-effort persistence; do not fail monitoring
    }
  }

  return changedCount;
}

export function alertsFromOverview(overview: InfrastructureOverview): AlertInput[] {
  return overview.alerts.map((a) => ({
    ...a,
    usagePercent: a.metric === 'storage' ? overview.storage.usagePercent : overview.database.usagePercent,
    valueBytes: a.metric === 'storage' ? overview.storage.actualUsedBytes : overview.database.sizeBytes,
    capacityBytes: a.metric === 'storage' ? overview.storage.capacityBytes : overview.database.capacityBytes,
  }));
}
