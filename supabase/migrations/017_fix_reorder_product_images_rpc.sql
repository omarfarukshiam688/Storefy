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
    select unnest(p_image_ids) as id
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
