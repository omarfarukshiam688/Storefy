'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, HardDrive, AlertTriangle, RefreshCw, Server, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

type IconComp = React.ComponentType<{ className?: string }>;

type Overview = {
  storage?: { actualUsedBytes?: number | null; internalUsedBytes?: number | null; capacityConfigured?: boolean; capacityBytes?: number | null; capacitySource?: string; capacityVerified?: boolean; remainingBytes?: number | null; usagePercent?: number | null; status?: string; reconciliationStatus?: string; lastReconciledAt?: string | null };
  database?: { sizeBytes?: number | null; capacityConfigured?: boolean; capacityBytes?: number | null; remainingBytes?: number | null; usagePercent?: number | null; classification?: string; status?: string };
  tenants?: { overQuota?: number; total?: number };
  alerts?: Array<{ isActive?: boolean }>;
};
type TenantRow = { tenantId: string; tenantName: string; planName?: string | null; internalUsageBytes?: number | null; actualUsageBytes?: number | null; quotaBytes?: number | null; remainingBytes?: number | null; usagePercent?: number | null; status?: string };
type TableInfo = { schema: string; name: string; totalBytes: number; tableBytes: number; indexBytes: number };
type ReconRun = { id: string; status: string; started_at?: string | null; total_objects_scanned?: number | null; discrepancy_count?: number | null; orphan_object_count?: number | null; missing_object_count?: number | null; error_message?: string | null };

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function StatCard({ title, value, sub, icon: Icon }: { title: string; value: string; sub?: string; icon: IconComp }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function InfrastructureUsageDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [storage, setStorage] = useState<{ tenants?: TenantRow[] } | null>(null);
  const [database, setDatabase] = useState<{ largestTables?: { status?: string; error?: string; items?: TableInfo[] } } | null>(null);
  const [history, setHistory] = useState<{ available?: boolean; note?: string } | null>(null);
  const [recon, setRecon] = useState<{ available?: boolean; note?: string; runs?: ReconRun[] } | null>(null);
  const [runningRecon, setRunningRecon] = useState(false);
  const [reconResult, setReconResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      setReconResult(null);
      try {
        const [o, s, d, h, r] = await Promise.all([
          fetch('/api/platform/infrastructure/overview').then((x) => x.json()),
          fetch('/api/platform/infrastructure/storage').then((x) => x.json()),
          fetch('/api/platform/infrastructure/database').then((x) => x.json()),
          fetch('/api/platform/infrastructure/history?days=30').then((x) => x.json()),
          fetch('/api/platform/infrastructure/reconciliation').then((x) => x.json()),
        ]);
        if (cancelled) return;
        if (!o.ok) throw new Error(o.error || 'Failed to load infrastructure data');
        setOverview(o.data as Overview);
        setStorage(s.data as { tenants?: TenantRow[] });
        setDatabase(d.data as { largestTables?: { status?: string; error?: string; items?: TableInfo[] } });
        setHistory(h.data as { available?: boolean; note?: string });
        setRecon(r.data as { available?: boolean; note?: string; runs?: ReconRun[] });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load infrastructure data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [reloadTick]);

  function load() {
    setReloadTick((n) => n + 1);
  }

  async function runReconciliation() {
    setRunningRecon(true);
    setReconResult(null);
    try {
      const res = await fetch('/api/platform/infrastructure/reconciliation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ triggerSource: 'manual' }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.data?.error || json.error || 'Reconciliation failed');
      setReconResult({ ok: true, message: 'Reconciliation completed successfully.' });
      load();
    } catch (e) {
      setReconResult({ ok: false, message: e instanceof Error ? e.message : 'Reconciliation failed.' });
    } finally {
      setRunningRecon(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-violet-100 bg-white/80 p-8 text-slate-600">Loading infrastructure usage...</div>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Failed to load infrastructure data</p>
        <p className="mt-1 text-sm">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  const st = overview?.storage;
  const db = overview?.database;
  const tenants = storage?.tenants ?? [];

  // Reconciliation result banner
  const reconBanner = reconResult ? (
    <div className={`rounded-lg border p-3 mb-4 text-sm ${reconResult.ok ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
      {reconResult.message}
    </div>
  ) : null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[30px] border border-violet-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,255,255,0.55)_32%,_rgba(218,233,255,0.45)_70%,_rgba(224,215,255,0.35)_100%)] p-6 shadow-[0_30px_80px_-40px_rgba(79,70,229,0.45)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
              <Activity className="h-3.5 w-3.5" /> Infrastructure Usage
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.07em] text-slate-900">Storage, Database & Capacity</h1>
            <p className="mt-2 text-sm text-slate-600">Super Admin monitoring. Metrics are shown as exact, derived, estimated, or unavailable based on verified sources.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white" disabled={runningRecon} onClick={() => void runReconciliation()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {runningRecon ? 'Running...' : 'Run Reconciliation'}
            </Button>
          </div>
        </div>
        {reconBanner}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Storage Monitoring</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Actual Storage Used"
            value={formatBytes(st?.actualUsedBytes ?? st?.internalUsedBytes)}
            sub={st?.actualUsedBytes == null ? 'Reconciled actual unavailable; showing internal/best-effort' : `Status: ${st?.status}`}
            icon={HardDrive}
          />
          <StatCard
            title="Infrastructure Capacity"
            value={st?.capacityConfigured ? formatBytes(st?.capacityBytes) : 'Unavailable'}
            sub={st?.capacityConfigured ? `Source: ${st?.capacitySource}${st?.capacityVerified ? ' (verified)' : ' (manual/unverified)'}` : 'Not configured - no fabricated limits'}
            icon={Server}
          />
          <StatCard
            title="Remaining Storage"
            value={st?.capacityConfigured ? formatBytes(st?.remainingBytes) : 'Unavailable'}
            sub={st?.usagePercent != null ? `${st.usagePercent}% used` : 'Percentage unavailable'}
            icon={Activity}
          />
          <StatCard
            title="Reconciliation"
            value={st?.reconciliationStatus ?? 'never_run'}
            sub={st?.lastReconciledAt ? `Last: ${new Date(st.lastReconciledAt).toLocaleString()}` : 'No successful reconciliation recorded'}
            icon={RefreshCw}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Database Monitoring</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Database Size"
            value={formatBytes(db?.sizeBytes)}
            sub={`${db?.classification ?? 'UNAVAILABLE'} · ${db?.status ?? 'unavailable'}`}
            icon={Database}
          />
          <StatCard
            title="Database Capacity"
            value={db?.capacityConfigured ? formatBytes(db?.capacityBytes) : 'Unavailable'}
            sub="Never inferred or fabricated"
            icon={Server}
          />
          <StatCard
            title="DB Remaining"
            value={db?.capacityConfigured ? formatBytes(db?.remainingBytes) : 'Unavailable'}
            sub={db?.usagePercent != null ? `${db.usagePercent}% used` : 'Percentage unavailable'}
            icon={Activity}
          />
          <StatCard
            title="Tenants Over Quota"
            value={String(overview?.tenants?.overQuota ?? 0)}
            sub={`Total tenants: ${overview?.tenants?.total ?? 0}`}
            icon={ShieldAlert}
          />
        </div>
        {database?.largestTables?.status !== 'ok' ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Largest tables unavailable: {database?.largestTables?.error || 'Requires privileged DB access/RPC helper (see setup docs).'}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-violet-100 bg-white/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-violet-50/60"><tr><th className="px-4 py-3">Table</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Table</th><th className="px-4 py-3">Index</th></tr></thead>
              <tbody>
                {(database.largestTables.items || []).map((t) => (
                  <tr key={`${t.schema}.${t.name}`} className="border-t border-slate-100"><td className="px-4 py-2 font-mono text-xs">{t.schema}.{t.name}</td><td className="px-4 py-2">{formatBytes(t.totalBytes)}</td><td className="px-4 py-2">{formatBytes(t.tableBytes)}</td><td className="px-4 py-2">{formatBytes(t.indexBytes)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Tenant-wise Storage Usage</h2>
        <div className="overflow-x-auto rounded-2xl border border-violet-100 bg-white/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
              <tr className="border-b border-violet-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                <th className="px-4 py-3">Tenant</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Internal</th><th className="px-4 py-3">Actual</th><th className="px-4 py-3">Quota</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Usage %</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No tenant usage data available.</td></tr>
              ) : tenants.map((t) => (
                <tr key={t.tenantId} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.tenantName}</td>
                  <td className="px-4 py-3 text-slate-600">{t.planName ?? '—'}</td>
                  <td className="px-4 py-3">{formatBytes(t.internalUsageBytes)}</td>
                  <td className="px-4 py-3">{t.actualUsageBytes == null ? 'Unavailable' : formatBytes(t.actualUsageBytes)}</td>
                  <td className="px-4 py-3">{formatBytes(t.quotaBytes)}</td>
                  <td className="px-4 py-3">{t.remainingBytes == null ? 'Unavailable' : formatBytes(t.remainingBytes)}</td>
                  <td className="px-4 py-3">{t.usagePercent == null ? 'Unavailable' : `${t.usagePercent}%`}</td>
                  <td className="px-4 py-3"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">{t.status ?? 'unavailable'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Capacity & Recommendations</h2>
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 space-y-3 text-sm text-slate-700">
            <p><strong>Usage Alert Thresholds</strong> স্টোরেজ বা ডেটাবেজের ব্যবহার নির্ধারিত সীমার কাছে পৌঁছালে সতর্ক করা হবে। ৭০% ব্যবহার হলে সাধারণ সতর্কতা, ৮৫% হলে বেশি সতর্কতা এবং ৯৫% হলে জরুরি সতর্কতা দেখানো হবে। তবে মোট ধারণক্ষমতা নির্ধারণ করা না থাকলে এই সতর্কতা হিসাব করা সম্ভব নয়।</p>
            <p><strong>Usage Growth Insights</strong> আগের অন্তত ৭ দিনের তথ্যের সঙ্গে বর্তমান ব্যবহার তুলনা করে বোঝার চেষ্টা করা হয় স্টোরেজ কত দ্রুত বাড়ছে। এক দিনের হঠাৎ বেশি ব্যবহার দেখেই জরুরি সতর্কতা দেওয়া হবে না।</p>
            <p><strong>Current Active Alerts</strong> {(overview?.alerts || []).filter((a) => a.isActive).length || 'এই মুহূর্তে কোনো সক্রিয় সতর্কতা নেই। তবে ধারণক্ষমতার তথ্য সেট করা না থাকলে ব্যবহার কতটা ঝুঁকিপূর্ণ, তা নিশ্চিতভাবে বলা সম্ভব নয়।'}</p>
            <p className="text-amber-700 flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4" /> স্টোরেজ বা ডেটাবেজের জায়গা বাড়ানোর সিদ্ধান্ত Super Admin-কে নিজে নিতে হবে। অবকাঠামোর জায়গা বাড়ালেই কোনো প্রতিষ্ঠানের প্ল্যানের নির্ধারিত স্টোরেজ সীমা স্বয়ংক্রিয়ভাবে বাড়বে না।</p>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Reconciliation History</h2>
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 text-sm">
            {!recon?.available ? (
              <p className="text-slate-600">সামঞ্জস্য ইতিহাস উপলব্ধ নয়: {recon?.note || 'মাইগ্রেশন প্রয়োগ করা হয়নি অথবা অ্যাক্সেস নেই'}</p>
            ) : (recon.runs || []).length === 0 ? (
              <p className="text-slate-600">এখনো স্টোরেজের হিসাব যাচাই করা হয়নি। উপরের &apos;Run Reconciliation&apos; বোতামে ক্লিক করলে সিস্টেম প্রতিটি প্রতিষ্ঠানের স্টোরেজে থাকা ফাইলের হিসাব এবং ডেটাবেজে সংরক্ষিত হিসাব মিলিয়ে দেখবে। কোনো অমিল পাওয়া গেলে তা শনাক্ত করে সংরক্ষণ করবে।</p>
            ) : (
              <ul className="space-y-2">
                {(recon.runs || []).slice(0, 8).map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between"><span className="font-medium">{r.status}</span><span className="text-xs text-slate-500">{r.started_at ? new Date(r.started_at).toLocaleString() : ''}</span></div>
                    <div className="mt-1 text-xs text-slate-600">বস্তু: {r.total_objects_scanned ?? 0} · সতর্কতা: {r.discrepancy_count ?? 0} · অপশ: {r.orphan_object_count ?? 0} · অনুপস্থিত: {r.missing_object_count ?? 0}</div>
                    {r.error_message ? <div className="mt-1 text-xs text-red-600">{r.error_message}</div> : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-600">প্রতিদিন বাংলাদেশ সময় সকাল ৬টায় এই হিসাব স্বয়ংক্রিয়ভাবে যাচাই করার পরিকল্পনা রয়েছে। তবে এর জন্য সার্ভারে আলাদা সময়সূচি সেট করতে হবে। সেটি চালু না করা পর্যন্ত তোমাকে ড্যাশবোর্ড থেকে নিজে এই কাজ শুরু করতে হবে।</p>
          </div>
        </div>
      </section>

      {history && !history.available ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Historical snapshots unavailable: {history.note || 'migration not applied yet'}. Growth insights require ≥7 days of snapshots and will remain informational.
        </section>
      ) : null}
    </div>
  );
}
