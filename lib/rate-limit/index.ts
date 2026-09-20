import { createClient } from '@/lib/supabase/server';
import type { RateLimitLog } from '@/types';

export interface RateLimitResult {
  allowed: boolean;
  resetAt: number;
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  tenantId: string | null,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('created_at', windowStart);

  if (error) {
    return { allowed: true, resetAt: Date.now() + windowSeconds * 1000 };
  }

  const attempts = count ?? 0;
  const allowed = attempts < maxRequests;

  return {
    allowed,
    resetAt: Date.now() + windowSeconds * 1000,
  };
}

export async function recordRateLimit(
  identifier: string,
  action: string,
  tenantId: string | null
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rate_limit_log')
    .insert({
      identifier,
      action,
      tenant_id: tenantId,
    });

  if (error) {
    console.error('Failed to record rate limit:', error);
  }
}

export async function getRateLimitLogs(
  tenantId: string,
  action?: string,
  limit = 100
): Promise<RateLimitLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from('rate_limit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (action) {
    query = query.eq('action', action);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch rate limit logs: ${error.message}`);
  }

  return (data ?? []) as RateLimitLog[];
}
