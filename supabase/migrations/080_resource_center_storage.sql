-- Resource Center Storage: Dedicated bucket and RLS policies
-- This migration creates a dedicated storage bucket for Resource Center assets
-- and configures appropriate RLS policies for public read and Super Admin write access.

-- Create the dedicated storage bucket for Resource Center assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-center-assets',
  'resource-center-assets',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Enable RLS on storage.objects for this bucket (if not already enabled globally)
-- Note: storage.objects already has RLS enabled by default in Supabase

-- Policy: Public can read published Resource Center assets
-- This allows anyone to view images for published content
create policy "Public can read published Resource Center assets"
  on storage.objects for select
  using (
    bucket_id = 'resource-center-assets'
  );

-- Policy: Super Admins can upload Resource Center assets
create policy "Super admins can upload Resource Center assets"
  on storage.objects for insert
  with check (
    bucket_id = 'resource-center-assets'
    and public.is_super_admin()
  );

-- Policy: Super Admins can update Resource Center assets
create policy "Super admins can update Resource Center assets"
  on storage.objects for update
  using (
    bucket_id = 'resource-center-assets'
    and public.is_super_admin()
  )
  with check (
    bucket_id = 'resource-center-assets'
    and public.is_super_admin()
  );

-- Policy: Super Admins can delete Resource Center assets
create policy "Super admins can delete Resource Center assets"
  on storage.objects for delete
  using (
    bucket_id = 'resource-center-assets'
    and public.is_super_admin()
  );

-- Grant necessary permissions
grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;
grant all on storage.objects to service_role;