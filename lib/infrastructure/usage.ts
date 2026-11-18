import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';
import { getCalculatedInternalUsageByTenant } from './internal-usage';
import { getCapacityConfigs } from './capacity';
import { getDatabaseMonitoring } from './database-monitoring';

export type InfrastructureOverview = {
  storage: {
    capacityBytes: number | null;
    capacityConfigured: boolean;
    capacitySource: string;
    capacityVerified: boolean;
    actualUsedBytes: number | null;
    internalUsedBytes: number | null;
    calculatedInternalUsedBytes: number | null;
    remainingBytes: number | null;
    usagePercent: number | null;
    status: 'ok' | 'unavailable' | 'stale' | 'error';
    lastReconciledAt: string | null;
    reconciliationStatus: string | null;
  };
  database: {
    sizeBytes: number | null;
    capacityBytes: number | null;
    capacityConfigured: boolean;
    remainingBytes: number | null;
    usagePercent: number | null;
    classification: 'EXACT' | 'DERIVED' | 'ESTIMATED' | 'UNAVAILABLE';
    status: 'ok' | 'unavailable' | 'error';
    measuredAt: string | null;
  };
  tenants: {
    total: number;
    overQuota: number;
    highestUsageTenant: { tenantId: string; name: string; usedBytes: number } | null;
  };
  alerts: Array<{
    scope: 'infrastructure' | 'tenant';
    metric: 'storage' | 'database';
    thresholdPercent: number;
    severity: 'warning' | 'high' | 'critical';
    isActive: boolean;
    tenantId?: string | null;
    tenantName?: string | null;
  }>;
  generatedAt: string;
};

export type TenantStorageRow = {
  tenantId: string;
  tenantName: string;
  planName: string | null;
  internalUsageBytes: number | null;
  calculatedInternalUsageBytes: number | null;
  actualUsageBytes: number | null;
  quotaBytes: number | null;
  remainingBytes: number | null;
  usagePercent: number | null;
  status: 'ok' | 'warning' | 'high' | 'critical' | 'over_quota' | 'unavailable' | 'stale' | 'error';
  reconciliationStatus: string | null;
  lastReconciledAt: string | null;
};

function pct(used: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((used / capacity) * 1000) / 10;
}

function tenantStatus(used: number | null, quota: number | null): TenantStorageRow['status'] {
  if (used == null || quota == null) return 'unavailable';
  if (quota <= 0) return 'unavailable';
  if (used > quota) return 'over_quota';
  const p = (used / quota) * 100;
  if (p >= 95) return 'critical';
  if (p >= 85) return 'high';
  if (p >= 70) return 'warning';
  return 'ok';
}

