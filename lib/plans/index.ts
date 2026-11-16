import { createClient } from '@/lib/supabase/server';
import type { Plan } from '@/types';

export async function getTenantPlan(tenantId: string): Promise<Plan | null> {
  const supabase = await createClient();

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('plan_id, plan:plans!plan_id(*)')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trialing', 'past_due', 'suspended', 'canceled', 'expired'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  let planData: Plan | null = null;

  if (subError) {
    return null;
  }

  if (!subscription) {
    // Fallback to tenant plan_id for legacy/trial tenants without subscription
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan_id, plan:plans!plan_id(*)')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant || !tenant.plan || tenant.plan.length === 0) {
      return null;
    }

    planData = tenant.plan[0] as Plan;
  } else if (!subscription.plan || subscription.plan.length === 0) {
    return null;
  } else {
    planData = subscription.plan[0] as Plan;
  }

  return planData;
}
