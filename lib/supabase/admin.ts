import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a pure service-role Supabase client with NO cookie/session binding.
 * This client always uses the service role key, bypassing RLS entirely.
 *
 * WARNING: Never expose this client to the browser or use it for tenant-scoped
 * operations without explicit tenant boundary checks. Service-role access must
 * always be coupled with application-level authorization.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
