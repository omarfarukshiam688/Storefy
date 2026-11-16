import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';

export type MetricClassification = 'EXACT' | 'DERIVED' | 'ESTIMATED' | 'UNAVAILABLE';

export type DatabaseTableSize = {
  schema: string;
  name: string;
  totalBytes: number | null;
  tableBytes: number | null;
  indexBytes: number | null;
  rowEstimate: number | null;
  classification: MetricClassification;
};

export type DatabaseMonitoringResult = {
  measuredAt: string;
  databaseSize: {
    bytes: number | null;
    classification: MetricClassification;
    status: 'ok' | 'unavailable' | 'error';
    error?: string;
  };
  largestTables: {
    items: DatabaseTableSize[];
    classification: MetricClassification;
    status: 'ok' | 'unavailable' | 'error';
    error?: string;
  };
};

export async function getDatabaseMonitoring(limit = 20): Promise<DatabaseMonitoringResult> {
  const supabase = createServiceClient();
  const measuredAt = new Date().toISOString();

  // Database size via RPC helper or direct query attempt through SQL function exposure.
  // Supabase JS client cannot run arbitrary SQL; try a lightweight RPC if present, else unavailable.
  let dbBytes: number | null = null;
  let dbError: string | undefined;

  try {
    const { data, error } = await supabase.rpc('get_database_size_bytes' as never);
    if (!error && typeof data === 'number') {
      dbBytes = data;
    } else if (!error && data && typeof (data as { bytes?: number }).bytes === 'number') {
      dbBytes = (data as { bytes: number }).bytes;
    } else {
      dbError = error?.message ?? 'pg_database_size not accessible via application client; use SQL/RPC helper or Supabase dashboard.';
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Database size unavailable';
  }

  // Largest tables: attempt RPC helper (privileged catalog access not available via PostgREST by default).
  let tables: DatabaseTableSize[] = [];
  let tablesError: string | undefined;

  try {
    const { data, error } = await supabase.rpc('get_largest_tables' as never, { p_limit: limit } as never);
    if (!error && Array.isArray(data)) {
      tables = (data as Array<Record<string, unknown>>).map((r) => ({
        schema: String(r.schema_name ?? r.schema ?? r.table_schema ?? 'public'),
        name: String(r.name ?? r.table_name ?? ''),
        totalBytes: typeof r.total_bytes === 'number' ? r.total_bytes : null,
        tableBytes: typeof r.table_bytes === 'number' ? r.table_bytes : null,
        indexBytes: typeof r.index_bytes === 'number' ? r.index_bytes : null,
        rowEstimate: typeof r.row_estimate === 'number' ? r.row_estimate : null,
        classification: 'EXACT' as MetricClassification,
      })).filter((t) => t.name);
      if (tables.length === 0) tablesError = 'No table size data returned.';
    } else {
      tablesError = error?.message ?? 'Table size metrics not accessible via application client; requires privileged RPC helper.';
    }
  } catch (e) {
    tablesError = e instanceof Error ? e.message : 'Table sizes unavailable';
  }

  const dbStatus: 'ok' | 'unavailable' | 'error' = dbBytes == null ? 'unavailable' : 'ok';
  const dbClass: MetricClassification = dbBytes == null ? 'UNAVAILABLE' : 'EXACT';
  const tablesStatus: 'ok' | 'unavailable' | 'error' = tables.length > 0 ? 'ok' : 'unavailable';
  const tablesClass: MetricClassification = tables.length > 0 ? 'EXACT' : 'UNAVAILABLE';

  return {
    measuredAt,
    databaseSize: { bytes: dbBytes, classification: dbClass, status: dbStatus, error: dbError },
    largestTables: { items: tables, classification: tablesClass, status: tablesStatus, error: tablesError },
  };
}

export async function recordDatabaseSnapshot(): Promise<void> {
  const supabase = createServiceClient();
  const result = await getDatabaseMonitoring(20);
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // Global database size snapshot
  await supabase.from('infrastructure_usage_snapshots').upsert(
    {
      snapshot_date: today,
      metric_type: 'database_size',
      scope: 'global',
      tenant_id: null,
      object_name: null,
      value_bytes: result.databaseSize.bytes,
      secondary_value_bytes: null,
      source: 'pg_database_size',
      accuracy: result.databaseSize.classification,
      status: result.databaseSize.status === 'ok' ? 'ok' : result.databaseSize.status === 'error' ? 'failed' : 'unavailable',
      metadata: result.databaseSize.error ? { error: result.databaseSize.error } : {},
      measured_at: nowIso,
    },
    { onConflict: 'snapshot_date,metric_type,scope,tenant_id,object_name' as never }
  );

  // Per-table snapshots (best-effort)
  if (result.largestTables.status === 'ok') {
    for (const t of result.largestTables.items) {
      await supabase.from('infrastructure_usage_snapshots').upsert(
        {
          snapshot_date: today,
          metric_type: 'database_table',
          scope: 'table',
          tenant_id: null,
          object_name: `${t.schema}.${t.name}`,
          value_bytes: t.totalBytes,
          secondary_value_bytes: t.indexBytes,
          source: 'pg_total_relation_size',
          accuracy: t.classification,
          status: t.totalBytes == null ? 'unavailable' : 'ok',
          metadata: { table_bytes: t.tableBytes, row_estimate: t.rowEstimate },
          measured_at: nowIso,
        },
        { onConflict: 'snapshot_date,metric_type,scope,tenant_id,object_name' as never }
      );
    }
  }
}
