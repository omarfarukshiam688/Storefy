alter table public.orders
  add column if not exists customer_email text;

alter table public.orders
  add column if not exists payment_status text;

alter table public.orders
  alter column payment_status set default 'pending';

update public.orders
  set payment_status = coalesce(payment_status, 'pending')
  where payment_status is null;

alter table public.orders
  alter column payment_status set not null;

alter table public.orders
  add column if not exists confirmed_at timestamptz;

alter table public.orders
  add column if not exists processing_at timestamptz;

alter table public.orders
  add column if not exists shipped_at timestamptz;

alter table public.orders
  add column if not exists delivered_at timestamptz;

alter table public.orders
  add column if not exists cancelled_at timestamptz;

alter table public.orders
  drop constraint if exists orders_order_status_check;

alter table public.orders
  add constraint orders_order_status_check
    check (order_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
    check (payment_status in ('pending', 'paid', 'failed', 'refunded'));

create unique index if not exists idx_orders_tenant_order_number
  on public.orders (tenant_id, order_number);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

drop policy if exists "Tenant admins can manage their orders" on public.orders;
drop policy if exists "Tenant staff can view orders" on public.orders;

create policy "Tenant members can view their orders"
  on public.orders for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = orders.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
    )
  );

create policy "Tenant admins can manage their orders"
  on public.orders for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = orders.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
        and tenant_members.role = 'tenant_admin'
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = orders.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
        and tenant_members.role = 'tenant_admin'
    )
  );

drop policy if exists "Tenant admins can manage their order items" on public.order_items;
drop policy if exists "Tenant staff can view order items" on public.order_items;

create policy "Tenant members can view their order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = order_items.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
    )
  );

create policy "Tenant admins can manage their order items"
  on public.order_items for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = order_items.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
        and tenant_members.role = 'tenant_admin'
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = order_items.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
        and tenant_members.role = 'tenant_admin'
    )
  );
