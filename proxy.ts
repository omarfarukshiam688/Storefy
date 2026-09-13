import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
const PROTECTED_ROUTES = ["/admin", "/platform", "/dashboard"];

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (user && AUTH_ROUTES.some((route) => path.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user && PROTECTED_ROUTES.some((route) => path.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
