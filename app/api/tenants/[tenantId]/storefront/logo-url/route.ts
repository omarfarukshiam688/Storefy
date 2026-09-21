import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { getStoreAssetSignedUrl } from '@/lib/storage';
import { handleAuthError } from '@/lib/auth/errors';

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
