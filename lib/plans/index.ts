import { createClient } from '@/lib/supabase/server';
import type { Plan } from '@/types';

export async function getTenantPlan(tenantId: string): Promise<Plan | null> {
  const supabase = await createClient();

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan_id')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return null;
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', tenant.plan_id)
    .single();

  if (planError || !plan) {
    return null;
  }

  return plan as Plan;
}
