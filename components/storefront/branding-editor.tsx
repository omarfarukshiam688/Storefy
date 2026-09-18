'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tenant } from '@/types';

interface BrandingEditorProps {
  tenant: Tenant;
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

export function BrandingEditor({ tenant }: BrandingEditorProps) {
  const settings = tenant.settings as Record<string, unknown> | null;
  const [primaryColor, setPrimaryColor] = React.useState(
    (settings?.primary_color as string) || '#111111'
  );
  const [logoUrl, setLogoUrl] = React.useState(
    (settings?.logo_url as string) || ''
  );
  const [faviconUrl, setFaviconUrl] = React.useState(
    (settings?.favicon_url as string) || ''
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: primaryColor,
          logo_url: logoUrl || null,
          favicon_url: faviconUrl || null,
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

  return (
    <div className="space-y-6">
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
                disabled={isSaving}
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
          <Label htmlFor="logo-url" className="text-sm font-semibold">
            Logo URL
          </Label>
          <Input
            id="logo-url"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={isSaving}
            placeholder="https://example.com/logo.png"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Favicon</h3>
          <p className="text-sm text-muted-foreground">
            Upload a favicon to display in browser tabs.
          </p>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="favicon-url" className="text-sm font-semibold">
            Favicon URL
          </Label>
          <Input
            id="favicon-url"
            type="url"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            disabled={isSaving}
            placeholder="https://example.com/favicon.ico"
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button onClick={handleSave} disabled={isSaving} className="h-11">
          {isSaving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </div>
  );
}
