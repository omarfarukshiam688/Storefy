grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
