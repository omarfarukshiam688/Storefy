import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { listStorefrontSections, updateStorefrontSection, reorderStorefrontSections, ensureDefaultSections } from '@/lib/storefront/config';
import type { StorefrontSectionKey } from '@/types';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    await requireTenantAdmin(tenantId);

    await ensureDefaultSections(tenantId);

    const sections = await listStorefrontSections(tenantId);

    return NextResponse.json({ sections });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Storefront sections fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch storefront sections' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    await requireTenantAdmin(tenantId);

    const body = await req.json();

    if (body.sections && Array.isArray(body.sections)) {
      const sectionKeys: StorefrontSectionKey[] = [];
      for (const item of body.sections) {
        const { section_key, is_enabled, config, display_order } = item as {
          section_key: StorefrontSectionKey;
          is_enabled: boolean;
          config?: Record<string, unknown>;
          display_order?: number;
        };

        if (!section_key) continue;

        sectionKeys.push(section_key);

        const updates: Record<string, unknown> = {
          is_enabled: is_enabled ?? true,
        };

        if (typeof display_order === 'number') {
          updates.display_order = display_order;
        }

        if (config !== undefined) {
          updates.config = config;
        }

        await updateStorefrontSection(tenantId, section_key, updates);
      }

      await reorderStorefrontSections(tenantId, sectionKeys);

      const sections = await listStorefrontSections(tenantId);
      return NextResponse.json({ sections });
    }

    if (body.section_key && body.config !== undefined) {
      const section = await updateStorefrontSection(tenantId, body.section_key, {
        config: body.config,
        is_enabled: body.is_enabled,
      });
      return NextResponse.json({ section });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Storefront sections update error:', error);
    return NextResponse.json({ error: 'Failed to update storefront sections' }, { status: 500 });
  }
}
