import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';

export type CapacityMetric = 'storage' | 'database';

export type CapacityConfig = {
  metricType: CapacityMetric;
  capacityBytes: number | null;
  isConfigured: boolean;
  sourceType: 'unconfigured' | 'manual' | 'supabase_api' | 'supabase_dashboard';
  sourceLabel: string | null;
  notes: string | null;
  configuredBy: string | null;
  configuredAt: string | null;
  verified: boolean;
  updatedAt: string | null;
};

export async function getCapacityConfigs(): Promise<CapacityConfig[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('infrastructure_capacity_config')
    .select('*')
    .order('metric_type');
  if (error) {
    // Migration may not be applied yet
    return [
      { metricType: 'storage', capacityBytes: null, isConfigured: false, sourceType: 'unconfigured', sourceLabel: null, notes: 'Capacity config table unavailable (migration not applied?)', configuredBy: null, configuredAt: null, verified: false, updatedAt: null },
      { metricType: 'database', capacityBytes: null, isConfigured: false, sourceType: 'unconfigured', sourceLabel: null, notes: 'Capacity config table unavailable (migration not applied?)', configuredBy: null, configuredAt: null, verified: false, updatedAt: null },
    ];
  }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const map = new Map(rows.map((r) => [String(r.metric_type), r]));
  const toConfig = (metric: CapacityMetric): CapacityConfig => {
    const r = map.get(metric);
    if (!r) {
      return { metricType: metric, capacityBytes: null, isConfigured: false, sourceType: 'unconfigured', sourceLabel: null, notes: null, configuredBy: null, configuredAt: null, verified: false, updatedAt: null };
    }
    return {
      metricType: metric,
      capacityBytes: r.capacity_bytes == null ? null : Number(r.capacity_bytes),
      isConfigured: Boolean(r.is_configured),
      sourceType: (r.source_type as CapacityConfig['sourceType']) ?? 'unconfigured',
      sourceLabel: (r.source_label as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      configuredBy: (r.configured_by as string | null) ?? null,
      configuredAt: (r.configured_at as string | null) ?? null,
      verified: Boolean(r.verified),
      updatedAt: (r.updated_at as string | null) ?? null,
    };
  };
  return [toConfig('storage'), toConfig('database')];
}

export async function setCapacityConfig(input: {
  metricType: CapacityMetric;
  capacityBytes: number | null;
  sourceType: 'unconfigured' | 'manual' | 'supabase_api' | 'supabase_dashboard';
  sourceLabel?: string | null;
  notes?: string | null;
  configuredBy?: string | null;
  verified?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient();
  const isConfigured = input.capacityBytes != null && input.capacityBytes > 0 && input.sourceType !== 'unconfigured';
  const { error } = await supabase
    .from('infrastructure_capacity_config')
    .upsert(
      {
        metric_type: input.metricType,
        capacity_bytes: input.capacityBytes,
        is_configured: isConfigured,
        source_type: input.sourceType,
        source_label: input.sourceLabel ?? null,
        notes: input.notes ?? null,
        configured_by: input.configuredBy ?? null,
        configured_at: isConfigured ? new Date().toISOString() : null,
        verified: Boolean(input.verified) && input.sourceType !== 'manual' ? true : Boolean(input.verified),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'metric_type' }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
