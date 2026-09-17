"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface UseAuthResult {
  user: import("@supabase/supabase-js").User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const router = useRouter();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (error) setError(error);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error);
      throw error;
    }

    router.push("/");
    router.refresh();
  }

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    error,
    signOut,
  };
}
