-- Ensure products have unique (tenant_id, id) for composite FK
alter table public.products add constraint products_tenant_id_id_unique unique (tenant_id, id);

-- Product images table
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  display_order integer not null default 0 check (display_order >= 0),
  alt_text text,
  is_primary boolean not null default false,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  width integer,
  height integer,
  original_filename text not null check (btrim(original_filename) <> '' and length(original_filename) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_tenant_product_fkey foreign key (tenant_id, product_id) references public.products (tenant_id, id) on delete cascade
);

create index idx_product_images_tenant_product on public.product_images (tenant_id, product_id);
create index idx_product_images_display_order on public.product_images (tenant_id, product_id, display_order);
create unique index product_images_one_primary_per_product on public.product_images (tenant_id, product_id) where is_primary;

drop trigger if exists set_product_images_updated_at on public.product_images;
create trigger set_product_images_updated_at before update on public.product_images for each row execute function public.set_updated_at();

alter table public.product_images enable row level security;

create policy "Tenant members can read their product images"
  on public.product_images for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "Tenant members can insert their product images"
  on public.product_images for insert to authenticated
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can update their product images"
  on public.product_images for update to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can delete their product images"
  on public.product_images for delete to authenticated
  using (public.is_tenant_member(tenant_id));

grant select, insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-assets', 'store-assets', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage helper function to extract tenant UUID from object name
create or replace function public.storage_tenant_id(p_name text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (substring(p_name from '^tenant/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'))::uuid;
$$;

revoke execute on function public.storage_tenant_id(text) from public;
grant execute on function public.storage_tenant_id(text) to authenticated, service_role;

-- Storage RLS policies for product-images bucket
create policy "Tenant members can read product images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'products'
    and (storage.foldername(name))[5] = 'images'
    and public.is_tenant_member(public.storage_tenant_id(name))
  );

create policy "Tenant members can insert product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'products'
    and (storage.foldername(name))[5] = 'images'
    and public.is_tenant_member(public.storage_tenant_id(name))
  );

create policy "Tenant members can update product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'products'
    and (storage.foldername(name))[5] = 'images'
    and public.is_tenant_member(public.storage_tenant_id(name))
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'products'
    and (storage.foldername(name))[5] = 'images'
    and public.is_tenant_member(public.storage_tenant_id(name))
  );

create policy "Tenant members can delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'products'
    and (storage.foldername(name))[5] = 'images'
    and public.is_tenant_member(public.storage_tenant_id(name))
  );

-- Storage RLS policies for store-assets bucket (tenant admins only)
create policy "Tenant admins can read store assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'branding'
    and public.is_tenant_admin(public.storage_tenant_id(name))
  );

create policy "Tenant admins can insert store assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'branding'
    and public.is_tenant_admin(public.storage_tenant_id(name))
  );

create policy "Tenant admins can update store assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'branding'
    and public.is_tenant_admin(public.storage_tenant_id(name))
  )
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'branding'
    and public.is_tenant_admin(public.storage_tenant_id(name))
  );

create policy "Tenant admins can delete store assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[3] = 'branding'
    and public.is_tenant_admin(public.storage_tenant_id(name))
  );

-- RPC functions for atomic primary image and reorder operations
create or replace function public.set_product_image_primary(p_product_id uuid, p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select tenant_id into v_tenant_id from public.products where id = p_product_id;
  if not found or not public.is_tenant_member(v_tenant_id) then
    raise exception 'Forbidden';
  end if;

  if not exists (
    select 1 from public.product_images
    where tenant_id = v_tenant_id and product_id = p_product_id and id = p_image_id
  ) then
    raise exception 'Product image not found';
  end if;

  update public.product_images
  set is_primary = false
  where tenant_id = v_tenant_id and product_id = p_product_id;

  update public.product_images
  set is_primary = true
  where id = p_image_id;
end;
$$;

revoke execute on function public.set_product_image_primary(uuid, uuid) from public;
grant execute on function public.set_product_image_primary(uuid, uuid) to authenticated, service_role;

create or replace function public.reorder_product_images(p_product_id uuid, p_image_ids uuid[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant_id uuid;
  v_count int;
  v_distinct int;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select tenant_id into v_tenant_id from public.products where id = p_product_id;
  if not found or not public.is_tenant_member(v_tenant_id) then
    raise exception 'Forbidden';
  end if;

  if p_image_ids is null then
    raise exception 'Image IDs array is required';
  end if;

  v_count := coalesce(array_length(p_image_ids, 1), 0);
  if v_count = 0 or v_count > 8 then
    raise exception 'Invalid number of images';
  end if;

  select count(*) into v_distinct from unnest(p_image_ids) as id;
  if v_distinct <> v_count then
    raise exception 'Duplicate image IDs';
  end if;

  if exists (
    select 1 from unnest(p_image_ids) as id
    except
    select id from public.product_images where tenant_id = v_tenant_id and product_id = p_product_id
  ) then
    raise exception 'One or more image IDs do not belong to this product';
  end if;

  with ordered as (
    select id, pos
    from unnest(p_image_ids) with ordinality as ordered(id, pos)
  )
  update public.product_images pi
  set display_order = ordered.pos - 1
  from ordered
  where pi.tenant_id = v_tenant_id
    and pi.product_id = p_product_id
    and pi.id = ordered.id;
end;
$$;

revoke execute on function public.reorder_product_images(uuid, uuid[]) from public;
grant execute on function public.reorder_product_images(uuid, uuid[]) to authenticated, service_role;

