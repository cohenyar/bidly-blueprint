/**
 * In-app notification hooks. RLS restricts reads/updates to the signed-in user.
 * Realtime is not required for MVP; we poll on window focus + a light interval.
 */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType =
  Database["public"]["Enums"]["notification_type"];

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  const q = useNotifications();
  return (q.data ?? []).filter((n) => !n.read_at).length;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userRes.user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Subscribe to realtime inserts so unread badge updates promptly. */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const channel = supabase
        .channel(`notif-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => qc.invalidateQueries({ queryKey: ["notifications"] }),
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    });
    return () => {
      cancelled = true;
    };
  }, [qc]);
}
