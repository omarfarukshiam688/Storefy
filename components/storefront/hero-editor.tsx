'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SectionToggle } from './section-toggle';

interface HeroEditorProps {
  section: { section_key: string; is_enabled: boolean; config: Record<string, unknown> };
  onUpdate: (config: Record<string, unknown>, isEnabled: boolean) => void;
  tenantId: string;
}

export function HeroEditor({ section, onUpdate, tenantId }: HeroEditorProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEnabled = section.is_enabled;
  const heading = React.useMemo(() => (section.config.heading as string) || '', [section.config]);
  const subheading = React.useMemo(() => (section.config.subheading as string) || '', [section.config]);
  const ctaLabel = React.useMemo(() => (section.config.cta_label as string) || 'Explore Products', [section.config]);
  const ctaDestination = React.useMemo(() => (section.config.cta_destination as string) || './products', [section.config]);
  const imagePath = React.useMemo(() => (section.config.image_path as string | null) || null, [section.config]);
  const [imagePreview, setImagePreview] = React.useState<string | null>(imagePath);

  const updateField = (field: string, value: string) => {
    onUpdate(
      { heading, subheading, cta_label: ctaLabel, cta_destination: ctaDestination, image_path: imagePath, [field]: value },
      isEnabled
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/tenants/${tenantId}/storefront/hero-image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      onUpdate({ heading, subheading, cta_label: ctaLabel, cta_destination: ctaDestination, image_path: data.image_path }, isEnabled);
      setImagePreview(data.signed_url);
    } catch (err) {
      console.error('Upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/storefront/hero-image?image_path=${encodeURIComponent(imagePath || '')}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(err.error || 'Delete failed');
      }

      onUpdate({ heading, subheading, cta_label: ctaLabel, cta_destination: ctaDestination, image_path: null }, isEnabled);
      setImagePreview(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Hero Section</h3>
        <SectionToggle checked={isEnabled} onCheckedChange={(checked) => onUpdate(section.config as Record<string, unknown>, checked)} />
      </div>

      {isEnabled && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="hero-heading" className="text-sm font-semibold">
              Heading
            </Label>
            <input
              id="hero-heading"
              type="text"
              value={heading}
              onChange={(e) => updateField('heading', e.target.value)}
              placeholder="Authentic Homemade Flavors"
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="hero-subheading" className="text-sm font-semibold">
              Subheading
            </Label>
            <textarea
              id="hero-subheading"
              value={subheading}
              onChange={(e) => updateField('subheading', e.target.value)}
              placeholder="Freshly prepared with traditional recipes."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label htmlFor="hero-cta-label" className="text-sm font-semibold">
                CTA Label
              </Label>
              <input
                id="hero-cta-label"
                type="text"
                value={ctaLabel}
                onChange={(e) => updateField('cta_label', e.target.value)}
                placeholder="Explore Products"
                className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="hero-cta-destination" className="text-sm font-semibold">
                CTA Destination
              </Label>
              <input
                id="hero-cta-destination"
                type="text"
                value={ctaDestination}
                onChange={(e) => updateField('cta_destination', e.target.value)}
                placeholder="./products"
                className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-semibold">Hero Image</Label>
            <div className="rounded-lg border border-dashed border-border p-6">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Hero preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleDeleteImage}
                    aria-label="Remove hero image"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.75L12 15.75L18 9.75" />
                    </svg>
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-slate-700">Click to upload hero image</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, WebP, GIF (max 5MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
                aria-label="Upload hero image"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
