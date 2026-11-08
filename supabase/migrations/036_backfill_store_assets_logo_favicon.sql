-- Migration 036: Backfill missing store_assets records for pre-existing logo/favicon uploads
--
-- Root cause: Commit 581ff11 (Sep 19, 2026) introduced logo/favicon upload routes that
-- updated tenants.settings but never inserted into store_assets. The store_assets table
-- and createStoreAssetRecord() were added later in commit 3cc64a2 (Sep 22, 2026) without
-- a backfill migration. Tenants whose logos/favicons were uploaded before 3cc64a2 have
-- valid paths in tenants.settings but zero rows in store_assets, causing the signed URL
-- ownership lookup to fail with "Asset not found".
--
-- This migration restores the missing ownership records for the affected tenant using
-- exact verified storage metadata. It is safe against duplicate execution and will not
-- overwrite or alter existing records.

-- Logo: tenant/9504e22d-8175-434a-8e20-dcc20e1970d4/branding/8f1c8795-3bfa-44c4-a9f0-e0184514b853.png
-- Favicon: tenant/9504e22d-8175-434a-8e20-dcc20e1970d4/branding/favicon/e77b67ca-0d4d-4ece-a372-8daa6b0375de.png

DO $$
DECLARE
  v_tenant_id uuid := '9504e22d-8175-434a-8e20-dcc20e1970d4';
  v_logo_path text := 'tenant/9504e22d-8175-434a-8e20-dcc20e1970d4/branding/8f1c8795-3bfa-44c4-a9f0-e0184514b853.png';
  v_favicon_path text := 'tenant/9504e22d-8175-434a-8e20-dcc20e1970d4/branding/favicon/e77b67ca-0d4d-4ece-a372-8daa6b0375de.png';
  v_logo_size bigint := 120636;
  v_favicon_size bigint := 120636;
  v_mime_type text := 'image/png';
  v_logo_filename text := 'logo.png';
  v_favicon_filename text := 'favicon.png';
  v_logo_created timestamptz := '2026-09-18 13:05:04.086096+00';
  v_favicon_created timestamptz := '2026-09-18 13:28:19.990406+00';
  v_existing_count integer;
BEGIN
  -- ── Logo ────────────────────────────────────────────────────────────────

  -- Check if a record already exists for this tenant + asset_type
  SELECT count(*) INTO v_existing_count
  FROM public.store_assets
  WHERE tenant_id = v_tenant_id
    AND asset_type = 'logo';

  IF v_existing_count > 0 THEN
    -- If the existing record already has the exact same path, it is a no-op
    IF EXISTS (
      SELECT 1 FROM public.store_assets
      WHERE tenant_id = v_tenant_id
        AND asset_type = 'logo'
        AND storage_path = v_logo_path
    ) THEN
      RAISE NOTICE 'Logo record already exists with matching path — skipping.';
    ELSE
      -- A different path exists for this tenant+asset_type. Do NOT overwrite.
      RAISE EXCEPTION
        'Cannot backfill logo: tenant % already has a different logo record (storage_path=%). Preserve existing data.',
        v_tenant_id,
        (SELECT storage_path FROM public.store_assets WHERE tenant_id = v_tenant_id AND asset_type = 'logo');
    END IF;
  ELSE
    -- No existing record — safe to insert
    INSERT INTO public.store_assets (
      tenant_id, storage_path, asset_type, file_size, mime_type, original_filename, created_at, updated_at
    ) VALUES (
      v_tenant_id, v_logo_path, 'logo', v_logo_size, v_mime_type, v_logo_filename, v_logo_created, v_logo_created
    );
    RAISE NOTICE 'Logo record backfilled for tenant %.', v_tenant_id;
  END IF;

  -- ── Favicon ──────────────────────────────────────────────────────────────

  SELECT count(*) INTO v_existing_count
  FROM public.store_assets
  WHERE tenant_id = v_tenant_id
    AND asset_type = 'favicon';

  IF v_existing_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.store_assets
      WHERE tenant_id = v_tenant_id
        AND asset_type = 'favicon'
        AND storage_path = v_favicon_path
    ) THEN
      RAISE NOTICE 'Favicon record already exists with matching path — skipping.';
    ELSE
      RAISE EXCEPTION
        'Cannot backfill favicon: tenant % already has a different favicon record (storage_path=%). Preserve existing data.',
        v_tenant_id,
        (SELECT storage_path FROM public.store_assets WHERE tenant_id = v_tenant_id AND asset_type = 'favicon');
    END IF;
  ELSE
    INSERT INTO public.store_assets (
      tenant_id, storage_path, asset_type, file_size, mime_type, original_filename, created_at, updated_at
    ) VALUES (
      v_tenant_id, v_favicon_path, 'favicon', v_favicon_size, v_mime_type, v_favicon_filename, v_favicon_created, v_favicon_created
    );
    RAISE NOTICE 'Favicon record backfilled for tenant %.', v_tenant_id;
  END IF;
END;
$$;