grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;
