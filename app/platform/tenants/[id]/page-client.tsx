'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Shield, AlertTriangle, Ban, CheckCircle2, Package, ShoppingCart, Users, HardDrive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_id: string;
  settings: Record<string, unknown>;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    product_limit: number;
    order_limit: number;
    storage_limit_bytes: number;
    features: Record<string, unknown>;
    is_active: boolean;
  } | null;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  usage: {
    products: number;
    orders: number;
    members: number;
    storage_used_bytes: number;
  };
}

interface PlatformTenantDetailClientProps {
  tenant: TenantDetail;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function PlatformTenantDetailClient({ tenant }: PlatformTenantDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = React.useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = React.useState(false);
  const [showAssignPlanDialog, setShowAssignPlanDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [selectedPlanId, setSelectedPlanId] = React.useState('');
  const [plans, setPlans] = React.useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/platform/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSuspend = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}/suspend`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to suspend tenant');
      }
      setShowSuspendDialog(false);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to suspend tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}/reactivate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to reactivate tenant');
      }
      setShowReactivateDialog(false);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to reactivate tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlanId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}/assign-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to assign plan');
      }
      setShowAssignPlanDialog(false);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to assign plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== tenant.name) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedName: tenant.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to delete tenant');
      }
      setShowDeleteDialog(false);
      router.push('/platform/tenants');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete tenant');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
            Tenant Detail
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.05em] text-slate-900">
            {tenant.name}
          </h1>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
              Tenant Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Name
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{tenant.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Slug
                </p>
                <p className="mt-1 text-sm font-mono text-slate-900">/{tenant.slug}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge variant={tenant.is_active ? 'success' : 'error'}>
                    {tenant.is_active ? 'Active' : 'Suspended'}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Plan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {tenant.plan?.name ?? 'No plan'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Created
                </p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(tenant.created_at)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Last Updated
                </p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(tenant.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
              Usage
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-600" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Products
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {tenant.usage.products}
                </p>
                {tenant.plan && (
                  <p className="text-xs text-slate-500">
                    of {tenant.plan.product_limit === -1 ? '∞' : tenant.plan.product_limit.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-violet-600" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Orders
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {tenant.usage.orders}
                </p>
                {tenant.plan && (
                  <p className="text-xs text-slate-500">
                    of {tenant.plan.order_limit === -1 ? '∞' : tenant.plan.order_limit.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Members
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {tenant.usage.members}
                </p>
                {tenant.plan && typeof tenant.plan.features?.team_members === 'number' && (
                  <p className="text-xs text-slate-500">
                    of {(tenant.plan.features.team_members as number).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-violet-600" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Storage
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatBytes(tenant.usage.storage_used_bytes)}
                </p>
                {tenant.plan && (
                  <p className="text-xs text-slate-500">
                    of {formatBytes(tenant.plan.storage_limit_bytes)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
              Owner
            </h2>
            {tenant.owner ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-sm font-semibold text-white">
                  {(tenant.owner.name ?? tenant.owner.email ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {tenant.owner.name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">{tenant.owner.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No owner found</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
              Actions
            </h2>
            <div className="space-y-3">
              {tenant.is_active ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowSuspendDialog(true)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend Tenant
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setShowReactivateDialog(true)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Reactivate Tenant
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAssignPlanDialog(true)}
              >
                <Shield className="mr-2 h-4 w-4" />
                Assign Plan
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href={`/platform/tenants/${tenant.id}/members`} target="_blank" rel="noreferrer">
                  <Users className="mr-2 h-4 w-4" />
                  View Members
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href={`/s/${tenant.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Storefront
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <h2 className="text-lg font-bold tracking-tight text-red-900 mb-2">
              Danger Zone
            </h2>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete <strong>{tenant.name}</strong> and all associated business data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Permanently Delete Tenant
            </Button>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
              Plan Details
            </h2>
            {tenant.plan ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Plan Name
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {tenant.plan.name}
                  </p>
                </div>
                {tenant.plan.description && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {tenant.plan.description}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Price
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {`$${(tenant.plan.price_monthly / 100).toFixed(2)}/month`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Product Limit
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {tenant.plan.product_limit === -1 ? 'Unlimited' : tenant.plan.product_limit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Order Limit
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {tenant.plan.order_limit === -1 ? 'Unlimited' : tenant.plan.order_limit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Storage Limit
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatBytes(tenant.plan.storage_limit_bytes)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Features
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tenant.plan.features &&
                      Object.entries(tenant.plan.features).map(([key, value]) => (
                        <StatusBadge key={key} variant="brand">
                          {key}: {String(value)}
                        </StatusBadge>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No plan assigned</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              This will suspend <strong>{tenant.name}</strong>. All active sessions will be terminated and members will no longer be able to access the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">This action can be reversed</p>
                <p className="text-xs text-amber-700 mt-1">
                  You can reactivate the tenant at any time from the tenant detail page.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} loading={loading}>
              Suspend Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Tenant</DialogTitle>
            <DialogDescription>
              This will reactivate <strong>{tenant.name}</strong>. Members will regain access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReactivateDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleReactivate} loading={loading}>
              Reactivate Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignPlanDialog} onOpenChange={setShowAssignPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Plan</DialogTitle>
            <DialogDescription>
              Select a plan to assign to <strong>{tenant.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  'w-full text-left rounded-xl border p-4 transition-all',
                  selectedPlanId === plan.id
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-slate-200 hover:border-violet-200'
                )}
              >
                <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignPlanDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAssignPlan} loading={loading} disabled={!selectedPlanId}>
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-900">Permanently Delete Tenant</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{tenant.name}</strong> and all associated business data including products, orders, customers, reviews, and storage files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">This action is permanent</p>
                <p className="text-xs text-red-700 mt-1">
                  All tenant data will be permanently removed. Tenant-owned storage files will be deleted. Some tenant users may be removed from authentication if they do not belong to any other tenant.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="delete-confirm" className="text-sm font-medium text-slate-900">
              To confirm, type <span className="font-mono bg-slate-100 px-1 rounded">{tenant.name}</span> below:
            </label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={tenant.name}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={loading} disabled={deleteConfirmText !== tenant.name}>
              Permanently Delete Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
