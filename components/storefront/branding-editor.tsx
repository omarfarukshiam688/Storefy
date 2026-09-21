'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tenant } from '@/types';
import { Upload, X, Loader2, HardDrive } from 'lucide-react';
import { CompactResourceUsage } from '@/components/admin/compact-resource-usage';

interface BrandingEditorProps {
  tenant: Tenant;
  storageUsedBytes?: number;
  storageLimitBytes?: number;
}

const PRESET_COLORS = [
  '#111111',
  '#16A34A',
  '#7C3AED',
  '#2563EB',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#0F7490',
];

export function BrandingEditor({ tenant, storageUsedBytes, storageLimitBytes }: BrandingEditorProps) {
  const settings = tenant.settings as Record<string, unknown> | null;
  const [primaryColor, setPrimaryColor] = React.useState(
    (settings?.primary_color as string) || '#111111'
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const initialLogoPath = React.useMemo(
    () => (settings?.logo_url as string | null) || null,
    [settings?.logo_url]
  );

  const initialFaviconPath = React.useMemo(
    () => (settings?.favicon_url as string | null) || null,
    [settings?.favicon_url]
  );

  const [logoPath, setLogoPath] = React.useState<string | null>(initialLogoPath);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [faviconPath, setFaviconPath] = React.useState<string | null>(initialFaviconPath);
  const [faviconPreview, setFaviconPreview] = React.useState<string | null>(null);
  const [faviconError, setFaviconError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const faviconInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function resolveLogo() {
      if (!initialLogoPath) {
        setLogoPath(null);
        setLogoPreview(null);
        return;
      }

      if (initialLogoPath.startsWith('http://') || initialLogoPath.startsWith('https://')) {
        setLogoPath(initialLogoPath);
        setLogoPreview(initialLogoPath);
        return;
      }

      try {
        const res = await fetch(`/api/tenants/${tenant.id}/storefront/logo-url?path=${encodeURIComponent(initialLogoPath)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setLogoPath(initialLogoPath);
            setLogoPreview(data.signed_url);
          }
        } else {
          if (!cancelled) {
            setLogoPath(null);
            setLogoPreview(null);
          }
        }
      } catch {
        if (!cancelled) {
          setLogoPath(null);
          setLogoPreview(null);
        }
      }
    }

    resolveLogo();
    return () => {
      cancelled = true;
    };
  }, [initialLogoPath, tenant.id]);

  React.useEffect(() => {
    let cancelled = false;

    async function resolveFavicon() {
      if (!initialFaviconPath) {
        setFaviconPath(null);
        setFaviconPreview(null);
        return;
      }

      if (initialFaviconPath.startsWith('http://') || initialFaviconPath.startsWith('https://')) {
        setFaviconPath(initialFaviconPath);
        setFaviconPreview(initialFaviconPath);
        return;
      }

      try {
        const res = await fetch(`/api/tenants/${tenant.id}/storefront/favicon-url?path=${encodeURIComponent(initialFaviconPath)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setFaviconPath(initialFaviconPath);
            setFaviconPreview(data.signed_url);
          }
        } else {
          if (!cancelled) {
            setFaviconPath(null);
            setFaviconPreview(null);
          }
        }
      } catch {
        if (!cancelled) {
          setFaviconPath(null);
          setFaviconPreview(null);
        }
      }
    }

    resolveFavicon();
    return () => {
      cancelled = true;
    };
  }, [initialFaviconPath, tenant.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: primaryColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      toast.success('Branding saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setLogoError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/tenants/${tenant.id}/storefront/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setLogoPath(data.storage_path);
      setLogoPreview(data.signed_url);
      toast.success('Logo uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Failed to upload logo';
      setLogoError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleLogoRemove = async () => {
    if (!logoPath) return;

    setIsUploading(true);
    setLogoError(null);

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/storefront/logo?image_path=${encodeURIComponent(logoPath)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(err.error || 'Delete failed');
      }

      setLogoPath(null);
      setLogoPreview(null);
      toast.success('Logo removed');
    } catch (err) {
      console.error('Delete error:', err);
      const message = err instanceof Error ? err.message : 'Failed to remove logo';
      setLogoError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFaviconError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/tenants/${tenant.id}/storefront/favicon`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setFaviconPath(data.storage_path);
      setFaviconPreview(data.signed_url);
      toast.success('Store icon uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Failed to upload store icon';
      setFaviconError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (faviconInputRef.current) {
        faviconInputRef.current.value = '';
      }
    }
  };

  const handleFaviconRemove = async () => {
    if (!faviconPath) return;

    setIsUploading(true);
    setFaviconError(null);

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/storefront/favicon?image_path=${encodeURIComponent(faviconPath)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(err.error || 'Delete failed');
      }

      setFaviconPath(null);
      setFaviconPreview(null);
      toast.success('Store icon removed');
    } catch (err) {
      console.error('Delete error:', err);
      const message = err instanceof Error ? err.message : 'Failed to remove store icon';
      setFaviconError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {storageUsedBytes !== undefined && storageLimitBytes !== undefined && (
        <CompactResourceUsage
          title="Storage"
          icon={HardDrive}
          used={storageUsedBytes}
          limit={storageLimitBytes}
          className="w-full sm:w-auto"
        />
      )}
      <div>
        <h3 className="text-base font-semibold">Brand Color</h3>
        <p className="text-sm text-muted-foreground">
          Choose a primary color for your storefront. This will be used for
          CTA buttons, links, and accent elements.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="flex-1">
            <Label htmlFor="primary-color" className="text-sm font-semibold">
              Primary Color
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                id="primary-color"
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={isSaving || isUploading}
                className="h-10 font-mono text-sm"
                placeholder="#111111"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setPrimaryColor(color)}
              className={
                'h-9 w-9 rounded-lg border-2 transition-all' +
                (primaryColor.toLowerCase() === color.toLowerCase()
                  ? 'border-slate-900 ring-2 ring-offset-2 ring-violet-500'
                  : 'border-border hover:border-slate-400')
              }
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Use a valid hex color code (e.g., #111111, #16A34A, #7C3AED).
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Logo</h3>
          <p className="text-sm text-muted-foreground">
            Upload your store logo to display in the header.
          </p>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-semibold">Logo</Label>
          <div className="rounded-lg border border-dashed border-border p-6">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 w-auto object-contain"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading || isSaving}
                    className="h-9"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Replace Logo
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleLogoRemove}
                    disabled={isUploading || isSaving}
                    className="h-9"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    logoInputRef.current?.click();
                  }
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-slate-700">Click to upload logo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, WebP or SVG • Transparent background recommended
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 2MB
                </p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif"
              onChange={handleLogoUpload}
              disabled={isUploading || isSaving}
              className="hidden"
              aria-label="Upload logo"
            />
          </div>
          {logoError && (
            <p className="text-sm font-medium text-destructive">{logoError}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Store Icon</h3>
          <p className="text-sm text-muted-foreground">
            Upload a store icon to use as the favicon in browser tabs.
          </p>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-semibold">Store Icon</Label>
          <div className="rounded-lg border border-dashed border-border p-6">
            {faviconPreview ? (
              <div className="relative">
                <img
                  src={faviconPreview}
                  alt="Store icon preview"
                  className="h-12 w-12 rounded-full object-contain"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={isUploading || isSaving}
                    className="h-9"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Replace Icon
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleFaviconRemove}
                    disabled={isUploading || isSaving}
                    className="h-9"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center cursor-pointer"
                onClick={() => faviconInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    faviconInputRef.current?.click();
                  }
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-slate-700">Click to upload store icon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, WebP or SVG • Circular icon recommended
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 2MB
                </p>
              </div>
            )}
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif"
              onChange={handleFaviconUpload}
              disabled={isUploading || isSaving}
              className="hidden"
              aria-label="Upload store icon"
            />
          </div>
          {faviconError && (
            <p className="text-sm font-medium text-destructive">{faviconError}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button onClick={handleSave} disabled={isSaving || isUploading} className="h-11">
          {isSaving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </div>
  );
}
