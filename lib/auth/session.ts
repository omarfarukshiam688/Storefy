import { createClient } from "@/lib/supabase/server";
import { AuthError } from "./errors";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new AuthError(error.message);
  }

  return session;
}

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("Unauthorized");
  }

  return user;
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new AuthError("Unauthorized");
  }

  return session;
}

export async function requireAuthUser() {
  const user = await getAuthUser();
  return user;
}
