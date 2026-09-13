import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware responsibilities (to be implemented in future modules):
 *
 * 1. Tenant resolution:
 *    - Subdomain: tenant.storefy.com
 *    - Path: /store/[tenant]
 *
 * 2. Authentication:
 *    - Refresh Supabase auth session cookies
 *    - Protect admin/platform routes
 *
 * 3. Authorization:
 *    - Validate tenant membership for tenant-scoped routes
 *    - Validate super_admin access for platform routes
 *
 * 4. Rate limiting:
 *    - Apply rate limits per tenant/identifier for sensitive routes
 *
 * Current state: placeholder that refreshes auth sessions.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  // Future: tenant resolution and membership checks will go here

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
