import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AppRole } from "@/lib/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const activeUserId = useRef<string | null>(null);
  const roleLoadedForUser = useRef<string | null>(null);
  const roleLookupVersion = useRef(0);

  useEffect(() => {
    function applySession(nextSession: Session | null, deferRoleLookup: boolean) {
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId) {
        queryClient.clear();
        activeUserId.current = nextUserId;
        roleLoadedForUser.current = null;
      }

      const lookupVersion = ++roleLookupVersion.current;
      setSession(nextSession);

      if (!nextSession) {
        setRole(null);
        setLoading(false);
        return;
      }

      if (roleLoadedForUser.current === nextUserId) return;

      setRole(null);
      setLoading(true);
      const loadRole = () => {
        void fetchRole(nextSession.user.id)
          .then((nextRole) => {
            if (roleLookupVersion.current !== lookupVersion) return;
            roleLoadedForUser.current = nextSession.user.id;
            setRole(nextRole);
            setLoading(false);
          })
          .catch(() => {
            if (roleLookupVersion.current !== lookupVersion) return;
            setRole(null);
            setLoading(false);
          });
      };

      if (deferRoleLookup) setTimeout(loadRole, 0);
      else loadRole();
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer role fetch to avoid deadlocks inside the Supabase auth callback.
      applySession(nextSession, true);
    });

    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session, false);
    });

    return () => {
      roleLookupVersion.current += 1;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  async function signOut() {
    queryClient.clear();
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

async function fetchRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const roles = data.map((row) => row.role as AppRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("supplier")) return "supplier";
  return "customer";
}
