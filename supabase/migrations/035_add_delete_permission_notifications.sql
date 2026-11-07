-- Grant DELETE permission on notifications to authenticated users
grant delete on public.notifications to authenticated;

-- RLS policy: users can delete only their own notifications
create policy "Users can delete their own notifications"
  on public.notifications for delete to authenticated
  using (recipient_user_id = auth.uid());
