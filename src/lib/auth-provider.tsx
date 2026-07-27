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
  const activeUserId = useRef<string | null | undefined>(undefined);
  const roleLoadedForUser = useRef<string | null>(null);
  const roleLookupVersion = useRef(0);
  const roleLookupsByUser = useRef(new Map<string, Promise<AppRole | null>>());
  const roleLookup = useRef<{
    userId: string;
    version: number;
    promise: Promise<AppRole | null>;
  } | null>(null);

  useEffect(() => {
    let disposed = false;
    let receivedAuthEvent = false;
    const deferredTimers = new Set<ReturnType<typeof setTimeout>>();

    function loadRole(userId: string, version: number) {
      const currentLookup = roleLookup.current;
      if (currentLookup?.userId === userId && currentLookup.version === version) return;

      let promise = roleLookupsByUser.current.get(userId);
      if (!promise) {
        promise = fetchRole(userId);
        roleLookupsByUser.current.set(userId, promise);
        const clearSettledLookup = () => {
          if (roleLookupsByUser.current.get(userId) === promise) {
            roleLookupsByUser.current.delete(userId);
          }
        };
        void promise.then(clearSettledLookup, clearSettledLookup);
      }

      const lookup = {
        userId,
        version,
        promise,
      };
      roleLookup.current = lookup;

      void lookup.promise
        .then((nextRole) => {
          if (
            disposed ||
            roleLookupVersion.current !== version ||
            activeUserId.current !== userId ||
            roleLookup.current !== lookup
          ) {
            return;
          }
          roleLoadedForUser.current = userId;
          setRole(nextRole);
        })
        .catch(() => {
          if (
            disposed ||
            roleLookupVersion.current !== version ||
            activeUserId.current !== userId ||
            roleLookup.current !== lookup
          ) {
            return;
          }
          roleLoadedForUser.current = userId;
          setRole(null);
        })
        .finally(() => {
          if (roleLookup.current === lookup) roleLookup.current = null;
          if (
            disposed ||
            roleLookupVersion.current !== version ||
            activeUserId.current !== userId
          ) {
            return;
          }
          setLoading(false);
        });
    }

    function applySession(nextSession: Session | null) {
      if (disposed) return;

      const nextUserId = nextSession?.user.id ?? null;
      const previousUserId = activeUserId.current;
      setSession(nextSession);

      if (previousUserId === nextUserId) {
        if (
          nextUserId &&
          roleLoadedForUser.current !== nextUserId &&
          roleLookup.current?.userId !== nextUserId
        ) {
          setLoading(true);
          loadRole(nextUserId, roleLookupVersion.current);
        }
        return;
      }

      if (previousUserId === undefined && nextUserId === null) {
        activeUserId.current = null;
        setRole(null);
        setLoading(false);
        return;
      }

      const wasInitialized = previousUserId !== undefined;
      const version = ++roleLookupVersion.current;
      activeUserId.current = nextUserId;
      roleLoadedForUser.current = null;
      roleLookup.current = null;

      if (wasInitialized || nextUserId !== null) {
        queryClient.clear();
      }

      if (!nextSession) {
        setRole(null);
        setLoading(false);
        return;
      }

      setRole(null);
      setLoading(true);
      loadRole(nextSession.user.id, version);
    }

    function deferSession(nextSession: Session | null) {
      const timer = setTimeout(() => {
        deferredTimers.delete(timer);
        applySession(nextSession);
      }, 0);
      deferredTimers.add(timer);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      // Defer role fetch to avoid deadlocks inside the Supabase auth callback.
      deferSession(nextSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!receivedAuthEvent) applySession(data.session);
      })
      .catch(() => {
        if (!disposed && !receivedAuthEvent && activeUserId.current === undefined) {
          applySession(null);
        }
      });

    return () => {
      disposed = true;
      roleLookupVersion.current += 1;
      roleLookup.current = null;
      for (const timer of deferredTimers) clearTimeout(timer);
      deferredTimers.clear();
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  async function signOut() {
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
