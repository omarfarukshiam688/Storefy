import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { getStoreAssetSignedUrl } from '@/lib/storage';
import { createServiceClient } from '@/lib/supabase/admin';
import { handleAuthError } from '@/lib/auth/errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateLogoPath(tenantId: string, path: string): boolean {
  const prefix = `tenant/${tenantId}/branding/`;
  if (!path.startsWith(prefix)) {
    return false;
  }
  // Logo paths: tenant/{tenantId}/branding/{assetId}.{ext}
  // Must NOT contain '/favicon/' segment
  if (path.includes('/favicon/')) {
    return false;
  }
  const remainder = path.slice(prefix.length);
  const parts = remainder.split('.');
  if (parts.length < 2) {
    return false;
  }
  const assetId = parts.slice(0, -1).join('.');
  return UUID_REGEX.test(assetId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    await requireTenantAdmin(tenantId);

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (!validateLogoPath(tenantId, path)) {
      return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: asset, error: assetError } = await supabase
      .from('store_assets')
      .select('storage_path')
      .eq('tenant_id', tenantId)
      .eq('storage_path', path)
      .maybeSingle();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const signedUrl = await getStoreAssetSignedUrl(path, 3600);
    if (!signedUrl) {
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({ signed_url: signedUrl });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Logo URL resolve error:', error);
    return NextResponse.json({ error: 'Failed to resolve logo URL' }, { status: 500 });
  }
}
