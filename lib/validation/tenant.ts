import { z } from 'zod';

// Slug validation: lowercase, alphanumeric, hyphens allowed
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugMinLength = 3;
const slugMaxLength = 63;

export const createTenantSchema = z.object({
  name: z
    .string()
    .min(1, 'Store name is required')
    .max(255, 'Store name is too long'),
  slug: z
    .string()
    .min(slugMinLength, `Slug must be at least ${slugMinLength} characters`)
    .max(slugMaxLength, `Slug must be at most ${slugMaxLength} characters`)
    .regex(
      slugRegex,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .refine((slug) => !['admin', 'api', 'www', 'mail', 'ftp'].includes(slug), {
      message: 'This slug is reserved',
    }),
  plan_id: z.string().uuid('Invalid plan ID'),
});

export const updateTenantSettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Store name is required')
    .max(255, 'Store name is too long')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description is too long')
    .nullable()
    .optional(),
  contact_email: z
    .string()
    .email('Invalid email address')
    .nullable()
    .optional(),
  contact_phone: z
    .string()
    .max(20, 'Phone number is too long')
    .nullable()
    .optional(),
  address: z.string().max(500, 'Address is too long').nullable().optional(),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters (e.g., USD)')
    .toUpperCase()
    .optional(),
  timezone: z
    .string()
    .refine((tz) => {
      // Basic timezone validation - common timezones
      const validTimezones = [
        'UTC',
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
        'America/Denver',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Hong_Kong',
        'Asia/Singapore',
        'Asia/Dubai',
        'Australia/Sydney',
        'Australia/Melbourne',
        'Pacific/Auckland',
      ];
      return validTimezones.includes(tz);
    }, 'Invalid timezone')
    .optional(),
  logo_url: z.string().url('Invalid logo URL').nullable().optional(),
  favicon_url: z.string().url('Invalid favicon URL').nullable().optional(),
});

export const updateTenantSlugSchema = z.object({
  slug: z
    .string()
    .min(slugMinLength, `Slug must be at least ${slugMinLength} characters`)
    .max(slugMaxLength, `Slug must be at most ${slugMaxLength} characters`)
    .regex(
      slugRegex,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .refine((slug) => !['admin', 'api', 'www', 'mail', 'ftp'].includes(slug), {
      message: 'This slug is reserved',
    }),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantSettingsInput = z.infer<
  typeof updateTenantSettingsSchema
>;
export type UpdateTenantSlugInput = z.infer<typeof updateTenantSlugSchema>;
