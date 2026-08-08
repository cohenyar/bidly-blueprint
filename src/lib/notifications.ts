/**
 * In-app notification hooks. RLS restricts reads/updates to the signed-in user.
 * Realtime is not required for MVP; we poll on window focus + a light interval.
 */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];

const NOTIFICATION_COPY: Record<NotificationType, { title: string; description: string }> = {
  offer_received: {
    title: "התקבלה הצעה חדשה",
    description: "נותן שירות שלח הצעה לבקשה שלך",
  },
  request_awarded: {
    title: "הצעה נבחרה",
    description: "בחירת ההצעה לבקשה שלך נשמרה בהצלחה",
  },
  request_cancelled: {
    title: "הבקשה בוטלה",
    description: "הבקשה שלך בוטלה",
  },
  request_closed: {
    title: "הבקשה נסגרה",
    description: "הבקשה שלך נסגרה",
  },
  match_created: {
    title: "בקשה חדשה מתאימה לך",
    description: "נמצאה בקשה שמתאימה לפרופיל שלך",
  },
  offer_selected: {
    title: "ההצעה שלך נבחרה",
    description: "הלקוח בחר בהצעה שלך",
  },
  offer_rejected: {
    title: "ההצעה שלך לא נבחרה",
    description: "הלקוח בחר בהצעה אחרת",
  },
  offer_withdrawn: {
    title: "הצעה נמשכה",
    description: "נותן השירות משך את ההצעה שלו",
  },
};

export function getNotificationPresentation(notification: NotificationRow) {
  const copy = NOTIFICATION_COPY[notification.type];
  return {
    title: copy.title,
    description: notification.body?.trim() || copy.description,
  };
}

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

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
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
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      channel = supabase
        .channel(`notif-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          (payload) => {
            void qc.invalidateQueries({ queryKey: ["notifications"] });
            const notification = payload.new as Partial<NotificationRow>;
            if (notification.type === "match_created") {
              void qc.invalidateQueries({
                queryKey: ["supplier-matched-requests", "active"],
              });
            }
            if (notification.type === "offer_received" && notification.request_id) {
              void qc.invalidateQueries({
                queryKey: ["customer-request-offers", notification.request_id],
              });
              void qc.invalidateQueries({
                queryKey: ["request", notification.request_id],
              });
            }
          },
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [qc]);
}