export async function getInfrastructureOverview(): Promise<InfrastructureOverview> {
  const supabase = createServiceClient();
  const [capacityConfigs, dbMon] = await Promise.all([getCapacityConfigs(), getDatabaseMonitoring(20)]);
  const storageCap = capacityConfigs.find((c) => c.metricType === 'storage');
  const dbCap = capacityConfigs.find((c) => c.metricType === 'database');

  // Aggregate reconciled/internal storage from tenant_storage_usage if available
  let totalActual: number | null = null;
  let totalInternal: number | null = null;
  let totalCalculatedInternal: number | null = 0;
  let lastReconciledAt: string | null = null;
  let reconciliationStatus: string | null = null;
  let storageStatus: InfrastructureOverview['storage']['status'] = 'unavailable';

  const { data: usageRows, error: usageErr } = await supabase
    .from('tenant_storage_usage')
    .select('tenant_id,internal_usage_bytes,actual_usage_bytes,last_reconciled_at,reconciliation_status,internal_status,actual_status');

  let overQuota = 0;
  let highest: { tenantId: string; name: string; usedBytes: number } | null = null;

  // Get tenant quotas and names for over-quota/highest
  const tenantIds = ((usageRows ?? []) as Array<{ tenant_id: string }>).map((r) => r.tenant_id);
  const tenantMeta = new Map<string, { name: string; quota: number | null }>();
  if (tenantIds.length > 0) {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id,name,plan:plans!plan_id(storage_limit_bytes)')
      .in('id', tenantIds);
    for (const t of (tenants ?? []) as Array<{ id: string; name: string; plan?: Array<{ storage_limit_bytes: number }> | { storage_limit_bytes: number } | null }>) {
      const plan = Array.isArray(t.plan) ? t.plan[0] : t.plan;
      tenantMeta.set(t.id, { name: t.name, quota: plan?.storage_limit_bytes ?? null });
    }
  }

  // Calculated internal usage (shared with reconciliation): tracked DB record bytes
  // plus referenced-but-untracked branding asset bytes. Distinct from the persisted
  // internal_usage_bytes counter.
  try {
    const calculation = await getCalculatedInternalUsageByTenant();
    for (const entry of calculation.byTenant.values()) {
      totalCalculatedInternal += entry.calculatedBytes;
    }
  } catch {
    totalCalculatedInternal = null;
  }

  if (!usageErr && usageRows && usageRows.length >= 0) {
    let aSum = 0;
    let iSum = 0;
    let anyActual = false;
    for (const r of usageRows as Array<{ tenant_id: string; internal_usage_bytes: number; actual_usage_bytes: number | null; last_reconciled_at: string | null; reconciliation_status: string | null }>) {
      const internal = Math.max(0, Number(r.internal_usage_bytes) || 0);
      iSum += internal;
      if (r.actual_usage_bytes != null) {
        anyActual = true;
        aSum += Math.max(0, Number(r.actual_usage_bytes) || 0);
      }
      if (r.last_reconciled_at && (!lastReconciledAt || r.last_reconciled_at > lastReconciledAt)) {
        lastReconciledAt = r.last_reconciled_at;
        reconciliationStatus = r.reconciliation_status;
      }
      const meta = tenantMeta.get(r.tenant_id);
      const usedForQuota = r.actual_usage_bytes != null ? Math.max(0, Number(r.actual_usage_bytes) || 0) : null;
      if (meta?.quota != null && meta.quota > 0 && usedForQuota != null && usedForQuota > meta.quota) overQuota++;
      if (usedForQuota != null && (!highest || usedForQuota > highest.usedBytes)) {
        highest = { tenantId: r.tenant_id, name: meta?.name ?? r.tenant_id, usedBytes: usedForQuota };
      }
    }
    totalInternal = iSum;
    totalActual = anyActual ? aSum : null;
    storageStatus = anyActual ? (reconciliationStatus === 'failed' ? 'error' : reconciliationStatus === 'stale' ? 'stale' : 'ok') : 'stale';
  } else if (usageErr) {
    storageStatus = 'unavailable';
  }

  // Fallback: if no usage rows, actual usage is unavailable. Calculated internal
  // (from the shared helper above) is already set if the helper succeeded.
  if (!usageErr && (!usageRows || usageRows.length === 0)) {
    totalActual = null;
    storageStatus = 'stale';
    reconciliationStatus = 'never_run';
  }

  const { count: tenantCount } = await supabase.from('tenants').select('id', { count: 'exact', head: true });

  const capBytes = storageCap?.isConfigured ? storageCap.capacityBytes : null;
  const usedForPct = totalActual;
  const remainingBytes = capBytes != null && usedForPct != null ? Math.max(capBytes - usedForPct, 0) : null;
  const usagePercent = capBytes != null && capBytes > 0 && usedForPct != null ? pct(usedForPct, capBytes) : null;

  const dbCapBytes = dbCap?.isConfigured ? dbCap.capacityBytes : null;
  const dbSize = dbMon.databaseSize.bytes;
  const dbRemaining = dbCapBytes != null && dbSize != null ? Math.max(dbCapBytes - dbSize, 0) : null;
  const dbPct = dbCapBytes != null && dbCapBytes > 0 && dbSize != null ? pct(dbSize, dbCapBytes) : null;

  // Alert computation (in-memory, threshold-based) - only when capacity configured
  const alerts: InfrastructureOverview['alerts'] = [];
  const thresholds: Array<{ p: number; sev: 'warning' | 'high' | 'critical' }> = [
    { p: 70, sev: 'warning' }, { p: 85, sev: 'high' }, { p: 95, sev: 'critical' },
  ];
  if (usagePercent != null) {
    for (const t of thresholds) {
      alerts.push({ scope: 'infrastructure', metric: 'storage', thresholdPercent: t.p, severity: t.sev, isActive: usagePercent >= t.p });
    }
  }
  if (dbPct != null) {
    for (const t of thresholds) {
      alerts.push({ scope: 'infrastructure', metric: 'database', thresholdPercent: t.p, severity: t.sev, isActive: dbPct >= t.p });
    }
  }

  const result: InfrastructureOverview = {
    storage: {
      capacityBytes: capBytes ?? null,
      capacityConfigured: Boolean(storageCap?.isConfigured),
      capacitySource: storageCap?.sourceType ?? 'unconfigured',
      capacityVerified: Boolean(storageCap?.verified),
      actualUsedBytes: totalActual,
      internalUsedBytes: totalInternal,
      calculatedInternalUsedBytes: totalCalculatedInternal,
      remainingBytes,
      usagePercent,
      status: storageStatus,
      lastReconciledAt,
      reconciliationStatus,
    },
    database: {
      sizeBytes: dbSize,
      capacityBytes: dbCapBytes ?? null,
      capacityConfigured: Boolean(dbCap?.isConfigured),
      remainingBytes: dbRemaining,
      usagePercent: dbPct,
      classification: dbMon.databaseSize.classification,
      status: dbMon.databaseSize.status === 'ok' ? 'ok' : dbMon.databaseSize.status === 'error' ? 'error' : 'unavailable',
      measuredAt: dbMon.measuredAt,
    },
    tenants: {
      total: tenantCount ?? 0,
      overQuota,
      highestUsageTenant: highest,
    },
    alerts,
    generatedAt: new Date().toISOString(),
  };

  return result;
}

