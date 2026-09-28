import { createClient } from '@/lib/supabase/server';
import type { Announcement } from '@/types';

export interface AnnouncementFilters {
  is_published?: boolean;
  sort_by?: 'created_at' | 'published_at';
  sort_order?: 'asc' | 'desc';
}

export async function listAnnouncements(filters: AnnouncementFilters = {}): Promise<Announcement[]> {
  const supabase = await createClient();

  let query = supabase
    .from('announcements')
    .select('id, title, content, is_published, published_at, created_at, updated_at');

  if (filters.is_published !== undefined) {
    query = query.eq('is_published', filters.is_published);
  }

  const sortBy = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }

  return (data ?? []) as Announcement[];
}

export async function getAnnouncement(id: string): Promise<Announcement> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, is_published, published_at, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Announcement not found');
  }

  return data as Announcement;
}

export async function createAnnouncement(input: {
  title: string;
  content: string;
  is_published: boolean;
}): Promise<Announcement> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    content: input.content.trim(),
    is_published: input.is_published,
  };

  if (input.is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select('id, title, content, is_published, published_at, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create announcement');
  }

  return data as Announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete announcement: ${error.message}`);
  }
}
