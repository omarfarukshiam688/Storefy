import { createClient } from '@/lib/supabase/server';
import type { TenantStorefrontSection, StorefrontSectionKey } from '@/types';

const DEFAULT_SECTIONS: Omit<TenantStorefrontSection, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [
  {
    section_key: 'hero',
    is_enabled: true,
    display_order: 0,
    config: {
      heading: '',
      subheading: '',
      cta_label: 'Explore Products',
      cta_destination: './products',
      image_path: null,
    },
  },
  {
    section_key: 'categories',
    is_enabled: true,
    display_order: 1,
    config: {
      heading: 'Categories',
      description: '',
    },
  },
  {
    section_key: 'featured_products',
    is_enabled: true,
    display_order: 2,
    config: {
      heading: 'Featured Products',
      description: '',
    },
  },
  {
    section_key: 'why_choose_us',
    is_enabled: true,
    display_order: 3,
    config: {
      heading: 'Why Choose Us',
      description: '',
      benefits: [
        { icon: 'CheckCircle', title: '', description: '' },
        { icon: 'ShieldCheck', title: '', description: '' },
        { icon: 'Truck', title: '', description: '' },
      ],
    },
  },
  {
    section_key: 'about_us',
    is_enabled: true,
    display_order: 4,
    config: {
      heading: 'About Us',
      description: '',
      image_path: null,
    },
  },
  {
    section_key: 'reviews',
    is_enabled: false,
    display_order: 5,
    config: {
      heading: 'Reviews',
      description: '',
    },
  },
  {
    section_key: 'contact',
    is_enabled: true,
    display_order: 6,
    config: {
      heading: 'Contact',
      description: '',
    },
  },
  {
    section_key: 'footer',
    is_enabled: true,
    display_order: 7,
    config: {
      description: '',
    },
  },
];

export function getDefaultSectionOrder(): StorefrontSectionKey[] {
  return DEFAULT_SECTIONS.map((s) => s.section_key);
}

export function getDefaultSectionConfig(sectionKey: StorefrontSectionKey): Record<string, unknown> {
  const section = DEFAULT_SECTIONS.find((s) => s.section_key === sectionKey);
  return section ? section.config : {};
}

export async function ensureDefaultSections(tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('tenant_storefront_sections')
    .select('section_key')
    .eq('tenant_id', tenantId);

  const existingKeys = new Set((existing ?? []).map((s) => s.section_key));

  const toInsert = DEFAULT_SECTIONS.filter((s) => !existingKeys.has(s.section_key));

  if (toInsert.length === 0) return;

  const rows = toInsert.map((s) => ({
    tenant_id: tenantId,
    section_key: s.section_key,
    is_enabled: s.is_enabled,
    display_order: s.display_order,
    config: s.config,
  }));

  const { error } = await supabase
    .from('tenant_storefront_sections')
    .insert(rows);

  if (error) {
    throw new Error(`Failed to seed storefront sections: ${error.message}`);
  }
}

export async function listStorefrontSections(tenantId: string): Promise<TenantStorefrontSection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenant_storefront_sections')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch storefront sections: ${error.message}`);
  }

  return (data ?? []) as TenantStorefrontSection[];
}

export async function updateStorefrontSection(
  tenantId: string,
  sectionKey: StorefrontSectionKey,
  updates: { is_enabled?: boolean; display_order?: number; config?: Record<string, unknown> }
): Promise<TenantStorefrontSection> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenant_storefront_sections')
    .update(updates)
    .eq('tenant_id', tenantId)
    .eq('section_key', sectionKey)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update storefront section: ${error?.message ?? 'Unknown error'}`);
  }

  return data as TenantStorefrontSection;
}

export async function reorderStorefrontSections(
  tenantId: string,
  sectionKeys: StorefrontSectionKey[]
): Promise<TenantStorefrontSection[]> {
  const supabase = await createClient();

  const updates = sectionKeys.map((key, index) => ({
    tenant_id: tenantId,
    section_key: key,
    display_order: index,
  }));

  // Upsert each section order
  for (const update of updates) {
    const { error } = await supabase
      .from('tenant_storefront_sections')
      .update({ display_order: update.display_order })
      .eq('tenant_id', tenantId)
      .eq('section_key', update.section_key);

    if (error) {
      throw new Error(`Failed to reorder sections: ${error.message}`);
    }
  }

  return listStorefrontSections(tenantId);
}