export async function getTenantStorageUsageTable(): Promise<TenantStorageRow[]> {
  const supabase = createServiceClient();
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id,name,plan:plans!plan_id(name,storage_limit_bytes)')
    .order('name');
  if (error) throw new Error(error.message);

  const tenantRows = (tenants ?? []) as Array<{ id: string; name: string; plan?: Array<{ name: string; storage_limit_bytes: number }> | { name: string; storage_limit_bytes: number } | null }>;
  const ids = tenantRows.map((t) => t.id);
  const { data: usage } = await supabase
    .from('tenant_storage_usage')
    .select('tenant_id,internal_usage_bytes,actual_usage_bytes,reconciliation_status,last_reconciled_at')
    .in('tenant_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const usageMap = new Map(((usage ?? []) as Array<Record<string, unknown>>).map((u) => [String(u.tenant_id), u]));

  // Calculated internal usage per tenant (shared with reconciliation).
  let calculationByTenant: Map<string, { trackedBytes: number; referencedUntrackedBytes: number; calculatedBytes: number }> | null = null;
  try {
    const calculation = await getCalculatedInternalUsageByTenant();
    calculationByTenant = calculation.byTenant;
  } catch {
    calculationByTenant = null;
  }

  return tenantRows.map((t) => {
    const plan = Array.isArray(t.plan) ? t.plan[0] : t.plan;
    const quota = plan?.storage_limit_bytes ?? null;
    const u = usageMap.get(t.id);
    const internal = u ? Math.max(0, Number(u.internal_usage_bytes) || 0) : null;
    const actual = u && u.actual_usage_bytes != null ? Math.max(0, Number(u.actual_usage_bytes) || 0) : null;
    const calculatedInternal = calculationByTenant?.get(t.id)?.calculatedBytes ?? null;
    const used = actual;
    const remaining = quota != null && used != null ? Math.max(quota - used, 0) : null;
    const usagePercent = quota != null && quota > 0 && used != null ? pct(used, quota) : null;
    return {
      tenantId: t.id,
      tenantName: t.name,
      planName: plan?.name ?? null,
      internalUsageBytes: internal,
      calculatedInternalUsageBytes: calculatedInternal,
      actualUsageBytes: actual,
      quotaBytes: quota,
      remainingBytes: remaining,
      usagePercent,
      status: tenantStatus(used, quota),
      reconciliationStatus: u ? (String(u.reconciliation_status) || null) : 'never_run',
      lastReconciledAt: u ? (String(u.last_reconciled_at) || null) : null,
    };
  });
}
