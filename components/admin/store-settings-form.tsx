'use client';

import * as React from 'react';
import { updateTenantSettingsSchema, updateTenantSlugSchema } from '@/lib/validation/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tenant } from '@/types';

interface SettingsFormProps {
  tenant: Tenant;
  onSaved?: () => void;
}

export function StoreSettingsForm({ tenant, onSaved }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formData, setFormData] = React.useState({
    name: tenant.name || '',
    slug: tenant.slug || '',
    description: (tenant.settings?.description as string) || '',
    contact_email: (tenant.settings?.contact_email as string) || '',
    contact_phone: (tenant.settings?.contact_phone as string) || '',
    address: (tenant.settings?.address as string) || '',
    currency: (tenant.settings?.currency as string) || 'USD',
    timezone: (tenant.settings?.timezone as string) || 'UTC',
    logo_url: (tenant.settings?.logo_url as string) || '',
    favicon_url: (tenant.settings?.favicon_url as string) || '',
    primary_color: (tenant.settings?.primary_color as string) || '#111111',
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const { slug, ...settingsData } = formData;

      // Validate settings (excluding slug)
      const validatedSettings = updateTenantSettingsSchema.safeParse(settingsData);
      if (!validatedSettings.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validatedSettings.error.issues) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      // Update settings
      const settingsResponse = await fetch(`/api/tenants/${tenant.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedSettings.data),
      });

      if (!settingsResponse.ok) {
        const result = await settingsResponse.json();
        toast.error(result.error || 'Failed to save settings');
        setIsSubmitting(false);
        return;
      }

      // Update slug if changed
      if (slug !== tenant.slug) {
        const slugValidated = updateTenantSlugSchema.safeParse({ slug });
        if (!slugValidated.success) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of slugValidated.error.issues) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
          setErrors(fieldErrors);
          setIsSubmitting(false);
          return;
        }

        const slugResponse = await fetch(`/api/tenants/${tenant.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: slugValidated.data.slug }),
        });

        if (!slugResponse.ok) {
          const result = await slugResponse.json();
          toast.error(result.error || 'Failed to update store URL');
          setIsSubmitting(false);
          return;
        }
      }

      toast.success('Settings saved successfully!');
      onSaved?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Store Identity */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Store identity</h3>

        <div className="space-y-2.5">
          <Label htmlFor="name" className="text-sm font-semibold">
            Store name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
          />
          {errors.name && (
            <p className="text-sm font-medium text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="slug" className="text-sm font-semibold">
            Store URL slug
          </Label>
          <Input
            id="slug"
            name="slug"
            type="text"
            value={formData.slug}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="my-store"
          />
          <p className="text-xs text-muted-foreground">
            Used in your store URL. Changes may affect existing links.
          </p>
          {errors.slug && (
            <p className="text-sm font-medium text-destructive">{errors.slug}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2.5">
        <Label htmlFor="description" className="text-sm font-semibold">
          Store description
        </Label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={isSubmitting}
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell customers about your store"
        />
        {errors.description && (
          <p className="text-sm font-medium text-destructive">
            {errors.description}
          </p>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Contact information</h3>

        <div className="space-y-2.5">
          <Label htmlFor="contact_email" className="text-sm font-semibold">
            Email
          </Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="contact@example.com"
          />
          {errors.contact_email && (
            <p className="text-sm font-medium text-destructive">
              {errors.contact_email}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="contact_phone" className="text-sm font-semibold">
            Phone
          </Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="+1 (555) 000-0000"
          />
          {errors.contact_phone && (
            <p className="text-sm font-medium text-destructive">
              {errors.contact_phone}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="address" className="text-sm font-semibold">
            Address
          </Label>
          <Input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="123 Main Street, City, State"
          />
          {errors.address && (
            <p className="text-sm font-medium text-destructive">
              {errors.address}
            </p>
          )}
        </div>
      </div>

      {/* Business Settings */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Business settings</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <Label htmlFor="currency" className="text-sm font-semibold">
              Currency
            </Label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
            {errors.currency && (
              <p className="text-sm font-medium text-destructive">
                {errors.currency}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="timezone" className="text-sm font-semibold">
              Timezone
            </Label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="Europe/London">UK</option>
              <option value="Europe/Paris">Central Europe</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
            {errors.timezone && (
              <p className="text-sm font-medium text-destructive">
                {errors.timezone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Media</h3>

        <div className="space-y-2.5">
          <Label htmlFor="logo_url" className="text-sm font-semibold">
            Logo URL
          </Label>
          <Input
            id="logo_url"
            name="logo_url"
            type="url"
            value={formData.logo_url}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="https://example.com/logo.png"
          />
          {errors.logo_url && (
            <p className="text-sm font-medium text-destructive">
              {errors.logo_url}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="favicon_url" className="text-sm font-semibold">
            Favicon URL
          </Label>
          <Input
            id="favicon_url"
            name="favicon_url"
            type="url"
            value={formData.favicon_url}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="https://example.com/favicon.ico"
          />
          {errors.favicon_url && (
            <p className="text-sm font-medium text-destructive">
              {errors.favicon_url}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="primary_color" className="text-sm font-semibold">
            Primary Brand Color
          </Label>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-16 rounded-lg border border-border shadow-sm"
              style={{ backgroundColor: formData.primary_color }}
            />
            <Input
              id="primary_color"
              name="primary_color"
              type="text"
              value={formData.primary_color}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 px-4 text-base font-mono text-sm"
              placeholder="#111111"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for CTA buttons, links, and accent elements on your storefront.
          </p>
          {errors.primary_color && (
            <p className="text-sm font-medium text-destructive">
              {errors.primary_color}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6">
        <Button type="submit" disabled={isSubmitting} className="h-11">
          {isSubmitting ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
