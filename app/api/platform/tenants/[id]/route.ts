import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { PRODUCT_IMAGES_BUCKET, STORE_ASSETS_BUCKET } from '@/lib/storage';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id: tenantId } = await params;

    const body = await req.json().catch(() => ({}));
    const confirmedName = typeof body.confirmedName === 'string' ? body.confirmedName.trim() : '';

    const supabase = await createClient();

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (tenant.name !== confirmedName) {
      return NextResponse.json({ error: 'Tenant name does not match' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();

    const [membershipsResult, productImagesResult, storeAssetsResult] = await Promise.all([
      serviceSupabase.from('tenant_members').select('user_id').eq('tenant_id', tenantId),
      serviceSupabase.from('product_images').select('storage_path').eq('tenant_id', tenantId),
      serviceSupabase.from('store_assets').select('storage_path').eq('tenant_id', tenantId),
    ]);

    if (membershipsResult.error) {
      console.error('Failed to fetch tenant members for deletion:', membershipsResult.error);
    }

    const memberUserIds = [...new Set((membershipsResult.data ?? []).map((m) => m.user_id).filter(Boolean))];

    const productImagePaths = (productImagesResult.data ?? []).map((r) => r.storage_path).filter(Boolean);
    const storeAssetPaths = (storeAssetsResult.data ?? []).map((r) => r.storage_path).filter(Boolean);

    let authUsersDeleted = 0;
    const authUserErrors: string[] = [];

    if (memberUserIds.length > 0) {
      const superAdminRows = await serviceSupabase
        .from('super_admins')
        .select('user_id')
        .in('user_id', memberUserIds);

      const superAdminIds = new Set((superAdminRows.data ?? []).map((r) => r.user_id));

      const otherMembershipRows = await serviceSupabase
        .from('tenant_members')
        .select('user_id')
        .in('user_id', memberUserIds)
        .neq('tenant_id', tenantId);

      const multiTenantUserIds = new Set((otherMembershipRows.data ?? []).map((r) => r.user_id));

      const eligibleForDeletion = memberUserIds.filter((userId) => {
        if (superAdminIds.has(userId)) return false;
        if (multiTenantUserIds.has(userId)) return false;
        return true;
      });

      for (const userId of eligibleForDeletion) {
        const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(userId);
        if (deleteError) {
          authUserErrors.push(`Failed to delete auth user ${userId}: ${deleteError.message}`);
        } else {
          authUsersDeleted++;
        }
      }
    }

    const storageErrors: string[] = [];

    if (productImagePaths.length > 0) {
      const { error: productImageDeleteError } = await serviceSupabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove(productImagePaths);

      if (productImageDeleteError) {
        storageErrors.push(`product-images: ${productImageDeleteError.message}`);
      }
    }

    if (storeAssetPaths.length > 0) {
      const { error: storeAssetDeleteError } = await serviceSupabase.storage
        .from(STORE_ASSETS_BUCKET)
        .remove(storeAssetPaths);

      if (storeAssetDeleteError) {
        storageErrors.push(`store-assets: ${storeAssetDeleteError.message}`);
      }
    }

    const { error: deleteTenantError } = await serviceSupabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (deleteTenantError) {
      console.error('Failed to delete tenant:', deleteTenantError);
      return NextResponse.json({ error: `Failed to delete tenant: ${deleteTenantError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedTenant: tenant.name,
      authUsersDeleted,
      authUserErrors,
      storageErrors,
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
