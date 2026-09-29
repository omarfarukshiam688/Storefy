create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient_user_id on public.notifications(recipient_user_id);
create index idx_notifications_tenant_id on public.notifications(tenant_id);
create index idx_notifications_recipient_created on public.notifications(recipient_user_id, created_at desc);
create index idx_notifications_unread on public.notifications(recipient_user_id, read_at) where read_at is null;

alter table public.notifications enable row level security;

create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());

create policy "Users can update their own notifications"
  on public.notifications for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
